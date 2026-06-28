"""
Virtual try-on helpers and Runpod integration.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import io
import json
import logging
import time
import uuid
from typing import Any, Optional

import httpx
from sqlalchemy.orm import Session

from app.ai_service import ai_service, compress_image, load_image_from_path_or_url
from app.config import settings
from app.core.storage import public_file_url, save_user_scoped_file
from app.core.utils import get_user_folder_name, parse_json_safe
from app.models import (
    DressType,
    Recommendation,
    TryOnRender,
    User,
    UserImage,
    UserProfile,
    WardrobeImage,
    WardrobeItem,
)

VALID_TRYON_CATEGORIES = {"tops", "bottoms", "one-pieces"}
VALID_GARMENT_PHOTO_TYPES = {"model", "flat-lay"}
logger = logging.getLogger("dripdirective.tryon")

ONE_PIECE_TYPES = {
    DressType.DRESS,
    DressType.SUIT,
}
BOTTOM_TYPES = {
    DressType.PANTS,
    DressType.JEANS,
    DressType.SHORTS,
    DressType.SKIRT,
}


class TryOnServiceError(Exception):
    """Domain error with an HTTP-friendly status code."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _normalize_garment_photo_type(value: Optional[str]) -> str:
    normalized = (value or settings.RUNPOD_TRYON_GARMENT_PHOTO_TYPE or "flat-lay").strip().lower()
    if normalized not in VALID_GARMENT_PHOTO_TYPES:
        raise TryOnServiceError(
            "garment_photo_type must be one of: model, flat-lay",
            status_code=400,
        )
    return normalized


def _category_from_text(value: Optional[str]) -> Optional[str]:
    if not value:
        return None

    text = str(value).strip().lower().replace("_", " ").replace("-", " ")

    one_piece_keywords = (
        "dress",
        "one piece",
        "onepiece",
        "jumpsuit",
        "romper",
        "gown",
        "overall",
        "suit set",
        "coord set",
    )
    bottom_keywords = (
        "bottom",
        "pant",
        "pants",
        "jean",
        "jeans",
        "trouser",
        "skirt",
        "short",
        "shorts",
        "leggings",
    )
    top_keywords = (
        "top",
        "shirt",
        "t shirt",
        "tee",
        "blouse",
        "jacket",
        "coat",
        "blazer",
        "sweater",
        "hoodie",
        "kurta",
        "sweatshirt",
    )

    if any(keyword in text for keyword in one_piece_keywords):
        return "one-pieces"
    if any(keyword in text for keyword in bottom_keywords):
        return "bottoms"
    if any(keyword in text for keyword in top_keywords):
        return "tops"
    return None


def infer_tryon_category(
    wardrobe_item: WardrobeItem,
    item_metadata: Optional[dict[str, Any]] = None,
    requested_category: Optional[str] = None,
) -> str:
    """Resolve FASHN category for a wardrobe item."""
    if requested_category:
        normalized = requested_category.strip().lower()
        if normalized not in VALID_TRYON_CATEGORIES:
            raise TryOnServiceError(
                "category must be one of: tops, bottoms, one-pieces",
                status_code=400,
            )
        return normalized

    if wardrobe_item.dress_type in ONE_PIECE_TYPES:
        return "one-pieces"
    if wardrobe_item.dress_type in BOTTOM_TYPES:
        return "bottoms"
    if wardrobe_item.dress_type is not None:
        return "tops"

    analysis = item_metadata or {}
    if "clothing_analysis" in analysis and isinstance(analysis.get("clothing_analysis"), dict):
        analysis = analysis.get("clothing_analysis", {})

    candidates = [
        analysis.get("category"),
        analysis.get("garment_type"),
        analysis.get("garmentType"),
        analysis.get("description"),
        analysis.get("summary_text"),
    ]

    for candidate in candidates:
        category = _category_from_text(candidate)
        if category:
            return category

    raise TryOnServiceError(
        "Could not infer try-on category for this garment. Please send category as tops, bottoms, or one-pieces.",
        status_code=400,
    )


async def _load_and_encode_image(path_or_url: str, *, max_dimension: int) -> str:
    image = await load_image_from_path_or_url(path_or_url)
    if image is None:
        raise TryOnServiceError("Try-on source image could not be loaded.", status_code=400)

    image = image.convert("RGB")
    image = compress_image(image, max_size=max_dimension)

    output = io.BytesIO()
    image.save(output, format="JPEG", quality=88, optimize=True)
    return base64.b64encode(output.getvalue()).decode("utf-8")


def _get_selected_user_image(
    db: Session,
    *,
    user_id: int,
    requested_user_image_id: Optional[int] = None,
) -> UserImage:
    if requested_user_image_id is not None:
        image = (
            db.query(UserImage)
            .filter(UserImage.id == requested_user_image_id, UserImage.user_id == user_id)
            .first()
        )
        if not image:
            raise TryOnServiceError("Selected user image was not found.", status_code=404)
        return image

    image = (
        db.query(UserImage)
        .filter(UserImage.user_id == user_id)
        .order_by(UserImage.id.desc())
        .first()
    )
    if not image:
        raise TryOnServiceError(
            "No user image available for try-on. Please upload at least one photo first.",
            status_code=400,
        )
    return image


