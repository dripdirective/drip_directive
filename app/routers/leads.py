from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
import json

from app.database import get_db
from app.models import StyleDNALead
from app.schemas import StyleDNALeadCreate, StyleDNALeadResponse


router = APIRouter()


@router.post("/style-dna", response_model=StyleDNALeadResponse, status_code=status.HTTP_201_CREATED)
def capture_style_dna_lead(payload: StyleDNALeadCreate, request: Request, db: Session = Depends(get_db)):
    """
    Capture an email lead from the public Style DNA quiz (no auth required).
    Upserts by email to avoid duplicate rows.
    """
    email = (payload.email or "").strip().lower()
    scores_json = json.dumps(payload.scores) if payload.scores is not None else None
    user_agent = request.headers.get("user-agent")

    existing = db.query(StyleDNALead).filter(StyleDNALead.email == email).first()
    if existing:
        existing.archetype = payload.archetype
        existing.scores = scores_json
        existing.source = payload.source
        existing.user_agent = user_agent
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return StyleDNALeadResponse(id=existing.id, status="updated")

    lead = StyleDNALead(
        email=email,
        archetype=payload.archetype,
        scores=scores_json,
        source=payload.source,
        user_agent=user_agent,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return StyleDNALeadResponse(id=lead.id, status="created")

