# Runpod FASHN VTON Deployment Guide

If you are deploying to a normal long-lived Runpod Pod instead of Runpod Serverless, use `docs/RUNPOD_FASHN_VTON_POD_DEPLOYMENT.md`.

This repo now supports a dedicated Runpod-backed virtual try-on flow for two backend use cases:

1. Recommendation try-on: `POST /api/recommendations/{recommendation_id}/tryon`
2. Direct wardrobe try-on: `POST /api/wardrobe/items/{item_id}/tryon`

Important product note: `fashn-ai/fashn-vton-1.5` only accepts one garment image per inference, not a full multi-piece outfit. For recommendation try-on, the backend auto-selects a primary garment from the outfit unless you explicitly send `wardrobe_item_id`.

## Recommended Runpod setup

- Endpoint type: `Serverless -> Queue based`
- Container image: build and push the worker in `deployment/runpod/fashn_vton_worker/Dockerfile`
- Primary GPU recommendation: `L4 / A5000 / 3090 (24 GB tier)`
- Fallback GPU recommendation: `A4000 / A4500 / RTX 4000 (16 GB tier)` if you want better availability with slightly slower inference
- Active workers:
  - `0` for lowest cost
  - `1` if you want to eliminate cold starts
- Max workers: `2` to start
- GPUs per worker: `1`
- Idle timeout: `5s`
- Execution timeout: `180s`
- Job TTL: `600s`
- FlashBoot: `enabled`

Why this GPU choice:

- The FASHN model is light enough that the 24 GB Ampere tier is the best cost/performance middle ground here rather than paying for A100/H100-class throughput. The 16 GB tier is still a valid budget fallback if you want to optimize harder for cost than latency.

## Step 1: Build the worker image

From the repo root:

```bash
docker build \
  -t your-registry/dripdirective-fashn-vton:latest \
  deployment/runpod/fashn_vton_worker
```

Then push it:

```bash
docker push your-registry/dripdirective-fashn-vton:latest
```

What the image does:

- installs the Runpod worker SDK
- clones `fashn-AI/fashn-vton-1.5`
- installs the package
- downloads the model weights into `/opt/fashn-vton-weights`
- starts a queue-based Runpod handler that returns `image_base64` to the backend

The worker files live here:

- `deployment/runpod/fashn_vton_worker/handler.py`
- `deployment/runpod/fashn_vton_worker/Dockerfile`
- `deployment/runpod/fashn_vton_worker/requirements.txt`

## Step 2: Create the Runpod Serverless endpoint

In Runpod:

1. Open Serverless.
2. Create a new queue-based endpoint.
3. Use your custom container image.
4. Set the GPU tier to `L4/A5000/3090 24 GB`.
5. Optionally add the `A4000/A4500/RTX 4000 16 GB` tier as fallback priority.
6. Set `Active workers = 0` if you want cheapest cost, or `1` if you want no cold starts.
7. Set `Max workers = 2`.
8. Keep `GPUs per worker = 1`.
9. Set `Idle timeout = 5s`.
10. Set `Execution timeout = 180s`.
11. Set `Job TTL = 600s`.
12. Keep `FlashBoot` enabled.

These settings line up with Runpod’s serverless model: active workers control whether workers stay warm, idle timeout controls how long a worker stays up after a request, execution timeout caps job runtime, and FlashBoot reduces cold starts.

## Step 3: Copy the endpoint ID and API key

You need:

- `RUNPOD_API_KEY`
- `RUNPOD_TRYON_ENDPOINT_ID`

The backend calls the endpoint asynchronously using `/run` and then polls `/status/{job_id}` until it gets the result. That avoids relying on `runsync` during cold starts.

## Step 4: Configure the backend

Add these variables to your backend `.env`:

```env
VIRTUAL_TRYON_PROVIDER=runpod
RUNPOD_API_KEY=your_runpod_api_key
RUNPOD_TRYON_ENDPOINT_ID=your_endpoint_id
RUNPOD_API_BASE_URL=https://api.runpod.ai/v2
RUNPOD_TRYON_HTTP_TIMEOUT_SECONDS=30
RUNPOD_TRYON_POLL_INTERVAL_MS=2000
RUNPOD_TRYON_TIMEOUT_SECONDS=240
RUNPOD_TRYON_EXECUTION_TIMEOUT_SECONDS=180
RUNPOD_TRYON_TTL_SECONDS=600
RUNPOD_TRYON_MAX_IMAGE_DIMENSION=1024
RUNPOD_TRYON_GARMENT_PHOTO_TYPE=flat-lay
RUNPOD_TRYON_NUM_TIMESTEPS=30
RUNPOD_TRYON_GUIDANCE_SCALE=1.5
RUNPOD_TRYON_NUM_SAMPLES=1
RUNPOD_TRYON_SEGMENTATION_FREE=true
```

The same variables are now documented in `docs/env.example`.

## Step 5: Restart the backend

Once the backend restarts, try-on requests will use Runpod instead of the legacy prompt-based fallback.

Backend integration code lives in:

- `app/core/tryon.py`
- `app/routers/recommendations.py`
- `app/routers/wardrobe.py`
- `app/schemas.py`
- `app/config.py`

## Step 6: Test recommendation try-on

Request:

```bash
curl -X POST "http://localhost:8000/api/recommendations/123/tryon" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "outfit_index": 0,
    "user_image_id": 42,
    "garment_photo_type": "flat-lay"
  }'
```

You can also pin the exact garment inside the outfit:

```json
{
  "outfit_index": 0,
  "user_image_id": 42,
  "wardrobe_item_id": 991,
  "category": "tops",
  "garment_photo_type": "flat-lay"
}
```

Notes:

- `user_image_id` is optional; if you omit it, the backend uses the newest uploaded user photo
- `wardrobe_item_id` is optional on recommendation try-on; if omitted, the backend picks a primary garment from the outfit
- `category` is optional when the backend can infer it from wardrobe metadata

## Step 7: Test direct wardrobe try-on

This is the new endpoint for “try this uploaded dress/clothing item on this selected user photo”:

```bash
curl -X POST "http://localhost:8000/api/wardrobe/items/991/tryon" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "user_image_id": 42,
    "category": "one-pieces",
    "garment_photo_type": "flat-lay"
  }'
```

Use this path when the user wants try-on directly from an uploaded wardrobe item without going through recommendations first.

## Backend behavior details

- The backend now accepts a selected `user_image_id`, so the frontend can let users pick which uploaded photo to use.
- The direct wardrobe try-on route does not require AI wardrobe processing to be completed first. It only needs the uploaded wardrobe image.
- The recommendation try-on route stays backward compatible. If Runpod is not configured, it falls back to the old legacy prompt-based try-on path.
- Runpod requests are sent as compressed base64 images, so the backend does not need public S3 URLs just to run try-on.

## Runpod worker contract

The backend expects the Runpod worker to accept this input shape:

```json
{
  "input": {
    "person_image_base64": "...",
    "garment_image_base64": "...",
    "category": "tops",
    "garment_photo_type": "flat-lay",
    "num_samples": 1,
    "num_timesteps": 30,
    "guidance_scale": 1.5,
    "segmentation_free": true
  }
}
```

And the worker should return:

```json
{
  "image_base64": "...",
  "mime_type": "image/png",
  "provider": "runpod/fashn-vton-1.5",
  "category": "tops",
  "garment_photo_type": "flat-lay"
}
```

That contract is exactly what `deployment/runpod/fashn_vton_worker/handler.py` returns today.
