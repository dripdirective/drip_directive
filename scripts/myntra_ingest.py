#!/usr/bin/env python3
"""
Myntra catalog ingestion (offline).

Productionized from the scraping POC. Fetches Myntra PDP data via the embedded
`window.__myx` JSON (stdlib only, no browser) and writes a normalized catalog to
app/data/myntra_catalog.json that the backend serves to the app.

Usage:
  # Seed from the built-in sample product list:
  python scripts/myntra_ingest.py

  # Or from a CSV produced by the Playwright scraper (needs a 'product_url' column):
  python scripts/myntra_ingest.py --csv myntra_enriched.csv

  # Or from explicit product URLs:
  python scripts/myntra_ingest.py --url <pdp_url> --url <pdp_url> ...

Re-run any time to refresh prices/images.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.request

OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "app", "data", "myntra_catalog.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

# Built-in seed list (real Myntra product IDs). Slug text is cosmetic — Myntra
# resolves the PDP by the trailing id. Add bottoms/dresses here or via --csv.
SEED = [
    ("32803705", "tshirts", "Toodle Plus", "Toodle Plus Men Plus Size Cotton Printed T-shirt"),
    ("37229392", "tshirts", "Leotude", "Leotude Women Typography Printed Round Neck Cotton Oversized T-shirt"),
    ("39698621", "tshirts", "TQH", "TQH Women Typography Printed T-shirt"),
    ("32635738", "tshirts", "MuscleBlaze", "MuscleBlaze Unisex Brand Logo Printed Round Neck Compression T-shirt"),
    ("37776403", "tshirts", "H&M", "H&M Layered-Look T-Shirt"),
    ("40976058", "tshirts", "NOBERO", "NOBERO Women Typography Printed Round Neck Cotton T-shirt"),
    ("33281207", "tshirts", "Rigo", "Rigo Unisex Naruto Graphic Printed Round Neck Cotton Oversized T-shirt"),
]

# Map Myntra article types / keywords -> our try-on categories.
ONE_PIECE_KW = ("dress", "gown", "jumpsuit", "romper", "saree", "kurta set", "co-ord")
BOTTOM_KW = ("jean", "trouser", "pant", "short", "skirt", "legging", "jogger", "chino")


def _slug(s: str) -> str:
    s = (s or "").lower().replace("&", "").replace("'", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def infer_category(name: str, article_type: str = "") -> str:
    text = f"{article_type} {name}".lower()
    if any(k in text for k in ONE_PIECE_KW):
        return "one-pieces"
    if any(k in text for k in BOTTOM_KW):
        return "bottoms"
    return "tops"


def _strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", " ", s or "").replace("&amp;", "&").strip()


def fetch_pdp(url: str) -> dict | None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
    except Exception as e:  # noqa: BLE001
        print(f"  fetch failed: {e}")
        return None
    m = re.search(r"window\.__myx\s*=\s*(\{.*?\})</script>", html, re.DOTALL)
    if not m:
        print("  no __myx in page")
        return None
    pdp = json.loads(m.group(1)).get("pdpData", {})

    images = []
    for album in pdp.get("media", {}).get("albums", []):
        for img in album.get("images", []):
            u = (img.get("imageURL") or "").replace("\\/", "/")
            if u.startswith("http://"):
                u = "https://" + u[len("http://"):]  # Android blocks cleartext HTTP images
            if u:
                images.append(u)

    name = pdp.get("name") or ""
    article_type = ((pdp.get("analytics") or {}).get("articleType")) or ""
    details = ""
    for d in pdp.get("productDetails", []) or []:
        if (d.get("title") or "").lower().startswith("product details"):
            details = _strip_html(d.get("description"))
            break

    return {
        "source": "myntra",
        "product_id": str(pdp.get("id") or ""),
        "name": name,
        "brand": (pdp.get("brand") or {}).get("name"),
        "category": infer_category(name, article_type),
        "base_color": pdp.get("baseColour"),
        "mrp": pdp.get("mrp"),
        "price": (pdp.get("price") or {}).get("discounted"),
        "rating": round((pdp.get("ratings") or {}).get("averageRating") or 0, 1) or None,
        "rating_count": (pdp.get("ratings") or {}).get("totalCount"),
        "image": images[0] if images else None,
        "images": images[:4],
        "details": details,
        "product_url": url,
    }


def build_urls(args) -> list[str]:
    urls: list[str] = list(args.url or [])
    if args.csv:
        import csv

        with open(args.csv, newline="", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                u = (row.get("product_url") or "").strip()
                if u:
                    urls.append(u)
    if not urls:
        urls = [
            f"https://www.myntra.com/{cat}/{_slug(brand)}/{_slug(name)}/{pid}/buy"
            for pid, cat, brand, name in SEED
        ]
    return urls


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", help="CSV with a product_url column (from the Playwright scraper)")
    ap.add_argument("--url", action="append", help="explicit PDP url(s)")
    ap.add_argument("--out", default=OUT_PATH)
    args = ap.parse_args()

    urls = build_urls(args)
    catalog = []
    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}] {url[:80]}")
        item = fetch_pdp(url)
        if item and item.get("image") and item.get("product_id"):
            catalog.append(item)
            print(f"  + {item['brand']} | {item['category']} | Rs.{item['price']}")
        time.sleep(0.8)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
    by_cat = {}
    for it in catalog:
        by_cat[it["category"]] = by_cat.get(it["category"], 0) + 1
    print(f"\nWrote {len(catalog)} items -> {args.out}")
    print("by category:", by_cat)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
