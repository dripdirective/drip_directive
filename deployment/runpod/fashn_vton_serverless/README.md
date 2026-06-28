# FASHN VTON 1.5 — RunPod Serverless

Scale-to-zero virtual try-on. You pay only while a request runs (~$0.005/request),
and $0.00 when idle. Built for low/spiky traffic (e.g. 20–30 requests/day).

```
Android app ──► your backend (app/, FastAPI) ──► RunPod Serverless endpoint ──► handler.py
```

The backend already speaks the serverless protocol (`RunpodTryOnClient` in
`app/core/tryon.py`). This folder is the **worker** that runs on RunPod.

## Files
- `handler.py` — the serverless worker (loads the pipeline once, runs try-on per job).
- `Dockerfile` — bakes the FASHN package **and weights** into the image.
- `requirements.txt` — worker deps (`runpod`, `pillow`).
- `smoke_test.py` — submit a job to `/run` and poll `/status`.
- `backend_env_serverless.example` — env preset for your backend.

---

## Deploy (GitHub auto-build)

### 1. Push this code to GitHub
Commit the repo (or at least this folder) to a GitHub repo RunPod can read.

### 2. Connect RunPod to GitHub
RunPod console → **Settings → Connections → GitHub** → authorize.

### 3. Create the serverless endpoint
Console → **Serverless → New Endpoint → Import Git Repository**.
- **Repository:** your repo
- **Branch:** `main`
- **Dockerfile path:** `deployment/runpod/fashn_vton_serverless/Dockerfile`
- **Build context:** `deployment/runpod/fashn_vton_serverless`
- If the FASHN weights are gated on Hugging Face, add a **build secret / build arg**
  `HF_TOKEN=hf_xxx` so the `download_weights.py` step can authenticate.

### 4. Endpoint settings (the cheap config)
| Setting | Value | Why |
|---|---|---|
| GPU | **24 GB** (L4 / A5000 / 3090, $0.00019/s) | enough VRAM for SDXL-class VTON, cheapest that fits |
| Active workers | **0** | $0 when idle |
| Max workers | **1** (2 if you ever burst) | low volume |
| FlashBoot | **ON** | cuts cold starts |
| Idle timeout | **15s** | absorbs back-to-back requests |
| Execution timeout | **300s** | safety cap |

> Weights are baked in, so the endpoint is **not** pinned to a datacenter and needs
> no network volume.

### 5. Grab the Endpoint ID
After the build finishes, copy the **Endpoint ID** from the endpoint page.

---

## Point your backend at it
Copy `backend_env_serverless.example` values into your backend `.env`:

```env
VIRTUAL_TRYON_PROVIDER=runpod
RUNPOD_API_KEY=rpa_...           # rotate the key you pasted in chat!
RUNPOD_TRYON_ENDPOINT_ID=<your endpoint id>
```

Restart the backend. The provider selector
(`_select_tryon_client` in `app/core/tryon.py`) now routes to serverless.

---

## Test

**Direct (bypasses your backend):**
```bash
python deployment/runpod/fashn_vton_serverless/smoke_test.py \
  --endpoint-id YOUR_ENDPOINT_ID \
  --api-key "$RUNPOD_API_KEY" \
  --person test_images/suvom.jpg \
  --garment test_images/shirt3.jpg \
  --category tops \
  --out /tmp/tryon_serverless.png
```
First call includes a cold start (model load) → can take 1–2 min; later calls are fast.

**End-to-end from the Android app:** with the backend env set and the backend
reachable from the phone, run a try-on in the app — it flows through to serverless.

---

## Cost sanity check (24 GB GPU @ $0.00019/s)
- ~20s compute/request × 30/day × 30 days ≈ 5 GPU-hours/month ≈ **$3–4/month** compute.
- Idle: **$0**. No storage cost (weights are in the image, not a volume).
