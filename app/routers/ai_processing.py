from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, ProcessingStatus
from app.schemas import ProcessingResponse
from app.utils import get_current_active_user
from app.core.ai_processing import process_user_images_task, process_wardrobe_images_task
from app.core.images import count_pending_user_images
from app.core.wardrobe import (
    get_wardrobe_item_by_id,
    get_pending_wardrobe_items
)

router = APIRouter()


@router.post("/process-user-images", response_model=ProcessingResponse)
async def trigger_user_image_processing(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Trigger AI processing for user images"""
    pending_images = count_pending_user_images(db, current_user.id)
    
    if pending_images == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending images to process"
        )
    
    # Add background task
    background_tasks.add_task(process_user_images_task, current_user.id)
    
    return {
        "status": "processing",
        "message": f"Processing {pending_images} user image(s)",
        "task_id": None
    }


@router.post("/process-wardrobe/{wardrobe_item_id}", response_model=ProcessingResponse)
async def trigger_wardrobe_processing(
    wardrobe_item_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Trigger AI processing for a wardrobe item"""
    wardrobe_item = get_wardrobe_item_by_id(db, current_user.id, wardrobe_item_id)
    
    if not wardrobe_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wardrobe item not found"
        )
    
    if wardrobe_item.processing_status == ProcessingStatus.PROCESSING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wardrobe item is already being processed"
        )
    
    # Add background task
    background_tasks.add_task(process_wardrobe_images_task, wardrobe_item_id)
    
    return {
        "status": "processing",
        "message": f"Processing wardrobe item {wardrobe_item_id}",
        "task_id": None
    }


@router.post("/process-all-wardrobe", response_model=ProcessingResponse)
async def trigger_all_wardrobe_processing(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Trigger AI processing for all pending wardrobe items"""
    pending_items = get_pending_wardrobe_items(db, current_user.id)
    
    if not pending_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending wardrobe items to process"
        )
    
    # Add background tasks for each item
    for item in pending_items:
        background_tasks.add_task(process_wardrobe_images_task, item.id)
    
    return {
        "status": "processing",
        "message": f"Processing {len(pending_items)} wardrobe item(s)",
        "task_id": None
    }
