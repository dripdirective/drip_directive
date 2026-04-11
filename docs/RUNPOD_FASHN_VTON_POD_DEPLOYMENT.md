# Runpod FASHN VTON Pod Deployment Guide

This guide is for a normal long-lived Runpod Pod, not Runpod Serverless.

The repo now includes a dedicated pod-ready HTTP service plus backend support for calling that pod directly:

- `deployment/runpod/fashn_vton_pod/service.py`
- `deployment/runpod/fashn_vton_pod/bootstrap.sh`
- `deployment/runpod/fashn_vton_pod/start_api.sh`
- `deployment/runpod/fashn_vton_pod/launch_api.sh`
- `deployment/runpod/fashn_vton_pod/session_start.sh`
- `deployment/runpod/fashn_vton_pod/smoke_test.py`

## What this path gives you

- Persistent model weights on your Runpod network volume
- A simple `POST /tryon` API running inside the pod
- Backend support via `VIRTUAL_TRYON_PROVIDER=runpod_pod`
- A direct smoke-test script before you wire up the main backend

## Recommended pod settings

- Template: `Runpod PyTorch 2.4.0`
- GPU: `RTX A4500`, `RTX 4000 Ada`, or `RTX A5000`
- SSH: enabled
- Exposed port: `8000` over HTTP
- Container disk: `20 GB` minimum
- Network volume: use the persistent volume for repo checkout and model weights

## RTX A4500 notes

`RTX A4500` is a valid pod choice for this setup. You do not need code changes in the pod service itself just because the GPU changes.

Start with the normal backend try-on defaults first. If the pod later shows CUDA OOM or unstable latency, lower only:

- `RUNPOD_TRYON_MAX_IMAGE_DIMENSION=960`
- `RUNPOD_TRYON_NUM_TIMESTEPS=28`

Everything else can stay the same.

## Lifecycle choice

Because you are attaching a network volume, this pod is best treated as an on-demand test pod:

- Create the pod when you want to test
- Run the setup/start commands
- Terminate the pod when you are done
- Recreate a new pod later with the same network volume attached

That is the correct low-cost workflow for your current storage choice.

If you specifically want a literal `Stop` and later `Start` action on the same pod, you need to use a normal `Volume disk` instead of a `Network volume`. In that setup, `/workspace` persists when the pod is stopped, but the pod-scoped storage is deleted when the pod is terminated.

## Step 1: Create the pod

Create the pod in the same region as your attached network volume.

If your network volume already exists, Runpod will lock the pod region to that volume's region. That is expected.

## Step 2: Put this repo onto the pod

After the pod starts, SSH into it.

If the repo is not already on the network volume, clone it:

```bash
git clone <YOUR_REPO_URL> /workspace/drip_directive
```

If it is already there, update it instead:

```bash
cd /workspace/drip_directive
git pull
```

## Step 3: Bootstrap the pod service

From inside the pod:

```bash
cd /workspace/drip_directive
chmod +x deployment/runpod/fashn_vton_pod/*.sh
export TRYON_API_TOKEN="$(openssl rand -hex 32)"
bash deployment/runpod/fashn_vton_pod/bootstrap.sh
```

Keep that `TRYON_API_TOKEN` available in the shell before you run `launch_api.sh` or `start_api.sh`. The start script refuses to launch an unauthenticated public API unless you explicitly override that safeguard.

What this does:

- installs the small HTTP-service dependencies
- clones `fashn-AI/fashn-vton-1.5` into `/workspace/fashn-vton-1.5` if needed
- installs the FASHN package in editable mode
- downloads model weights into `/workspace/fashn-vton-weights`

Those paths are on the network volume by default, so they survive pod restarts.

## Step 4: Start the pod API

```bash
cd /workspace/drip_directive
bash deployment/runpod/fashn_vton_pod/launch_api.sh
```

Or use the combined helper to bootstrap and launch in one step:

