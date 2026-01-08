"""
Centralized constants for core business logic.

Keep non-secret defaults here (or in Settings) so routers/services don't hardcode
magic strings and numbers all over the codebase.
"""

from __future__ import annotations

from typing import Final

# Upload / file handling
IMAGE_CONTENT_TYPE_PREFIX: Final[str] = "image/"

# Default values (prefer Settings overrides when available)
DEFAULT_USER_IMAGE_TYPE: Final[str] = "user_image"
DEFAULT_IMAGE_EXTENSION: Final[str] = ".jpg"

# Error messages
ERR_FILE_NOT_IMAGE: Final[str] = "File must be an image"
ERR_IMAGE_NOT_SAVED: Final[str] = "File was not saved to disk"

# AI → enum mapping dictionaries
DRESS_TYPE_MAPPING: Final[dict[str, str]] = {
    "shirt": "SHIRT",
    "t-shirt": "T_SHIRT",
    "t_shirt": "T_SHIRT",
    "pants": "PANTS",
    "jeans": "JEANS",
    "shorts": "SHORTS",
    "dress": "DRESS",
    "skirt": "SKIRT",
    "jacket": "JACKET",
    "coat": "COAT",
    "suit": "SUIT",
    "blazer": "BLAZER",
    "sweater": "SWEATER",
    "hoodie": "HOODIE",
}

STYLE_MAPPING: Final[dict[str, str]] = {
    "casual": "CASUAL",
    "formal": "FORMAL",
    "business": "BUSINESS",
    "sporty": "SPORTY",
    "elegant": "ELEGANT",
    "bohemian": "BOHEMIAN",
    "vintage": "VINTAGE",
    "modern": "MODERN",
    "classic": "CLASSIC",
}


