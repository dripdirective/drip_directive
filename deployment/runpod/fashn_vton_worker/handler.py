import base64
import io
import os
import time

import runpod
from PIL import Image

from fashn_vton import TryOnPipeline

VALID_CATEGORIES = {"tops", "bottoms", "one-pieces"}
VALID_GARMENT_PHOTO_TYPES = {"model", "flat-lay"}
WEIGHTS_DIR = os.getenv("FASHN_WEIGHTS_DIR", "/opt/fashn-vton-weights")

PIPELINE = None


def get_pipeline():
    global PIPELINE
    if PIPELINE is None:
        start = time.time()
        PIPELINE = TryOnPipeline(weights_dir=WEIGHTS_DIR)
        print(f"Loaded FASHN pipeline from {WEIGHTS_DIR} in {time.time() - start:.2f}s")
    return PIPELINE


def decode_image(image_base64: str) -> Image.Image:
    raw = base64.b64decode(image_base64)
    return Image.open(io.BytesIO(raw)).convert("RGB")


def encode_image(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def validate_input(job_input):
    missing = [
        key
        for key in ("person_image_base64", "garment_image_base64", "category")
        if not job_input.get(key)
    ]
    if missing:
        return f"Missing required input field(s): {', '.join(missing)}"

    category = str(job_input.get("category")).strip().lower()
    if category not in VALID_CATEGORIES:
        return "category must be one of: tops, bottoms, one-pieces"

    garment_photo_type = str(job_input.get("garment_photo_type", "flat-lay")).strip().lower()
    if garment_photo_type not in VALID_GARMENT_PHOTO_TYPES:
        return "garment_photo_type must be one of: model, flat-lay"

    return None


def handler(job):
    start = time.time()
    job_input = job.get("input", {})

    validation_error = validate_input(job_input)
    if validation_error:
        return {"error": validation_error}

    try:
        runpod.serverless.progress_update(job, "Loading FASHN pipeline")
        pipeline = get_pipeline()

        runpod.serverless.progress_update(job, "Decoding input images")
        person_image = decode_image(job_input["person_image_base64"])
        garment_image = decode_image(job_input["garment_image_base64"])

        category = str(job_input["category"]).strip().lower()
        garment_photo_type = str(job_input.get("garment_photo_type", "flat-lay")).strip().lower()
        num_samples = int(job_input.get("num_samples", 1))
        num_timesteps = int(job_input.get("num_timesteps", 30))
        guidance_scale = float(job_input.get("guidance_scale", 1.5))
        segmentation_free = bool(job_input.get("segmentation_free", True))
        seed = job_input.get("seed", 42)

        runpod.serverless.progress_update(job, "Running try-on inference")
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
        return {
            "image_base64": encode_image(output_image),
            "mime_type": "image/png",
            "provider": "runpod/fashn-vton-1.5",
            "category": category,
            "garment_photo_type": garment_photo_type,
            "elapsed_seconds": round(time.time() - start, 3),
        }
    except Exception as exc:
        return {"error": str(exc)}


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
