"""
Shared utility functions for core business logic.
"""
import json
import os
from typing import Any, Optional, Tuple
from fastapi import UploadFile

from app.core.constants import (
    DEFAULT_IMAGE_EXTENSION,
    ERR_FILE_NOT_IMAGE,
    IMAGE_CONTENT_TYPE_PREFIX,
    DRESS_TYPE_MAPPING,
    STYLE_MAPPING,
)

def get_user_folder_name(email: str) -> str:
    """Extract folder name from email (part before @)"""
    return email.split('@')[0] if '@' in email else email


def parse_json_safe(json_string: Optional[str], default: Any = None) -> Any:
    """Safely parse JSON string, returning default on failure"""
    if not json_string:
        return default if default is not None else {}
    try:
        return json.loads(json_string)
    except json.JSONDecodeError:
        return default if default is not None else {}


async def validate_and_read_image(file: UploadFile, max_size: int) -> Tuple[bool, str, Optional[bytes]]:
    """
    Validate and read an uploaded image file.
    
    Returns:
        Tuple of (is_valid, error_message, file_content)
    """
    # Check content type
    if not file.content_type or not file.content_type.startswith(IMAGE_CONTENT_TYPE_PREFIX):
        return False, ERR_FILE_NOT_IMAGE, None
    
    # Read content
    content = await file.read()
    
    # Check size
    if len(content) > max_size:
        max_mb = max_size / (1024 * 1024)
        return False, f"File size exceeds maximum allowed size of {max_mb:.0f}MB", None
    
    return True, "", content


def get_file_extension(filename: Optional[str], default: str = DEFAULT_IMAGE_EXTENSION) -> str:
    """Get file extension from filename"""
    if not filename:
        return default
    ext = os.path.splitext(filename)[1]
    return ext if ext else default


def normalize_path(path: str) -> str:
    """Normalize path separators for URL compatibility"""
    return path.replace('\\', '/')


def map_garment_type(garment_type: str) -> str:
    """Map AI garment type to DressType enum value"""
    return DRESS_TYPE_MAPPING.get(garment_type.lower(), "OTHER")


def map_style(style: str) -> str:
    """Map AI style to DressStyle enum value"""
    return STYLE_MAPPING.get(style.lower(), "OTHER")

