"""
Dedicated HTTP wrapper for the FASHN VTON pipeline on a long-lived Runpod Pod.
"""
from __future__ import annotations

import base64
import io
import logging
import os
import time
from threading import Lock
from typing import Any, Optional

from fastapi import FastAPI, Header, HTTPException
from PIL import Image, ImageOps
from pydantic import BaseModel, Field, ValidationError, field_validator

from fashn_vton import TryOnPipeline

logger = logging.getLogger("fashn_vton_pod")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

VALID_CATEGORIES = {"tops", "bottoms", "one-pieces"}
VALID_GARMENT_PHOTO_TYPES = {"model", "flat-lay"}
WEIGHTS_DIR = os.getenv("FASHN_WEIGHTS_DIR", "/workspace/fashn-vton-weights")

PIPELINE = None
PIPELINE_LOCK = Lock()

app = FastAPI(title="Drip Directive FASHN VTON Pod API", version="1.0.0")


class TryOnRequest(BaseModel):
    person_image_base64: str = Field(min_length=1)
    garment_image_base64: str = Field(min_length=1)
    category: str
    garment_photo_type: str = "flat-lay"
    num_samples: int = 1
    num_timesteps: int = 30
    guidance_scale: float = 1.5
    segmentation_free: bool = True
    seed: Optional[int] = 42

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        normalized = str(value).strip().lower()
        if normalized not in VALID_CATEGORIES:
            raise ValueError("category must be one of: tops, bottoms, one-pieces")
        return normalized

    @field_validator("garment_photo_type")
    @classmethod
    def validate_garment_photo_type(cls, value: str) -> str:
        normalized = str(value).strip().lower()
        if normalized not in VALID_GARMENT_PHOTO_TYPES:
            raise ValueError("garment_photo_type must be one of: model, flat-lay")
        return normalized


def get_pipeline() -> TryOnPipeline:
    global PIPELINE
    if PIPELINE is None:
        with PIPELINE_LOCK:
            if PIPELINE is None:
                start = time.time()
                PIPELINE = TryOnPipeline(weights_dir=WEIGHTS_DIR)
                logger.info("Loaded FASHN pipeline from %s in %.2fs", WEIGHTS_DIR, time.time() - start)
    return PIPELINE


def _decode_image(image_base64: str) -> Image.Image:
    raw = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(raw))
    image = ImageOps.exif_transpose(image)
    return image.convert("RGB")


def _encode_image(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _authorize(authorization: Optional[str]) -> None:
    expected_token = (os.getenv("TRYON_API_TOKEN") or "").strip()
    if not expected_token:
        return

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")

    actual_token = authorization.split(" ", 1)[1].strip()
    if actual_token != expected_token:
        raise HTTPException(status_code=401, detail="Invalid bearer token.")


def _normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    candidate = payload.get("input") if isinstance(payload.get("input"), dict) else payload
    if not isinstance(candidate, dict):
        raise HTTPException(status_code=422, detail="Request body must be a JSON object.")
    return candidate


@app.get("/healthz")
def healthcheck() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "fashn-vton-pod",
        "weights_dir": WEIGHTS_DIR,
        "pipeline_loaded": PIPELINE is not None,
    }


@app.post("/tryon")
def create_tryon(payload: dict[str, Any], authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    _authorize(authorization)

    try:
        request = TryOnRequest.model_validate(_normalize_payload(payload))
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    start = time.time()
    try:
        pipeline = get_pipeline()
        person_image = _decode_image(request.person_image_base64)
        garment_image = _decode_image(request.garment_image_base64)

        result = pipeline(
            person_image=person_image,
            garment_image=garment_image,
            category=request.category,
            garment_photo_type=request.garment_photo_type,
            num_samples=request.num_samples,
            num_timesteps=request.num_timesteps,
            guidance_scale=request.guidance_scale,
            seed=request.seed,
            segmentation_free=request.segmentation_free,
        )
        output_image = result.images[0]
        return {
            "image_base64": _encode_image(output_image),
            "mime_type": "image/png",
            "provider": "runpod-pod/fashn-vton-1.5",
            "category": request.category,
            "garment_photo_type": request.garment_photo_type,
            "elapsed_seconds": round(time.time() - start, 3),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Try-on inference failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
