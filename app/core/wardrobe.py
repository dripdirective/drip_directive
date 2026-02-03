"""
Wardrobe business logic.
"""
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session

from app.models import User, WardrobeItem, WardrobeImage, ProcessingStatus
from app.config import settings
from app.core.storage import save_user_scoped_file, remove_stored_file
from app.core.utils import get_file_extension, resize_image_bytes


async def upload_wardrobe_item(
    db: Session,
    user: User,
    content: bytes,
    filename: Optional[str]
) -> Tuple[bool, str, Optional[WardrobeItem]]:
    """
    Save wardrobe image to disk and create database records.
    
    Args:
        db: Database session
        user: Current user
        content: File content bytes
        filename: Original filename
    
    Returns:
        Tuple of (success, error_message, wardrobe_item)
    """
    # Generate filename
    # Generate filename (UUID to prevent race conditions)
    file_extension = get_file_extension(filename, default=getattr(settings, "DEFAULT_IMAGE_EXTENSION", ".jpg"))
    import uuid
    new_filename = f"user_{user.id}_wardrobe_{uuid.uuid4().hex}{file_extension}"
    
    # Calculate original file size for duplicate detection
    file_size = len(content)
    
    # Check if image already exists (Filename + Size check)
    # CRITICAL: Scope check to THIS user only
    if filename:
        existing_image = db.query(WardrobeImage).join(WardrobeItem).filter(
            WardrobeItem.user_id == user.id,
            WardrobeImage.original_filename == filename,
            WardrobeImage.file_size == file_size
        ).first()
        
        if existing_image:
            print(f"   ⚠️ Duplicate image detected (name={filename}, size={file_size}). Returning existing item {existing_image.wardrobe_item_id}.")
            existing_item = get_wardrobe_item_by_id(db, user.id, existing_image.wardrobe_item_id)
            return True, "Duplicate image detected", existing_item

    # Resize image to optimize storage and AI costs
    content = resize_image_bytes(content, max_dimension=1024)
    
    try:
        relative_path = await save_user_scoped_file(
            base_dir=settings.WARDROBE_IMAGES_DIR,
            user_email=user.email,
            content=content,
            filename=filename,
            target_filename=new_filename,
        )
    except Exception as e:
        return False, f"Failed to save file: {str(e)}", None
    
    # Create wardrobe item
    wardrobe_item = WardrobeItem(
        user_id=user.id,
        processing_status=ProcessingStatus.PENDING
    )
    db.add(wardrobe_item)
    db.flush()
    
    # Create wardrobe image record
    wardrobe_image = WardrobeImage(
        wardrobe_item_id=wardrobe_item.id,
        image_path=relative_path,
        is_original=True,
        original_filename=filename,
        file_size=file_size
    )
    db.add(wardrobe_image)
    db.commit()
    db.refresh(wardrobe_item)
    
    return True, "", wardrobe_item


def get_wardrobe_items(db: Session, user_id: int) -> List[WardrobeItem]:
    """Get all wardrobe items for a user"""
    return db.query(WardrobeItem).filter(WardrobeItem.user_id == user_id).all()


def get_wardrobe_item_by_id(db: Session, user_id: int, item_id: int) -> Optional[WardrobeItem]:
    """Get a specific wardrobe item by ID"""
    return db.query(WardrobeItem).filter(
        WardrobeItem.id == item_id,
        WardrobeItem.user_id == user_id
    ).first()


def get_wardrobe_images(db: Session, wardrobe_item_id: int) -> List[WardrobeImage]:
    """Get all images for a wardrobe item"""
    return db.query(WardrobeImage).filter(
        WardrobeImage.wardrobe_item_id == wardrobe_item_id
    ).all()


def get_original_wardrobe_images(db: Session, wardrobe_item_id: int) -> List[WardrobeImage]:
    """Get original images for a wardrobe item"""
    return db.query(WardrobeImage).filter(
        WardrobeImage.wardrobe_item_id == wardrobe_item_id,
        WardrobeImage.is_original == True
    ).all()


def delete_wardrobe_item(db: Session, user_id: int, item_id: int) -> Tuple[bool, str]:
    """
    Delete a wardrobe item and its images.
    
    Returns:
        Tuple of (success, error_message)
    """
    item = get_wardrobe_item_by_id(db, user_id, item_id)
    
    if not item:
        return False, "Wardrobe item not found"
    
    # Delete associated images and files
    images = get_wardrobe_images(db, item.id)
    for image in images:
        remove_stored_file(image.image_path)
        db.delete(image)
    
    db.delete(item)
    db.commit()
    return True, ""


def get_processed_wardrobe_items(db: Session, user_id: int) -> List[WardrobeItem]:
    """Get all processed wardrobe items for a user"""
    return db.query(WardrobeItem).filter(
        WardrobeItem.user_id == user_id,
        WardrobeItem.processing_status == ProcessingStatus.COMPLETED
    ).all()


def get_pending_wardrobe_items(db: Session, user_id: int) -> List[WardrobeItem]:
    """Get all pending wardrobe items for a user"""
    return db.query(WardrobeItem).filter(
        WardrobeItem.user_id == user_id,
        WardrobeItem.processing_status == ProcessingStatus.PENDING
    ).all()


def count_processed_wardrobe_items(db: Session, user_id: int) -> int:
    """Count processed wardrobe items for a user"""
    return db.query(WardrobeItem).filter(
        WardrobeItem.user_id == user_id,
        WardrobeItem.processing_status == ProcessingStatus.COMPLETED
    ).count()


def count_total_wardrobe_items(db: Session, user_id: int) -> int:
    """Count total wardrobe items for a user"""
    return db.query(WardrobeItem).filter(
        WardrobeItem.user_id == user_id
    ).count()