def _get_original_wardrobe_image(
    db: Session,
    *,
    wardrobe_item_id: int,
) -> Optional[WardrobeImage]:
    image = (
        db.query(WardrobeImage)
        .filter(WardrobeImage.wardrobe_item_id == wardrobe_item_id, WardrobeImage.is_original == True)
        .order_by(WardrobeImage.id.asc())
        .first()
    )
    if image:
        return image

    return (
        db.query(WardrobeImage)
        .filter(WardrobeImage.wardrobe_item_id == wardrobe_item_id)
        .order_by(WardrobeImage.id.asc())
        .first()
    )


def _load_user_profile_context(db: Session, *, user_id: int) -> dict[str, Any]:
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not user_profile or not user_profile.additional_info:
        return {}

    profile_info = parse_json_safe(user_profile.additional_info)
    return profile_info.get("ai_profile_analysis", {})


def _build_outfit_wardrobe_items(
    db: Session,
    *,
    user_id: int,
    wardrobe_item_ids: list[int],
) -> list[dict[str, Any]]:
    wardrobe_items: list[dict[str, Any]] = []

    for item_id in wardrobe_item_ids:
        item = (
            db.query(WardrobeItem)
            .filter(WardrobeItem.id == item_id, WardrobeItem.user_id == user_id)
            .first()
        )
        if not item:
            continue

        item_image = _get_original_wardrobe_image(db, wardrobe_item_id=item.id)
        wardrobe_items.append(
            {
                "id": item.id,
                "image_path": item_image.image_path if item_image else None,
                "metadata": parse_json_safe(item.ai_metadata),
            }
        )

    return wardrobe_items


def _select_recommendation_garment(
    db: Session,
    *,
    user_id: int,
    wardrobe_item_ids: list[int],
    requested_wardrobe_item_id: Optional[int],
    requested_category: Optional[str],
) -> tuple[WardrobeItem, WardrobeImage, str]:
    if requested_wardrobe_item_id is not None and requested_wardrobe_item_id not in wardrobe_item_ids:
        raise TryOnServiceError(
            "Selected wardrobe item is not part of the requested outfit.",
            status_code=400,
        )

    candidates: list[tuple[int, WardrobeItem, WardrobeImage, str]] = []

    for index, item_id in enumerate(wardrobe_item_ids):
        item = (
            db.query(WardrobeItem)
            .filter(WardrobeItem.id == item_id, WardrobeItem.user_id == user_id)
            .first()
        )
        if not item:
            continue

        image = _get_original_wardrobe_image(db, wardrobe_item_id=item.id)
        if not image:
            continue

        item_metadata = parse_json_safe(item.ai_metadata)
        try:
            category = infer_tryon_category(
                item,
                item_metadata=item_metadata,
                requested_category=requested_category if requested_wardrobe_item_id == item.id else None,
            )
        except TryOnServiceError:
            category = None

        if requested_wardrobe_item_id == item.id:
            if not category:
                category = infer_tryon_category(item, item_metadata=item_metadata, requested_category=requested_category)
            return item, image, category

        candidates.append((index, item, image, category or ""))

    if not candidates:
        raise TryOnServiceError(
            "No wardrobe image is available for the selected outfit.",
            status_code=400,
        )

    priority = {"one-pieces": 0, "tops": 1, "bottoms": 2, "": 3}
    candidates.sort(key=lambda entry: (priority.get(entry[3], 4), entry[0]))

    _, selected_item, selected_image, selected_category = candidates[0]
    if not selected_category:
        selected_category = infer_tryon_category(
            selected_item,
            item_metadata=parse_json_safe(selected_item.ai_metadata),
            requested_category=requested_category,
        )
    return selected_item, selected_image, selected_category


async def _save_tryon_image(
    *,
    user: User,
    image_bytes: bytes,
    mime_type: str,
    filename_prefix: str,
) -> tuple[str, str]:
    extension = ".png" if "png" in (mime_type or "").lower() else ".jpg"
    filename = f"{filename_prefix}_{uuid.uuid4().hex}{extension}"

    stored_path = await save_user_scoped_file(
        base_dir=settings.TRYON_IMAGES_DIR,
        user_email=user.email,
        content=image_bytes,
        filename=filename,
        target_filename=filename,
        user_id=user.id,
    )
    return stored_path, public_file_url(stored_path)


def _decode_generated_image(image_base64: str) -> bytes:
    try:
        return base64.b64decode(image_base64)
    except Exception as exc:
        raise TryOnServiceError(f"Could not decode try-on image output: {exc}", status_code=502) from exc


