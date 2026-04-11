#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import sys
from pathlib import Path
from urllib import error, request


def encode_image(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke test the Runpod pod FASHN VTON API.")
    parser.add_argument("--base-url", required=True, help="Public or private base URL for the pod API.")
    parser.add_argument("--person", required=True, type=Path, help="Path to the person image.")
    parser.add_argument("--garment", required=True, type=Path, help="Path to the garment image.")
    parser.add_argument("--category", required=True, choices=["tops", "bottoms", "one-pieces"])
    parser.add_argument("--token", help="Bearer token if TRYON_API_TOKEN is configured on the pod.")
    parser.add_argument("--garment-photo-type", default="flat-lay", choices=["model", "flat-lay"])
    parser.add_argument("--num-samples", default=1, type=int)
    parser.add_argument("--num-timesteps", default=30, type=int)
    parser.add_argument("--guidance-scale", default=1.5, type=float)
    parser.add_argument("--segmentation-free", dest="segmentation_free", action="store_true")
    parser.add_argument("--no-segmentation-free", dest="segmentation_free", action="store_false")
    parser.set_defaults(segmentation_free=True)
    parser.add_argument("--timeout", default=300, type=int)
    parser.add_argument("--out", default=Path("tryon_output.png"), type=Path, help="Where to save the output image.")
    return parser.parse_args()


def read_json(url: str, *, timeout: int, token: str | None = None) -> dict:
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = request.Request(url, headers=headers, method="GET")
    with request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def post_json(url: str, payload: dict, *, timeout: int, token: str | None = None) -> dict:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=body, headers=headers, method="POST")
    with request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    args = parse_args()
    base_url = args.base_url.rstrip("/")

    try:
        health = read_json(f"{base_url}/healthz", timeout=min(args.timeout, 30))
    except error.URLError as exc:
        print(f"Health check failed: {exc}", file=sys.stderr)
        return 1

    print("Health check:", json.dumps(health, indent=2))

    payload = {
        "person_image_base64": encode_image(args.person),
        "garment_image_base64": encode_image(args.garment),
        "category": args.category,
        "garment_photo_type": args.garment_photo_type,
        "num_samples": args.num_samples,
        "num_timesteps": args.num_timesteps,
        "guidance_scale": args.guidance_scale,
        "segmentation_free": args.segmentation_free,
    }

    try:
        result = post_json(
            f"{base_url}/tryon",
            payload,
            timeout=args.timeout,
            token=args.token,
        )
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"Try-on request failed with {exc.code}: {detail}", file=sys.stderr)
        return 1
    except error.URLError as exc:
        print(f"Try-on request failed: {exc}", file=sys.stderr)
        return 1

    image_base64 = result.get("image_base64")
    if not image_base64:
        print(f"Unexpected response: {json.dumps(result, indent=2)}", file=sys.stderr)
        return 1

    args.out.write_bytes(base64.b64decode(image_base64))
    print(f"Saved output to {args.out}")
    print(json.dumps({k: v for k, v in result.items() if k != 'image_base64'}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