```bash
cd /workspace/drip_directive
export TRYON_API_TOKEN="$(openssl rand -hex 32)"
bash deployment/runpod/fashn_vton_pod/session_start.sh
```

Foreground mode is also available if you want live logs in the terminal:

```bash
cd /workspace/drip_directive
bash deployment/runpod/fashn_vton_pod/start_api.sh
```

The default API port is `8000`.

## Step 5: Check the local health endpoint

Inside the pod:

```bash
curl http://127.0.0.1:8000/healthz
```

Expected shape:

```json
{
  "status": "ok",
  "service": "fashn-vton-pod",
  "weights_dir": "/workspace/fashn-vton-weights",
  "pipeline_loaded": false
}
```

`pipeline_loaded` flips to `true` after the first inference request.

## Step 6: Expose the pod API publicly

In Runpod, expose port `8000` as an HTTP service and copy the generated public URL.

Your backend will use that URL as `RUNPOD_POD_API_URL`.

## Step 7: Configure the backend

Set these values in the backend `.env`:

```env
VIRTUAL_TRYON_PROVIDER=runpod_pod
RUNPOD_POD_API_URL=https://YOUR-POD-HTTP-URL
RUNPOD_POD_API_TOKEN=the_same_token_you_exported_on_the_pod
RUNPOD_POD_HTTP_TIMEOUT_SECONDS=300

RUNPOD_TRYON_MAX_IMAGE_DIMENSION=1024
RUNPOD_TRYON_GARMENT_PHOTO_TYPE=flat-lay
RUNPOD_TRYON_NUM_TIMESTEPS=30
RUNPOD_TRYON_GUIDANCE_SCALE=1.5
RUNPOD_TRYON_NUM_SAMPLES=1
RUNPOD_TRYON_SEGMENTATION_FREE=true
```

If you are deploying on `RTX A4500`, you can also copy the ready-made preset from:

- `deployment/runpod/fashn_vton_pod/backend_env_a4500.example`

If you need a more conservative fallback for that card, keep the same block but lower:

```env
RUNPOD_TRYON_MAX_IMAGE_DIMENSION=960
RUNPOD_TRYON_NUM_TIMESTEPS=28
```

Then restart the backend.

## Step 8: Smoke test the pod directly

Before routing production traffic through the backend, test the pod API directly:

```bash
python deployment/runpod/fashn_vton_pod/smoke_test.py \
  --base-url https://YOUR-POD-HTTP-URL \
  --token "$TRYON_API_TOKEN" \
  --person /path/to/person.jpg \
  --garment /path/to/garment.jpg \
  --category tops \
  --out /tmp/tryon_output.png
```

This script first checks `/healthz`, then sends a real `POST /tryon`, and saves the generated image to the output path you provide.

For an `RTX A4500` conservative smoke test, you can use:

```bash
python deployment/runpod/fashn_vton_pod/smoke_test.py \
  --base-url https://YOUR-POD-HTTP-URL \
  --token "$TRYON_API_TOKEN" \
  --person /path/to/person.jpg \
  --garment /path/to/garment.jpg \
  --category tops \
  --num-timesteps 28 \
  --guidance-scale 1.5 \
  --out /tmp/tryon_output.png
```

## Step 9: Test from the main backend

Recommendation try-on:

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

Direct wardrobe try-on:

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

## Notes

- Keep a single API process per GPU. Do not run multiple Uvicorn workers on one card.
- The pod API accepts both plain JSON payloads and a Runpod-style nested payload with an `input` object.
- If you rotate the pod token, update both the pod environment and the backend `.env`.
- With a network volume attached, expect to `terminate` the pod between sessions, not `stop` it.
- After you recreate the pod, rerun `bootstrap.sh` or `session_start.sh`. The Python packages are installed into the fresh container each time, but the repo and model weights remain on `/workspace`.
- If the pod's public HTTP URL changes after recreation, update `RUNPOD_POD_API_URL` in the backend before testing again.
