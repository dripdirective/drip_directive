"""
RunPod Serverless handler for the FASHN VTON 1.5 pipeline.

Contract (matches app/core/tryon.py RunpodTryOnClient):

  Input  (event["input"]):
    person_image_base64   : str  (required)
    garment_image_base64  : str  (required)
    category              : str  (tops | bottoms | one-pieces)
    garment_photo_type    : str  (model | flat-lay)        default flat-lay
    num_samples           : int                            default 1
    num_timesteps         : int                            default 30
    guidance_scale        : float                          default 1.5
    segmentation_free     : bool                           default True
    seed                  : int|null                       default 42

  Output (job "output"):
    image_base64 : str
    mime_type    : "image/png"
    provider     : "runpod/fashn-vton-1.5"
    category, garment_photo_type, elapsed_seconds
  On failure:
    { "error": "<message>" }
"""
from __future__ import annotations

import base64
import io
import logging
import os
import time
from threading import Lock
from typing import Any, Optional

import runpod
from PIL import Image, ImageOps

from fashn_vton import TryOnPipeline

logger = logging.getLogger("fashn_vton_serverless")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

VALID_CATEGORIES = {"tops", "bottoms", "one-pieces"}
VALID_GARMENT_PHOTO_TYPES = {"model", "flat-lay"}
WEIGHTS_DIR = os.getenv("FASHN_WEIGHTS_DIR", "/weights")

PIPELINE: Optional[TryOnPipeline] = None
PIPELINE_LOCK = Lock()


def get_pipeline() -> TryOnPipeline:
    """Lazily load the pipeline once per worker and keep it warm in GPU memory."""
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


def _validate(value: Optional[str], allowed: set[str], field: str, default: Optional[str] = None) -> str:
    normalized = str(value if value is not None else default).strip().lower()
    if normalized not in allowed:
        raise ValueError(f"{field} must be one of: {', '.join(sorted(allowed))}")
    return normalized


def handler(event: dict[str, Any]) -> dict[str, Any]:
    job_input = event.get("input")
    if not isinstance(job_input, dict):
        return {"error": "Request 'input' must be a JSON object."}

    trace_id = str(job_input.get("trace_id") or event.get("id") or "-")
    start = time.time()

    try:
        person_b64 = job_input.get("person_image_base64")
        garment_b64 = job_input.get("garment_image_base64")
        if not person_b64 or not garment_b64:
            return {"error": "person_image_base64 and garment_image_base64 are required."}

        category = _validate(job_input.get("category"), VALID_CATEGORIES, "category")
        garment_photo_type = _validate(
            job_input.get("garment_photo_type"), VALID_GARMENT_PHOTO_TYPES, "garment_photo_type", default="flat-lay"
        )
        num_samples = int(job_input.get("num_samples", 1))
        num_timesteps = int(job_input.get("num_timesteps", 30))
        guidance_scale = float(job_input.get("guidance_scale", 1.5))
        segmentation_free = bool(job_input.get("segmentation_free", True))
        seed = job_input.get("seed", 42)
        seed = int(seed) if seed is not None else None

        logger.info(
            "[trace=%s] serverless try-on category=%s photo_type=%s timesteps=%s guidance=%s seg_free=%s",
            trace_id, category, garment_photo_type, num_timesteps, guidance_scale, segmentation_free,
        )

        pipeline = get_pipeline()
        person_image = _decode_image(person_b64)
        garment_image = _decode_image(garment_b64)

        result = pipeline(
            person_image=person_image,
            garment_image=garment_image,
            category=category,
            garment_photo_type=garment_photo_type,
            num_samples=num_samples,
            num_timesteps=num_timesteps,
            guidance_scale=guidance_scale,
            seed=seed,
            segmentation_free=segmentation_free,
        )
        output_image = result.images[0]
        elapsed = round(time.time() - start, 3)
        logger.info("[trace=%s] completed in %ss", trace_id, elapsed)

        return {
            "image_base64": _encode_image(output_image),
            "mime_type": "image/png",
            "provider": "runpod/fashn-vton-1.5",
            "category": category,
            "garment_photo_type": garment_photo_type,
            "elapsed_seconds": elapsed,
        }
    except ValueError as exc:
        logger.warning("[trace=%s] validation error: %s", trace_id, exc)
        return {"error": str(exc)}
    except Exception as exc:  # noqa: BLE001 - surface to the caller as a job error
        logger.exception("[trace=%s] inference failed", trace_id)
        return {"error": str(exc)}


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
