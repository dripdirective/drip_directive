"""
User image business logic.
"""
import os
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session

from app.models import User, UserImage, ImageType, ProcessingStatus
from app.config import settings
from app.core.constants import DEFAULT_USER_IMAGE_TYPE, ERR_IMAGE_NOT_SAVED
from app.core.storage import save_user_scoped_file, remove_stored_file, resolve_storage_path
from app.core.utils import get_file_extension, resize_image_bytes


async def upload_user_image(
    db: Session,
    user: User,
    content: bytes,
    filename: Optional[str],
    image_type: str
) -> Tuple[bool, str, Optional[UserImage]]:
    """
    Save user image to disk and create database record.
    
    Args:
        db: Database session
        user: Current user
        content: File content bytes
        filename: Original filename
        image_type: Image type string
    
    Returns:
        Tuple of (success, error_message, user_image)
    """
    # Normalize default image_type
    if image_type is None or (isinstance(image_type, str) and image_type.strip() == ""):
        image_type = getattr(settings, "DEFAULT_USER_IMAGE_TYPE", DEFAULT_USER_IMAGE_TYPE)

    # Validate image type
    try:
        image_type_enum = ImageType(image_type)
    except ValueError:
        return False, f"Invalid image_type. Must be one of: {[e.value for e in ImageType]}", None

    # Generate filename
    # Generate filename (UUID to prevent race conditions)
    file_extension = get_file_extension(filename, default=getattr(settings, "DEFAULT_IMAGE_EXTENSION", ".jpg"))
    import uuid
    new_filename = f"user_{user.id}_{image_type_enum.value}_{uuid.uuid4().hex}{file_extension}"

    # Resize image to optimize storage and AI costs
    content = resize_image_bytes(content, max_dimension=1024)

    try:
        # Save to disk under uploads/user_images/<user>/...
        relative_path = await save_user_scoped_file(
            base_dir=settings.USER_IMAGES_DIR,
            user_email=user.email,
            content=content,
            filename=filename,
            target_filename=new_filename,
        )
        # Verify file exists (local storage only). For S3, we store a URL.
        if not (settings.USE_S3 and isinstance(relative_path, str) and relative_path.startswith("http")):
            if not os.path.exists(resolve_storage_path(relative_path)):
                return False, ERR_IMAGE_NOT_SAVED, None
    except Exception as e:
        return False, f"Failed to save file: {str(e)}", None
    
    # Create database record
    user_image = UserImage(
        user_id=user.id,
        image_type=image_type_enum,
        image_path=relative_path,
        processing_status=ProcessingStatus.PENDING
    )
    db.add(user_image)
    db.commit()
    db.refresh(user_image)
    
    return True, "", user_image


def get_user_images(db: Session, user_id: int) -> List[UserImage]:
    """Get all user images for a user"""
    images = db.query(UserImage).filter(UserImage.user_id == user_id).all()
    print(f"User {user_id}: Found {len(images)} images")
    return images


def get_user_image_by_id(db: Session, user_id: int, image_id: int) -> Optional[UserImage]:
    """Get a specific user image by ID"""
    return db.query(UserImage).filter(
        UserImage.id == image_id,
        UserImage.user_id == user_id
    ).first()


def delete_user_image(db: Session, user_id: int, image_id: int) -> Tuple[bool, str]:
    """
    Delete a user image.
    
    Returns:
        Tuple of (success, error_message)
    """
    image = get_user_image_by_id(db, user_id, image_id)
    
    if not image:
        return False, "Image not found"
    
    # Delete stored file if exists
    remove_stored_file(image.image_path)
    
    db.delete(image)
    db.commit()
    return True, ""


def get_processed_user_images(db: Session, user_id: int) -> List[UserImage]:
    """Get all processed user images for a user"""
    return db.query(UserImage).filter(
        UserImage.user_id == user_id,
        UserImage.processing_status == ProcessingStatus.COMPLETED
    ).all()


def get_pending_user_images(db: Session, user_id: int) -> List[UserImage]:
    """Get all pending user images for a user"""
    return db.query(UserImage).filter(
        UserImage.user_id == user_id,
        UserImage.processing_status == ProcessingStatus.PENDING
    ).all()


def count_pending_user_images(db: Session, user_id: int) -> int:
    """Count pending user images for a user"""
    return db.query(UserImage).filter(
        UserImage.user_id == user_id,
        UserImage.processing_status == ProcessingStatus.PENDING
    ).count()


def count_processed_user_images(db: Session, user_id: int) -> int:
    """Count processed user images for a user"""
    return db.query(UserImage).filter(
        UserImage.user_id == user_id,
        UserImage.processing_status == ProcessingStatus.COMPLETED
    ).count()

