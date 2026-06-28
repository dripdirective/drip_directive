"""
Myntra catalog + virtual try-on.

Serves a curated, offline-ingested Myntra catalog (app/data/myntra_catalog.json,
produced by scripts/myntra_ingest.py) and lets users try those items on — including
layering on top of a previous result via base_image_path.
"""
import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.tryon import TryOnServiceError, generate_external_tryon
from app.database import get_db
from app.models import User
from app.utils import get_current_active_user

router = APIRouter()
logger = logging.getLogger("dripdirective.tryon")

_CATALOG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "myntra_catalog.json")
_catalog_cache: Optional[list] = None


def _load_catalog() -> list:
    global _catalog_cache
    if _catalog_cache is None:
        try:
            with open(_CATALOG_PATH, encoding="utf-8") as f:
                _catalog_cache = json.load(f)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Myntra catalog could not be loaded: %s", exc)
            _catalog_cache = []
    return _catalog_cache


@router.get("/products")
def list_products(
    category: Optional[str] = Query(None, description="tops | bottoms | one-pieces"),
    limit: int = Query(6, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
):
    """Return curated Myntra products, optionally filtered by try-on category."""
    items = _load_catalog()
    if category:
        c = category.strip().lower()
        items = [i for i in items if (i.get("category") or "").lower() == c]
    return items[:limit]


class MyntraTryOnRequest(BaseModel):
    # Optional previous try-on result to layer this garment on top of.
    base_image_path: Optional[str] = None


@router.post("/products/{product_id}/tryon")
async def tryon_product(
    product_id: str,
    request: MyntraTryOnRequest,
    x_drip_trace_id: Optional[str] = Header(default=None, alias="X-Drip-Trace-Id"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Virtually try on a Myntra catalog item (top OR bottom), with optional layering."""
    item = next((i for i in _load_catalog() if str(i.get("product_id")) == str(product_id)), None)
    if not item:
        raise HTTPException(status_code=404, detail="Myntra product not found in catalog.")
    if not item.get("image"):
        raise HTTPException(status_code=400, detail="No image available for this product.")

    try:
        result = await generate_external_tryon(
            db,
            current_user=current_user,
            garment_image_url=item["image"],
            category=item.get("category") or "tops",
            base_image_path=request.base_image_path,
            trace_id=x_drip_trace_id,
        )
    except TryOnServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    return {
        "image_path": result.get("image_path"),
        "category": result.get("category"),
        "provider": result.get("provider"),
        "product_id": product_id,
        "from_cache": result.get("from_cache"),
    }
