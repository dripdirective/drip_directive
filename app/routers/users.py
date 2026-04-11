from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ProcessingStatus, Recommendation, User, UserImage, UserProfile, WardrobeItem
from app.schemas import (
    UserProfileCreate,
    UserProfileUpdate,
    UserProfileResponse,
    WorkspaceLatestRecommendation,
    WorkspaceStyleSnapshot,
    WorkspaceSummaryResponse,
)
from app.utils import get_current_active_user
from app.core.users import (
    get_user_profile,
    create_user_profile,
    update_user_profile,
    profile_exists
)
from app.core.utils import parse_json_safe

from typing import Optional

router = APIRouter()


def _compute_profile_completion(profile: Optional[UserProfile]) -> int:
    if not profile:
        return 0

    additional_info = parse_json_safe(profile.additional_info) if profile.additional_info else {}
    style_text = ""
    if isinstance(additional_info, dict):
        style_text = (
            additional_info.get("user_style_preferences")
            or additional_info.get("style_preferences")
            or additional_info.get("user_notes")
            or additional_info.get("additional_notes")
            or ""
        )

    fields = [
        profile.name,
        profile.gender,
        profile.age,
        profile.occupation,
        profile.country,
        profile.state,
        profile.body_type,
        profile.face_tone,
        style_text,
    ]
    completed = len([field for field in fields if field])
    return round((completed / len(fields)) * 100)


def _extract_style_snapshot(profile: Optional[UserProfile]) -> Optional[WorkspaceStyleSnapshot]:
    if not profile or not profile.additional_info:
        return None

    parsed = parse_json_safe(profile.additional_info)
    if not isinstance(parsed, dict):
        return None

    ai_profile = parsed.get("ai_profile_analysis", {})
    analysis = ai_profile.get("analysis", {}) if isinstance(ai_profile, dict) else {}
    style_assessment = analysis.get("style_assessment", {}) if isinstance(analysis, dict) else {}

    if not isinstance(style_assessment, dict):
        return None

    notes = style_assessment.get("style_notes")
    cleaned_notes = None
    if notes:
        cleaned_notes = " ".join(
            str(notes).replace("•", "\n").splitlines()
        ).strip()
        cleaned_notes = " ".join(cleaned_notes.split()) or None

    return WorkspaceStyleSnapshot(
        recommended_colors=[
            str(color)
            for color in (style_assessment.get("recommended_colors") or [])
            if color
        ][:6],
        recommended_styles=[
            str(style)
            for style in (style_assessment.get("recommended_styles") or [])
            if style
        ][:6],
        notes=cleaned_notes,
    )


def _build_latest_recommendation(rec: Optional[Recommendation]) -> Optional[WorkspaceLatestRecommendation]:
    if not rec:
        return None

    metadata = parse_json_safe(rec.ai_metadata)
    outfits = metadata.get("recommended_outfits", []) if isinstance(metadata, dict) else []
    status = "completed" if rec.ai_metadata else "processing"

    return WorkspaceLatestRecommendation(
        id=rec.id,
        query=rec.query,
        created_at=rec.created_at,
        status=status,
        outfit_count=len(outfits) if isinstance(outfits, list) else 0,
    )


@router.get("/profile", response_model=Optional[UserProfileResponse])
async def get_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user profile"""
    profile = get_user_profile(db, current_user.id)
    if not profile:
        return None
    return profile


@router.get("/workspace-summary", response_model=WorkspaceSummaryResponse)
async def get_workspace_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Return the compact workspace state used by the web dashboard."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    user_images = db.query(UserImage).filter(UserImage.user_id == current_user.id)
    wardrobe_items = db.query(WardrobeItem).filter(WardrobeItem.user_id == current_user.id)
    latest_recommendation = (
        db.query(Recommendation)
        .filter(Recommendation.user_id == current_user.id)
        .order_by(Recommendation.created_at.desc(), Recommendation.id.desc())
        .first()
    )

    user_images_total = user_images.count()
    user_images_processed = user_images.filter(UserImage.processing_status == ProcessingStatus.COMPLETED).count()
    wardrobe_items_total = wardrobe_items.count()
    wardrobe_items_processed = wardrobe_items.filter(
        WardrobeItem.processing_status == ProcessingStatus.COMPLETED
    ).count()
    recommendations_total = db.query(Recommendation).filter(Recommendation.user_id == current_user.id).count()

    return WorkspaceSummaryResponse(
        profile_exists=profile is not None,
        profile_completion=_compute_profile_completion(profile),
        user_images_total=user_images_total,
        user_images_processed=user_images_processed,
        wardrobe_items_total=wardrobe_items_total,
        wardrobe_items_processed=wardrobe_items_processed,
        recommendations_total=recommendations_total,
        style_snapshot=_extract_style_snapshot(profile),
        latest_recommendation=_build_latest_recommendation(latest_recommendation),
    )


@router.post("/profile", response_model=UserProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_data: UserProfileCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create user profile"""
    if profile_exists(db, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists. Use PUT to update."
        )
    
    new_profile = create_user_profile(
        db,
        current_user.id,
        profile_data.model_dump(exclude_unset=True)
    )
    return new_profile


@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    profile = update_user_profile(
        db,
        current_user.id,
        profile_data.model_dump(exclude_unset=True)
    )
    return profile