def _build_tryon_cache_key(
    *,
    user_id: int,
    user_image_id: int,
    wardrobe_item_id: int,
    category: str,
    garment_photo_type: str,
) -> str:
    payload = {
        "cache_version": 1,
        "provider": (settings.VIRTUAL_TRYON_PROVIDER or "").strip().lower(),
        "user_id": int(user_id),
        "user_image_id": int(user_image_id),
        "wardrobe_item_id": int(wardrobe_item_id),
        "category": category,
        "garment_photo_type": garment_photo_type,
        "max_image_dimension": int(settings.RUNPOD_TRYON_MAX_IMAGE_DIMENSION),
        "num_timesteps": int(settings.RUNPOD_TRYON_NUM_TIMESTEPS),
        "guidance_scale": float(settings.RUNPOD_TRYON_GUIDANCE_SCALE),
        "num_samples": int(settings.RUNPOD_TRYON_NUM_SAMPLES),
        "segmentation_free": bool(settings.RUNPOD_TRYON_SEGMENTATION_FREE),
    }
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _cached_tryon_response(render: TryOnRender) -> dict[str, Any]:
    return {
        "image_path": public_file_url(render.image_path),
        "stored_image_path": render.image_path,
        "outfit_index": None,
        "user_image_id": render.user_image_id,
        "wardrobe_item_id": render.wardrobe_item_id,
        "category": render.category,
        "garment_photo_type": render.garment_photo_type,
        "provider": render.provider,
        "from_cache": True,
    }


def _get_cached_tryon_render(
    db: Session,
    *,
    user_id: int,
    user_image_id: int,
    wardrobe_item_id: int,
    category: str,
    garment_photo_type: str,
) -> Optional[TryOnRender]:
    cache_key = _build_tryon_cache_key(
        user_id=user_id,
        user_image_id=user_image_id,
        wardrobe_item_id=wardrobe_item_id,
        category=category,
        garment_photo_type=garment_photo_type,
    )
    return (
        db.query(TryOnRender)
        .filter(TryOnRender.user_id == user_id, TryOnRender.cache_key == cache_key)
        .order_by(TryOnRender.id.desc())
        .first()
    )


def _upsert_tryon_render(
    db: Session,
    *,
    user_id: int,
    user_image_id: int,
    wardrobe_item_id: int,
    category: str,
    garment_photo_type: str,
    image_path: str,
    provider: Optional[str],
) -> TryOnRender:
    cache_key = _build_tryon_cache_key(
        user_id=user_id,
        user_image_id=user_image_id,
        wardrobe_item_id=wardrobe_item_id,
        category=category,
        garment_photo_type=garment_photo_type,
    )
    render = (
        db.query(TryOnRender)
        .filter(TryOnRender.user_id == user_id, TryOnRender.cache_key == cache_key)
        .first()
    )
    if render is None:
        render = TryOnRender(
            user_id=user_id,
            user_image_id=user_image_id,
            wardrobe_item_id=wardrobe_item_id,
            cache_key=cache_key,
        )
        db.add(render)

    render.category = category
    render.garment_photo_type = garment_photo_type
    render.provider = provider
    render.image_path = image_path
    db.commit()
    db.refresh(render)
    return render


