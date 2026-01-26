from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User
from app.schemas import UserImageResponse
from app.utils import get_current_active_user
from app.config import settings
from app.core.images import (
    upload_user_image,
    get_user_images,
    get_user_image_by_id,
    delete_user_image
)
from app.core.storage import public_file_url
from app.core.utils import validate_and_read_image
from app.core.constants import DEFAULT_USER_IMAGE_TYPE

router = APIRouter()


@router.post("/upload", response_model=UserImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    image_type: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload user image"""
    # Validate and read the image
    is_valid, error, content = await validate_and_read_image(file, settings.MAX_FILE_SIZE)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    # Use default if image_type is not provided or empty
    if image_type is None or (isinstance(image_type, str) and image_type.strip() == ""):
        image_type = getattr(settings, "DEFAULT_USER_IMAGE_TYPE", DEFAULT_USER_IMAGE_TYPE)
    
    # Upload the image
    success, error, user_image = await upload_user_image(
        db,
        current_user,
        content,
        file.filename,
        image_type
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST if "Invalid" in error else status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error
        )

    data = UserImageResponse.model_validate(user_image).model_dump()
    data["image_path"] = public_file_url(data.get("image_path", ""))
    return data


@router.get("/", response_model=List[UserImageResponse])
async def get_images(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all user images"""
    images = get_user_images(db, current_user.id)
    result = []
    for img in images:
        data = UserImageResponse.model_validate(img).model_dump()
        data["image_path"] = public_file_url(data.get("image_path", ""))
        result.append(data)
    return result


@router.get("/{image_id}", response_model=UserImageResponse)
async def get_image(
    image_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific user image"""
    image = get_user_image_by_id(db, current_user.id, image_id)
    
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )

    data = UserImageResponse.model_validate(image).model_dump()
    data["image_path"] = public_file_url(data.get("image_path", ""))
    return data


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    image_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a user image"""
    success, error = delete_user_image(db, current_user.id, image_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error
        )
    
    return None
