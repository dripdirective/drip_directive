#!/usr/bin/env python3
"""
Smoke test for the FASHN VTON RunPod *serverless* endpoint.

Submits a job to /run and polls /status until COMPLETED, mirroring the backend
client in app/core/tryon.py.

Example:
  python deployment/runpod/fashn_vton_serverless/smoke_test.py \
    --endpoint-id YOUR_ENDPOINT_ID \
    --api-key "$RUNPOD_API_KEY" \
    --person test_images/suvom.jpg \
    --garment test_images/shirt3.jpg \
    --category tops \
    --out /tmp/tryon_serverless.png
"""
from __future__ import annotations

import argparse
import base64
import json
import sys
import time
from pathlib import Path

import httpx


def encode_image(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("utf-8")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Smoke test the RunPod serverless FASHN VTON endpoint.")
    p.add_argument("--endpoint-id", required=True, help="RunPod serverless endpoint ID.")
    p.add_argument("--api-key", required=True, help="RunPod API key (rpa_...).")
    p.add_argument("--base-url", default="https://api.runpod.ai/v2")
    p.add_argument("--person", required=True, type=Path)
    p.add_argument("--garment", required=True, type=Path)
    p.add_argument("--category", required=True, choices=["tops", "bottoms", "one-pieces"])
    p.add_argument("--garment-photo-type", default="flat-lay", choices=["model", "flat-lay"])
    p.add_argument("--num-timesteps", default=30, type=int)
    p.add_argument("--guidance-scale", default=1.5, type=float)
    p.add_argument("--poll-interval", default=2.0, type=float)
    p.add_argument("--timeout", default=600, type=int, help="Total seconds to wait (covers cold start).")
    p.add_argument("--out", default=Path("tryon_serverless_output.png"), type=Path)
    return p.parse_args()


def main() -> int:
    args = parse_args()
    base = f"{args.base_url.rstrip('/')}/{args.endpoint_id}"
    headers = {
        "Authorization": f"Bearer {args.api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "input": {
            "person_image_base64": encode_image(args.person),
            "garment_image_base64": encode_image(args.garment),
            "category": args.category,
            "garment_photo_type": args.garment_photo_type,
            "num_timesteps": args.num_timesteps,
            "guidance_scale": args.guidance_scale,
            "segmentation_free": True,
        }
    }

    with httpx.Client(timeout=60, headers=headers, follow_redirects=True) as client:
        print("Submitting job...")
        r = client.post(f"{base}/run", json=payload)
        if r.status_code >= 400:
            print(f"Submit failed {r.status_code}: {r.text[:500]}", file=sys.stderr)
            return 1
        data = r.json()
        job_id = data.get("id")
        status = data.get("status")
        print(f"Job {job_id} status={status}")

        deadline = time.monotonic() + args.timeout
        while status not in {"COMPLETED", "FAILED", "TIMED_OUT", "CANCELLED"}:
            if time.monotonic() > deadline:
                print(f"Timed out after {args.timeout}s (last status: {status}).", file=sys.stderr)
                return 1
            time.sleep(args.poll_interval)
            s = client.get(f"{base}/status/{job_id}")
            if s.status_code >= 400:
                print(f"Status failed {s.status_code}: {s.text[:500]}", file=sys.stderr)
                return 1
            data = s.json()
            status = data.get("status")
            print(f"  ... {status}")

    if status != "COMPLETED":
        print(f"Job ended with {status}: {json.dumps(data, indent=2)}", file=sys.stderr)
        return 1

    output = data.get("output") or {}
    image_base64 = output.get("image_base64")
    if not image_base64:
        print(f"No image in output: {json.dumps(output, indent=2)}", file=sys.stderr)
        return 1

    args.out.write_bytes(base64.b64decode(image_base64))
    print(f"Saved output to {args.out}")
    print(json.dumps({k: v for k, v in output.items() if k != "image_base64"}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
