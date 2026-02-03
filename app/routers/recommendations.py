from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User
from app.schemas import RecommendationRequest, RecommendationResponse, ProcessingResponse, TryOnRequest, TryOnResponse
from app.utils import get_current_active_user
from app.core.recommendations import (
    generate_recommendation_task,
    get_user_recommendations,
    get_recommendation_by_id,
    get_recommendation_outfits,
    generate_tryon_for_outfit
)
from app.core.images import count_processed_user_images
from app.core.wardrobe import count_processed_wardrobe_items, count_total_wardrobe_items, get_wardrobe_items

router = APIRouter()


@router.post("/generate", response_model=ProcessingResponse)
async def generate_recommendations(
    request: RecommendationRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate AI-powered outfit recommendations based on user query"""
    print(f"\n{'='*60}")
    print(f"📥 RECOMMENDATION REQUEST RECEIVED")
    print(f"   User: {current_user.id} ({current_user.email})")
    print(f"   Query: {request.query}")
    print(f"   Type: {request.recommendation_type}")
    print(f"{'='*60}")
    
    # Check stats
    user_images_count = count_processed_user_images(db, current_user.id)
    total_wardrobe_count = count_total_wardrobe_items(db, current_user.id)
    wardrobe_items_count = count_processed_wardrobe_items(db, current_user.id)
    
    print(f"   📊 Stats: {user_images_count} processed user images, {wardrobe_items_count}/{total_wardrobe_count} processed wardrobe items")
    
    if wardrobe_items_count == 0:
        print(f"   ❌ ERROR: No processed wardrobe items found!")
        # List wardrobe items with their status for debugging
        all_items = get_wardrobe_items(db, current_user.id)
        for item in all_items:
            print(f"      - Item {item.id}: status={item.processing_status}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No processed wardrobe items found. You have {total_wardrobe_count} items but none are processed. Please process your wardrobe first."
        )
    
    # Add background task
    print(f"   ✅ Starting background task for recommendation generation...")
    background_tasks.add_task(
        generate_recommendation_task,
        current_user.id,
        request.query,
        request.recommendation_type
    )
    
    message = f"Generating recommendations from {wardrobe_items_count} wardrobe items"
    if user_images_count > 0:
        message += f" with personalized style profile"
    else:
        message += ". Tip: Process your user images for more personalized recommendations"
    
    print(f"   📤 Response: {message}")
    
    return {
        "status": "processing",
        "message": message,
        "task_id": None
    }


@router.get("/", response_model=List[RecommendationResponse])
async def get_recommendations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=10, ge=1, le=100)
):
    """Get all recommendations for the current user"""
    recommendations = get_user_recommendations(db, current_user.id, limit)
    return [RecommendationResponse.from_orm_with_outfits(rec) for rec in recommendations]


@router.get("/{recommendation_id}", response_model=RecommendationResponse)
async def get_recommendation(
    recommendation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific recommendation with full details"""
    recommendation = get_recommendation_by_id(db, current_user.id, recommendation_id)
    
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    return RecommendationResponse.from_orm_with_outfits(recommendation)


@router.get("/{recommendation_id}/outfits")
async def get_outfits(
    recommendation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed outfit information for a recommendation including wardrobe item images"""
    recommendation = get_recommendation_by_id(db, current_user.id, recommendation_id)
    
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    return get_recommendation_outfits(db, current_user.id, recommendation)


@router.post("/{recommendation_id}/tryon", response_model=TryOnResponse)
async def generate_tryon_image(
    recommendation_id: int,
    request: TryOnRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Generate a virtual try-on image for a specific outfit in a recommendation"""
    recommendation = get_recommendation_by_id(db, current_user.id, recommendation_id)
    
    if not recommendation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    success, error, image_path = await generate_tryon_for_outfit(
        db,
        current_user.id,
        recommendation,
        request.outfit_index
    )
    
    if not success:
        if "Invalid outfit index" in error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
        elif "No processed user image" in error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error
            )
    
    return {
        "image_path": image_path,
        "outfit_index": request.outfit_index
    }