class RunpodTryOnClient:
    """Thin async client for a dedicated Runpod Serverless endpoint."""

    @property
    def is_configured(self) -> bool:
        return (
            (settings.VIRTUAL_TRYON_PROVIDER or "").strip().lower() == "runpod"
            and bool(settings.RUNPOD_API_KEY)
            and bool(settings.RUNPOD_TRYON_ENDPOINT_ID)
        )

    def _headers(self, trace_id: Optional[str] = None) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {settings.RUNPOD_API_KEY}",
            "Content-Type": "application/json",
        }
        if trace_id:
            headers["X-Drip-Trace-Id"] = trace_id
        return headers

    def _endpoint_base(self) -> str:
        return f"{settings.RUNPOD_API_BASE_URL.rstrip('/')}/{settings.RUNPOD_TRYON_ENDPOINT_ID}"

    async def _submit_job(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=settings.RUNPOD_TRYON_HTTP_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{self._endpoint_base()}/run",
                headers=self._headers(),
                json=payload,
            )

        if response.status_code >= 400:
            raise TryOnServiceError(
                f"Runpod request failed with {response.status_code}: {response.text[:500]}",
                status_code=502,
            )

        data = response.json()
        if data.get("status") == "COMPLETED" and data.get("output") is not None:
            return data

        job_id = data.get("id")
        if not job_id:
            raise TryOnServiceError("Runpod did not return a job ID.", status_code=502)

        return await self._poll_job(job_id)

    async def _poll_job(self, job_id: str) -> dict[str, Any]:
        deadline = time.monotonic() + float(settings.RUNPOD_TRYON_TIMEOUT_SECONDS)
        last_status = "IN_QUEUE"

        async with httpx.AsyncClient(timeout=settings.RUNPOD_TRYON_HTTP_TIMEOUT_SECONDS) as client:
            while time.monotonic() < deadline:
                response = await client.get(
                    f"{self._endpoint_base()}/status/{job_id}",
                    headers=self._headers(),
                )

                if response.status_code >= 400:
                    raise TryOnServiceError(
                        f"Runpod status check failed with {response.status_code}: {response.text[:500]}",
                        status_code=502,
                    )

                data = response.json()
                status = data.get("status") or last_status
                last_status = status

                if status == "COMPLETED":
                    return data

                if status in {"FAILED", "TIMED_OUT", "CANCELLED"}:
                    output = data.get("output") if isinstance(data.get("output"), dict) else {}
                    error_message = output.get("error") or data.get("error") or f"Runpod job ended with status {status}."
                    raise TryOnServiceError(str(error_message), status_code=502)

                await asyncio.sleep(max(0.5, settings.RUNPOD_TRYON_POLL_INTERVAL_MS / 1000.0))

        raise TryOnServiceError(
            f"Timed out waiting for Runpod try-on completion (last status: {last_status}).",
            status_code=504,
        )

    async def generate_tryon(
        self,
        *,
        person_image_path: str,
        garment_image_path: str,
        category: str,
        garment_photo_type: str,
        trace_id: Optional[str] = None,
    ) -> dict[str, Any]:
        if not self.is_configured:
            raise TryOnServiceError(
                "Runpod virtual try-on is not configured. Set VIRTUAL_TRYON_PROVIDER=runpod plus RUNPOD_API_KEY and RUNPOD_TRYON_ENDPOINT_ID.",
                status_code=503,
            )

        if category not in VALID_TRYON_CATEGORIES:
            raise TryOnServiceError(
                "category must be one of: tops, bottoms, one-pieces",
                status_code=400,
            )

        person_image_base64 = await _load_and_encode_image(
            person_image_path,
            max_dimension=settings.RUNPOD_TRYON_MAX_IMAGE_DIMENSION,
        )
        garment_image_base64 = await _load_and_encode_image(
            garment_image_path,
            max_dimension=settings.RUNPOD_TRYON_MAX_IMAGE_DIMENSION,
        )

        payload = {
            "input": {
                "person_image_base64": person_image_base64,
                "garment_image_base64": garment_image_base64,
                "category": category,
                "garment_photo_type": garment_photo_type,
                "num_samples": settings.RUNPOD_TRYON_NUM_SAMPLES,
                "num_timesteps": settings.RUNPOD_TRYON_NUM_TIMESTEPS,
                "guidance_scale": settings.RUNPOD_TRYON_GUIDANCE_SCALE,
                "segmentation_free": settings.RUNPOD_TRYON_SEGMENTATION_FREE,
            },
            "policy": {
                "executionTimeout": int(settings.RUNPOD_TRYON_EXECUTION_TIMEOUT_SECONDS * 1000),
                "ttl": int(settings.RUNPOD_TRYON_TTL_SECONDS * 1000),
            },
        }

        data = await self._submit_job(payload)
        output = data.get("output")
        if not isinstance(output, dict):
            raise TryOnServiceError("Runpod returned an invalid job output payload.", status_code=502)

        image_base64 = output.get("image_base64")
        if not image_base64:
            raise TryOnServiceError(
                output.get("error") or "Runpod worker did not return image_base64.",
                status_code=502,
            )

        return {
            "image_bytes": _decode_generated_image(image_base64),
            "mime_type": output.get("mime_type") or "image/png",
            "provider": output.get("provider") or "runpod/fashn-vton-1.5",
            "raw_output": output,
        }


runpod_tryon_client = RunpodTryOnClient()


class RunpodPodTryOnClient:
    """Async client for a dedicated Runpod Pod that exposes a plain HTTP API."""

    @property
    def is_configured(self) -> bool:
        return (
            (settings.VIRTUAL_TRYON_PROVIDER or "").strip().lower() == "runpod_pod"
            and bool(settings.RUNPOD_POD_API_URL)
        )

    def _headers(self, trace_id: Optional[str] = None) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if settings.RUNPOD_POD_API_TOKEN:
            headers["Authorization"] = f"Bearer {settings.RUNPOD_POD_API_TOKEN}"
        if trace_id:
            headers["X-Drip-Trace-Id"] = trace_id
        return headers

    def _endpoint_url(self) -> str:
        return f"{settings.RUNPOD_POD_API_URL.rstrip('/')}/tryon"

    async def generate_tryon(
        self,
        *,
        person_image_path: str,
        garment_image_path: str,
        category: str,
        garment_photo_type: str,
        trace_id: Optional[str] = None,
    ) -> dict[str, Any]:
        if not self.is_configured:
            raise TryOnServiceError(
                "Runpod pod virtual try-on is not configured. Set VIRTUAL_TRYON_PROVIDER=runpod_pod and RUNPOD_POD_API_URL.",
                status_code=503,
            )

        if category not in VALID_TRYON_CATEGORIES:
            raise TryOnServiceError(
                "category must be one of: tops, bottoms, one-pieces",
                status_code=400,
            )

        person_image_base64 = await _load_and_encode_image(
            person_image_path,
            max_dimension=settings.RUNPOD_TRYON_MAX_IMAGE_DIMENSION,
        )
        garment_image_base64 = await _load_and_encode_image(
            garment_image_path,
            max_dimension=settings.RUNPOD_TRYON_MAX_IMAGE_DIMENSION,
        )

        payload = {
            "person_image_base64": person_image_base64,
            "garment_image_base64": garment_image_base64,
            "category": category,
            "garment_photo_type": garment_photo_type,
            "num_samples": settings.RUNPOD_TRYON_NUM_SAMPLES,
            "num_timesteps": settings.RUNPOD_TRYON_NUM_TIMESTEPS,
            "guidance_scale": settings.RUNPOD_TRYON_GUIDANCE_SCALE,
            "segmentation_free": settings.RUNPOD_TRYON_SEGMENTATION_FREE,
        }

        logger.info(
            "[trace=%s] Pod try-on request start category=%s garment_photo_type=%s endpoint=%s",
            trace_id or "-",
            category,
            garment_photo_type,
            self._endpoint_url(),
        )
        try:
            async with httpx.AsyncClient(timeout=settings.RUNPOD_POD_HTTP_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    self._endpoint_url(),
                    headers=self._headers(trace_id),
                    json=payload,
                )
        except httpx.HTTPError as exc:
            logger.warning("[trace=%s] Pod try-on request error: %s", trace_id or "-", exc)
            raise TryOnServiceError(f"Runpod pod request failed: {exc}", status_code=502) from exc

        if response.status_code >= 400:
            error_message = response.text[:500]
            try:
                payload = response.json()
            except ValueError:
                payload = None
            if isinstance(payload, dict) and payload.get("detail"):
                error_message = str(payload["detail"])[:500]
            logger.warning(
                "[trace=%s] Pod try-on request failed status=%s detail=%s",
                trace_id or "-",
                response.status_code,
                error_message,
            )
            raise TryOnServiceError(
                f"Runpod pod request failed with {response.status_code}: {error_message}",
                status_code=502,
            )

        try:
            output = response.json()
        except ValueError as exc:
            raise TryOnServiceError("Runpod pod returned invalid JSON.", status_code=502) from exc

        if not isinstance(output, dict):
            raise TryOnServiceError("Runpod pod returned an invalid response payload.", status_code=502)

        image_base64 = output.get("image_base64")
        if not image_base64:
            raise TryOnServiceError(
                str(output.get("error") or output.get("detail") or "Runpod pod did not return image_base64."),
                status_code=502,
            )

        logger.info(
            "[trace=%s] Pod try-on request completed provider=%s elapsed_seconds=%s",
            trace_id or "-",
            output.get("provider") or "runpod-pod/fashn-vton-1.5",
            output.get("elapsed_seconds"),
        )

        return {
            "image_bytes": _decode_generated_image(image_base64),
            "mime_type": output.get("mime_type") or "image/png",
            "provider": output.get("provider") or "runpod-pod/fashn-vton-1.5",
            "raw_output": output,
        }


