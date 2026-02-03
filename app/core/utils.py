"""
Shared utility functions for core business logic.
"""
import io
import os
import json
from typing import Any, Optional, Tuple
from fastapi import UploadFile
from PIL import Image

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



def resize_image_bytes(content: bytes, max_dimension: int = 1024, quality: int = 85) -> bytes:
    """
    Resize image bytes to max dimension while preserving aspect ratio.
    Default max_dimension 1024 is sufficient for broad fashion analysis and highly cost-effective.
    """
    try:
        # Open image from bytes
        img = Image.open(io.BytesIO(content))
        
        # Calculate new dimensions
        width, height = img.size
        if width > max_dimension or height > max_dimension:
            if width > height:
                new_width = max_dimension
                new_height = int(height * (max_dimension / width))
            else:
                new_height = max_dimension
                new_width = int(width * (max_dimension / height))
            
            # Resize
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save back to bytes
            output = io.BytesIO()
            # Convert to RGB if saving as JPEG to avoid alpha channel issues
            format_to_save = img.format if img.format else "JPEG"
            if format_to_save == "JPEG" and img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
                
            img.save(output, format=format_to_save, quality=quality)
            return output.getvalue()
            
        return content  # Return original if no resize needed
    except Exception as e:
        print(f"⚠️ Image resize failed: {e}")
        return content  # Fallback to original on error


def normalize_path(path: str) -> str:
    """Normalize path separators for URL compatibility"""
    return path.replace('\\', '/')


def map_garment_type(garment_type: str) -> str:
    """Map AI garment type to DressType enum value"""
    if not garment_type:
        return "OTHER"
    gt = str(garment_type).strip().lower()
    # Normalize common separators and punctuation
    gt = gt.replace(" ", "_").replace("/", "_").replace("-", "_")
    while "__" in gt:
        gt = gt.replace("__", "_")
    return DRESS_TYPE_MAPPING.get(gt, DRESS_TYPE_MAPPING.get(gt.replace("_", "-"), "OTHER"))


def map_style(style: str) -> str:
    """Map AI style to DressStyle enum value"""
    if not style:
        return "OTHER"
    s = str(style).strip().lower()
    s = s.replace(" ", "_").replace("/", "_").replace("-", "_")
    while "__" in s:
        s = s.replace("__", "_")
    return STYLE_MAPPING.get(s, STYLE_MAPPING.get(s.replace("_", "-"), "OTHER"))

