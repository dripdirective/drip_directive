from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User
from app.schemas import WardrobeItemResponse, WardrobeItemWithImages, WardrobeImageResponse
from app.utils import get_current_active_user
from app.config import settings
from app.core.wardrobe import (
    upload_wardrobe_item,
    get_wardrobe_items,
    get_wardrobe_item_by_id,
    get_wardrobe_images,
    delete_wardrobe_item
)
from app.core.storage import public_file_url
from app.core.utils import validate_and_read_image

router = APIRouter()


@router.post("/upload", response_model=WardrobeItemResponse, status_code=status.HTTP_201_CREATED)
async def upload_wardrobe_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload wardrobe image (may contain single or multiple dresses)"""
    # Validate and read the image
    is_valid, error, content = await validate_and_read_image(file, settings.MAX_FILE_SIZE)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Upload the wardrobe item
    success, error, wardrobe_item = await upload_wardrobe_item(
        db,
        current_user,
        content,
        file.filename
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )
    
    return wardrobe_item


@router.get("/items", response_model=List[WardrobeItemWithImages])
async def get_items(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all wardrobe items with their images"""
    items = get_wardrobe_items(db, current_user.id)
    result = []
    for item in items:
        images = get_wardrobe_images(db, item.id)
        item_data = WardrobeItemWithImages.model_validate(item)
        img_models = []
        for img in images:
            img_data = WardrobeImageResponse.model_validate(img)
            img_data.image_path = public_file_url(img_data.image_path)
            img_models.append(img_data)
        item_data.images = img_models
        result.append(item_data)
    return result


@router.get("/items/{item_id}", response_model=WardrobeItemWithImages)
async def get_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific wardrobe item with images"""
    item = get_wardrobe_item_by_id(db, current_user.id, item_id)
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wardrobe item not found"
        )
    
    images = get_wardrobe_images(db, item.id)
    item_data = WardrobeItemWithImages.model_validate(item)
    img_models = []
    for img in images:
        img_data = WardrobeImageResponse.model_validate(img)
        img_data.image_path = public_file_url(img_data.image_path)
        img_models.append(img_data)
    item_data.images = img_models
    return item_data


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a wardrobe item and its images"""
    success, error = delete_wardrobe_item(db, current_user.id, item_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error
        )
    
    return None