runpod_pod_tryon_client = RunpodPodTryOnClient()


def get_remote_tryon_client():
    if runpod_tryon_client.is_configured:
        return runpod_tryon_client
    if runpod_pod_tryon_client.is_configured:
        return runpod_pod_tryon_client
    return None


def _persist_recommendation_tryon_metadata(
    db: Session,
    *,
    recommendation: Recommendation,
    metadata: dict[str, Any],
    outfits: list[dict[str, Any]],
    outfit_index: int,
    stored_image_path: str,
    selected_user_image: UserImage,
    selected_item: WardrobeItem,
    resolved_category: str,
    normalized_photo_type: str,
) -> None:
    outfit = outfits[outfit_index]
    outfit["tryon_image_path"] = stored_image_path
    outfit["tryon_user_image_id"] = selected_user_image.id
    outfit["tryon_wardrobe_item_id"] = selected_item.id
    outfit["tryon_category"] = resolved_category
    outfit["tryon_garment_photo_type"] = normalized_photo_type
    metadata["recommended_outfits"] = outfits
    recommendation.ai_metadata = json.dumps(metadata)
    db.add(recommendation)
    db.commit()


def get_cached_recommendation_tryon(
    db: Session,
    *,
    current_user: User,
    recommendation: Recommendation,
    outfit_index: int,
    user_image_id: Optional[int] = None,
    wardrobe_item_id: Optional[int] = None,
    category: Optional[str] = None,
    garment_photo_type: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    metadata = parse_json_safe(recommendation.ai_metadata)
    outfits = metadata.get("recommended_outfits", [])

    if outfit_index < 0 or outfit_index >= len(outfits):
        raise TryOnServiceError("Invalid outfit index.", status_code=400)

    selected_user_image = _get_selected_user_image(
        db,
        user_id=current_user.id,
        requested_user_image_id=user_image_id,
    )
    selected_item, _, resolved_category = _select_recommendation_garment(
        db,
        user_id=current_user.id,
        wardrobe_item_ids=outfits[outfit_index].get("wardrobe_item_ids", []),
        requested_wardrobe_item_id=wardrobe_item_id,
        requested_category=category,
    )
    normalized_photo_type = _normalize_garment_photo_type(garment_photo_type)

    cached_render = _get_cached_tryon_render(
        db,
        user_id=current_user.id,
        user_image_id=selected_user_image.id,
        wardrobe_item_id=selected_item.id,
        category=resolved_category,
        garment_photo_type=normalized_photo_type,
    )
    if cached_render is None:
        return None

    _persist_recommendation_tryon_metadata(
        db,
        recommendation=recommendation,
        metadata=metadata,
        outfits=outfits,
        outfit_index=outfit_index,
        stored_image_path=cached_render.image_path,
        selected_user_image=selected_user_image,
        selected_item=selected_item,
        resolved_category=resolved_category,
        normalized_photo_type=normalized_photo_type,
    )

    cached_result = _cached_tryon_response(cached_render)
    cached_result["outfit_index"] = outfit_index
    return cached_result


def get_cached_wardrobe_item_tryon(
    db: Session,
    *,
    current_user: User,
    wardrobe_item_id: int,
    user_image_id: Optional[int] = None,
    category: Optional[str] = None,
    garment_photo_type: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    wardrobe_item = (
        db.query(WardrobeItem)
        .filter(WardrobeItem.id == wardrobe_item_id, WardrobeItem.user_id == current_user.id)
        .first()
    )
    if not wardrobe_item:
        raise TryOnServiceError("Wardrobe item not found.", status_code=404)

    selected_user_image = _get_selected_user_image(
        db,
        user_id=current_user.id,
        requested_user_image_id=user_image_id,
    )
    item_metadata = parse_json_safe(wardrobe_item.ai_metadata)
    resolved_category = infer_tryon_category(
        wardrobe_item,
        item_metadata=item_metadata,
        requested_category=category,
    )
    normalized_photo_type = _normalize_garment_photo_type(garment_photo_type)

    cached_render = _get_cached_tryon_render(
        db,
        user_id=current_user.id,
        user_image_id=selected_user_image.id,
        wardrobe_item_id=wardrobe_item.id,
        category=resolved_category,
        garment_photo_type=normalized_photo_type,
    )
    return _cached_tryon_response(cached_render) if cached_render is not None else None


async def _generate_legacy_recommendation_tryon(
    *,
    db: Session,
    user_id: int,
    user_image_path: str,
    outfit_index: int,
    outfit: dict[str, Any],
) -> dict[str, Any]:
    user_profile = _load_user_profile_context(db, user_id=user_id)
    wardrobe_items = _build_outfit_wardrobe_items(
        db,
        user_id=user_id,
        wardrobe_item_ids=outfit.get("wardrobe_item_ids", []),
    )

    tryon_result = await ai_service.generate_virtual_tryon(
        user_image_path=user_image_path,
        outfit_description=outfit.get("items_description", ""),
        outfit_name=outfit.get("outfit_name", f"Outfit {outfit_index + 1}"),
        user_profile=user_profile,
        wardrobe_items=wardrobe_items,
    )

    image_path = tryon_result.get("image_path")
    if not image_path:
        raise TryOnServiceError(
            tryon_result.get("error") or "Legacy try-on generation failed.",
            status_code=502,
        )

    return {
        "stored_image_path": image_path,
        "public_image_path": public_file_url(image_path),
        "user_image_id": None,
        "wardrobe_item_id": None,
        "category": None,
        "garment_photo_type": None,
        "provider": tryon_result.get("model_used") or "legacy",
    }


async def generate_recommendation_tryon(
    db: Session,
    *,
    current_user: User,
    recommendation: Recommendation,
    outfit_index: int,
    user_image_id: Optional[int] = None,
    wardrobe_item_id: Optional[int] = None,
    category: Optional[str] = None,
    garment_photo_type: Optional[str] = None,
    trace_id: Optional[str] = None,
) -> dict[str, Any]:
    metadata = parse_json_safe(recommendation.ai_metadata)
    outfits = metadata.get("recommended_outfits", [])

    if outfit_index < 0 or outfit_index >= len(outfits):
        raise TryOnServiceError("Invalid outfit index.", status_code=400)

    outfit = outfits[outfit_index]
    selected_user_image = _get_selected_user_image(
        db,
        user_id=current_user.id,
        requested_user_image_id=user_image_id,
    )

    normalized_photo_type = _normalize_garment_photo_type(garment_photo_type)
    selected_item, selected_item_image, resolved_category = _select_recommendation_garment(
        db,
        user_id=current_user.id,
        wardrobe_item_ids=outfit.get("wardrobe_item_ids", []),
        requested_wardrobe_item_id=wardrobe_item_id,
        requested_category=category,
    )

    cached_render = _get_cached_tryon_render(
        db,
        user_id=current_user.id,
        user_image_id=selected_user_image.id,
        wardrobe_item_id=selected_item.id,
        category=resolved_category,
        garment_photo_type=normalized_photo_type,
    )
    if cached_render is not None:
        logger.info(
            "[trace=%s] Recommendation try-on cache hit user_id=%s recommendation_id=%s outfit_index=%s wardrobe_item_id=%s user_image_id=%s",
            trace_id or "-",
            current_user.id,
            recommendation.id,
            outfit_index,
            selected_item.id,
            selected_user_image.id,
        )
        _persist_recommendation_tryon_metadata(
            db,
            recommendation=recommendation,
            metadata=metadata,
            outfits=outfits,
            outfit_index=outfit_index,
            stored_image_path=cached_render.image_path,
            selected_user_image=selected_user_image,
            selected_item=selected_item,
            resolved_category=resolved_category,
            normalized_photo_type=normalized_photo_type,
        )
        cached_result = _cached_tryon_response(cached_render)
        cached_result["outfit_index"] = outfit_index
        return cached_result

    remote_tryon_client = get_remote_tryon_client()
    if remote_tryon_client is not None:
        logger.info(
            "[trace=%s] Recommendation try-on cache miss user_id=%s recommendation_id=%s outfit_index=%s wardrobe_item_id=%s user_image_id=%s",
            trace_id or "-",
            current_user.id,
            recommendation.id,
            outfit_index,
            selected_item.id,
            selected_user_image.id,
        )
        remote_result = await remote_tryon_client.generate_tryon(
            person_image_path=selected_user_image.image_path,
            garment_image_path=selected_item_image.image_path,
            category=resolved_category,
            garment_photo_type=normalized_photo_type,
            trace_id=trace_id,
        )
        stored_image_path, public_image_path = await _save_tryon_image(
            user=current_user,
            image_bytes=remote_result["image_bytes"],
            mime_type=remote_result["mime_type"],
            filename_prefix=f"recommendation_{recommendation.id}_outfit_{outfit_index}",
        )
        _upsert_tryon_render(
            db,
            user_id=current_user.id,
            user_image_id=selected_user_image.id,
            wardrobe_item_id=selected_item.id,
            category=resolved_category,
            garment_photo_type=normalized_photo_type,
            image_path=stored_image_path,
            provider=remote_result["provider"],
        )
        _persist_recommendation_tryon_metadata(
            db,
            recommendation=recommendation,
            metadata=metadata,
            outfits=outfits,
            outfit_index=outfit_index,
            stored_image_path=stored_image_path,
            selected_user_image=selected_user_image,
            selected_item=selected_item,
            resolved_category=resolved_category,
            normalized_photo_type=normalized_photo_type,
        )
        logger.info(
            "[trace=%s] Recommendation try-on saved user_id=%s recommendation_id=%s outfit_index=%s image_path=%s provider=%s",
            trace_id or "-",
            current_user.id,
            recommendation.id,
            outfit_index,
            stored_image_path,
            remote_result["provider"],
        )

        return {
            "image_path": public_image_path,
            "stored_image_path": stored_image_path,
            "outfit_index": outfit_index,
            "user_image_id": selected_user_image.id,
            "wardrobe_item_id": selected_item.id,
            "category": resolved_category,
            "garment_photo_type": normalized_photo_type,
            "provider": remote_result["provider"],
            "from_cache": False,
        }

    legacy_result = await _generate_legacy_recommendation_tryon(
        db=db,
        user_id=current_user.id,
        user_image_path=selected_user_image.image_path,
        outfit_index=outfit_index,
        outfit=outfit,
    )
    outfit["tryon_image_path"] = legacy_result["stored_image_path"]
    outfit["tryon_user_image_id"] = selected_user_image.id
    metadata["recommended_outfits"] = outfits
    recommendation.ai_metadata = json.dumps(metadata)
    db.add(recommendation)
    db.commit()

    legacy_result["outfit_index"] = outfit_index
    legacy_result["user_image_id"] = selected_user_image.id
    legacy_result["image_path"] = legacy_result.pop("public_image_path")
    return legacy_result


def _resolve_user_base_image_path(user: User, base_image_path: str) -> str:
    """Validate that a layering base image belongs to this user's try-on results.

    Accepts the stored relative path (or a full URL the client echoed back) and returns
    the safe relative path to use as the person image. Rejects cross-user access and
    path traversal.
    """
    raw = (base_image_path or "").strip()
    if raw.startswith("http://") or raw.startswith("https://"):
        from urllib.parse import urlparse

        raw = urlparse(raw).path
    normalized = raw.replace("\\", "/").lstrip("/")
    expected_prefix = f"{settings.TRYON_IMAGES_DIR.rstrip('/')}/{get_user_folder_name(user.email)}/"
    if ".." in normalized or not normalized.startswith(expected_prefix):
        raise TryOnServiceError("Invalid base image for layering.", status_code=400)
    return normalized


async def generate_wardrobe_item_tryon(
    db: Session,
    *,
    current_user: User,
    wardrobe_item_id: int,
    user_image_id: Optional[int] = None,
    category: Optional[str] = None,
    garment_photo_type: Optional[str] = None,
    base_image_path: Optional[str] = None,
    trace_id: Optional[str] = None,
) -> dict[str, Any]:
    wardrobe_item = (
        db.query(WardrobeItem)
        .filter(WardrobeItem.id == wardrobe_item_id, WardrobeItem.user_id == current_user.id)
        .first()
    )
    if not wardrobe_item:
        raise TryOnServiceError("Wardrobe item not found.", status_code=404)

    selected_user_image = _get_selected_user_image(
        db,
        user_id=current_user.id,
        requested_user_image_id=user_image_id,
    )
    selected_item_image = _get_original_wardrobe_image(db, wardrobe_item_id=wardrobe_item.id)
    if not selected_item_image:
        raise TryOnServiceError(
            "No wardrobe image is available for this item.",
            status_code=400,
        )

    item_metadata = parse_json_safe(wardrobe_item.ai_metadata)
    resolved_category = infer_tryon_category(
        wardrobe_item,
        item_metadata=item_metadata,
        requested_category=category,
    )
    normalized_photo_type = _normalize_garment_photo_type(garment_photo_type)

    # Layering: wear this garment on top of a previous try-on result instead of the raw photo.
    layered = bool(base_image_path)
    person_image_path = selected_user_image.image_path
    if layered:
        person_image_path = _resolve_user_base_image_path(current_user, base_image_path)

    cached_render = None if layered else _get_cached_tryon_render(
        db,
        user_id=current_user.id,
        user_image_id=selected_user_image.id,
        wardrobe_item_id=wardrobe_item.id,
        category=resolved_category,
        garment_photo_type=normalized_photo_type,
    )
    if cached_render is not None:
        logger.info(
            "[trace=%s] Wardrobe try-on cache hit user_id=%s wardrobe_item_id=%s user_image_id=%s",
            trace_id or "-",
            current_user.id,
            wardrobe_item.id,
            selected_user_image.id,
        )
        return _cached_tryon_response(cached_render)

    remote_tryon_client = get_remote_tryon_client()
    if remote_tryon_client is None:
        raise TryOnServiceError(
            "Virtual try-on is not configured. Direct garment try-on is only available with the Runpod FASHN provider.",
            status_code=503,
        )

    logger.info(
        "[trace=%s] Wardrobe try-on cache miss user_id=%s wardrobe_item_id=%s user_image_id=%s category=%s garment_photo_type=%s",
        trace_id or "-",
        current_user.id,
        wardrobe_item.id,
        selected_user_image.id,
        resolved_category,
        normalized_photo_type,
    )
    remote_result = await remote_tryon_client.generate_tryon(
        person_image_path=person_image_path,
        garment_image_path=selected_item_image.image_path,
        category=resolved_category,
        garment_photo_type=normalized_photo_type,
        trace_id=trace_id,
    )
    stored_image_path, public_image_path = await _save_tryon_image(
        user=current_user,
        image_bytes=remote_result["image_bytes"],
        mime_type=remote_result["mime_type"],
        filename_prefix=f"wardrobe_{wardrobe_item.id}_tryon",
    )
    # Don't cache layered results: they depend on the base image, not just (user_image, item).
    if not layered:
        _upsert_tryon_render(
            db,
            user_id=current_user.id,
            user_image_id=selected_user_image.id,
            wardrobe_item_id=wardrobe_item.id,
            category=resolved_category,
            garment_photo_type=normalized_photo_type,
            image_path=stored_image_path,
            provider=remote_result["provider"],
        )
    logger.info(
        "[trace=%s] Wardrobe try-on saved user_id=%s wardrobe_item_id=%s image_path=%s provider=%s",
        trace_id or "-",
        current_user.id,
        wardrobe_item.id,
        stored_image_path,
        remote_result["provider"],
    )

    return {
        "image_path": public_image_path,
        "stored_image_path": stored_image_path,
        "outfit_index": None,
        "user_image_id": selected_user_image.id,
        "wardrobe_item_id": wardrobe_item.id,
        "category": resolved_category,
        "garment_photo_type": normalized_photo_type,
        "provider": remote_result["provider"],
        "from_cache": False,
    }


async def generate_external_tryon(
    db: Session,
    *,
    current_user: User,
    garment_image_url: str,
    category: str,
    garment_photo_type: str = "model",
    base_image_path: Optional[str] = None,
    trace_id: Optional[str] = None,
) -> dict[str, Any]:
    """Try on a garment from an external image URL (e.g. a Myntra product image).

    Supports layering via base_image_path (a previous result of the same user).
    Not cached — external catalogs change and results depend on the base image.
    """
    if category not in VALID_TRYON_CATEGORIES:
        raise TryOnServiceError("category must be one of: tops, bottoms, one-pieces", status_code=400)
    if not garment_image_url or not garment_image_url.startswith(("http://", "https://")):
        raise TryOnServiceError("A valid garment image URL is required.", status_code=400)

    selected_user_image = _get_selected_user_image(db, user_id=current_user.id, requested_user_image_id=None)
    person_image_path = selected_user_image.image_path
    if base_image_path:
        person_image_path = _resolve_user_base_image_path(current_user, base_image_path)

    normalized_photo_type = _normalize_garment_photo_type(garment_photo_type)
    remote_tryon_client = get_remote_tryon_client()
    if remote_tryon_client is None:
        raise TryOnServiceError(
            "Virtual try-on is not configured. External garment try-on requires the Runpod FASHN provider.",
            status_code=503,
        )

    logger.info(
        "[trace=%s] External try-on user_id=%s category=%s photo_type=%s layered=%s url=%s",
        trace_id or "-", current_user.id, category, normalized_photo_type, bool(base_image_path), garment_image_url[:120],
    )
    remote_result = await remote_tryon_client.generate_tryon(
        person_image_path=person_image_path,
        garment_image_path=garment_image_url,
        category=category,
        garment_photo_type=normalized_photo_type,
        trace_id=trace_id,
    )
    stored_image_path, public_image_path = await _save_tryon_image(
        user=current_user,
        image_bytes=remote_result["image_bytes"],
        mime_type=remote_result["mime_type"],
        filename_prefix="external_tryon",
    )
    return {
        "image_path": public_image_path,
        "stored_image_path": stored_image_path,
        "category": category,
        "garment_photo_type": normalized_photo_type,
        "provider": remote_result["provider"],
        "from_cache": False,
    }
