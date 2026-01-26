"""
Storage helpers for saving/removing files under the uploads directory or S3.
Automatically switches between local and S3 storage based on settings.USE_S3.
"""

from __future__ import annotations

import os
import io
from typing import Optional
import logging

import aiofiles
from fastapi import UploadFile

from app.config import settings
from app.core.utils import get_user_folder_name, get_file_extension, normalize_path

logger = logging.getLogger(__name__)

# Initialize S3 storage if enabled
_s3_storage = None
if settings.USE_S3:
    try:
        from app.core.s3_storage import storage as s3_storage
        _s3_storage = s3_storage
        logger.info("✅ S3 storage enabled")
    except Exception as e:
        logger.warning(f"⚠️ Failed to initialize S3 storage: {e}. Falling back to local storage.")


def resolve_storage_path(path: str) -> str:
    """Resolve a stored path (relative or absolute) into an absolute filesystem path."""
    # If using S3, path is already a URL
    if settings.USE_S3 and path.startswith('https://'):
        return path
    
    if os.path.isabs(path):
        return path
    # Stored paths are relative to project BASE_DIR
    return os.path.join(str(settings.BASE_DIR), path)


async def save_user_scoped_file(
    *,
    base_dir: str,
    user_email: str,
    content: bytes,
    filename: Optional[str],
    target_filename: str,
    user_id: Optional[int] = None,
) -> str:
    """
    Save a file under a user-scoped folder (based on email prefix).
    Automatically uses S3 if enabled, otherwise saves locally.

    Args:
        base_dir: e.g. settings.USER_IMAGES_DIR
        user_email: used to scope into uploads/<type>/<email_prefix>/
        content: file bytes
        filename: original filename (only used for extension if needed)
        target_filename: name to write within the user folder
        user_id: optional user ID for S3 organization

    Returns:
        URL (if S3) or normalized relative path (if local) for storing in DB.
    """
    if settings.USE_S3 and _s3_storage:
        # Use S3 storage
        # Extract folder type from base_dir (e.g., "uploads/user_images" -> "user_images")
        folder = base_dir.split('/')[-1] if '/' in base_dir else base_dir
        
        # Create a mock UploadFile from bytes
        file_obj = UploadFile(
            file=io.BytesIO(content),
            filename=filename or target_filename
        )
        
        # Determine user_id if not provided
        if user_id is None:
            # Try to extract from filename pattern (e.g., "user_123_front_1.jpg")
            try:
                if target_filename.startswith('user_'):
                    user_id = int(target_filename.split('_')[1])
            except:
                user_id = 0  # Fallback
        
        url = await _s3_storage.upload_file(
            file=file_obj,
            folder=folder,
            user_id=user_id,
            filename=target_filename
        )
        logger.info(f"✅ Saved to S3: {url}")
        return url
    else:
        # Use local storage
        user_folder_name = get_user_folder_name(user_email)
        user_folder = os.path.join(base_dir, user_folder_name)
        os.makedirs(user_folder, exist_ok=True)

        file_path = os.path.join(user_folder, target_filename)
        async with aiofiles.open(file_path, "wb") as out_file:
            await out_file.write(content)

        return normalize_path(file_path)


async def save_user_scoped_auto_filename(
    *,
    base_dir: str,
    user_email: str,
    content: bytes,
    filename: Optional[str],
    name_prefix: str,
    sequence: int,
    default_ext: str = ".jpg",
    user_id: Optional[int] = None,
) -> tuple[str, str]:
    """
    Save a file with an auto-generated filename (prefix + sequence + ext).

    Returns:
        (path_or_url, generated_filename)
    """
    ext = get_file_extension(filename, default=default_ext)
    generated_filename = f"{name_prefix}_{sequence}{ext}"
    rel_path = await save_user_scoped_file(
        base_dir=base_dir,
        user_email=user_email,
        content=content,
        filename=filename,
        target_filename=generated_filename,
        user_id=user_id,
    )
    return rel_path, generated_filename


def remove_stored_file(path: str) -> None:
    """Remove a stored file (ignores missing files). Works with both S3 and local."""
    if settings.USE_S3 and _s3_storage and path.startswith('https://'):
        # Delete from S3
        try:
            _s3_storage.delete_file(path)
            logger.info(f"✅ Deleted from S3: {path}")
        except Exception as e:
            logger.warning(f"⚠️ Failed to delete from S3: {e}")
    else:
        # Delete from local storage
        abs_path = resolve_storage_path(path)
        if os.path.exists(abs_path):
            os.remove(abs_path)
            logger.info(f"✅ Deleted locally: {abs_path}")


def public_file_url(path: str) -> str:
    """
    Return a frontend-loadable URL for a stored file.

    - Local storage: returns the stored relative path unchanged.
    - S3 storage:
        - If S3_PRESIGN_URLS=true, returns a temporary presigned URL (for private buckets).
        - Otherwise returns the stored URL (CloudFront or S3 URL).
    """
    if not path:
        return path

    if settings.USE_S3 and _s3_storage and isinstance(path, str) and path.startswith("http"):
        if getattr(settings, "S3_PRESIGN_URLS", False):
            try:
                expires = int(getattr(settings, "S3_PRESIGN_EXPIRES_SECONDS", 3600))
                return _s3_storage.get_presigned_url(path, expiration=expires) or path
            except Exception:
                return path
        return path

    return path


