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
    "button_down": "SHIRT",
    "button-down": "SHIRT",
    "dress_shirt": "SHIRT",
    "dress-shirt": "SHIRT",
    "polo": "SHIRT",
    "polo_shirt": "SHIRT",
    "polo-shirt": "SHIRT",
    "top": "SHIRT",
    "blouse": "SHIRT",
    "kurta": "SHIRT",
    "kurti": "SHIRT",
    "tunic": "SHIRT",
    "t-shirt": "T_SHIRT",
    "t_shirt": "T_SHIRT",
    "tshirt": "T_SHIRT",
    "tee": "T_SHIRT",
    "tank": "T_SHIRT",
    "tank_top": "T_SHIRT",
    "tank-top": "T_SHIRT",
    "pants": "PANTS",
    "trousers": "PANTS",
    "slacks": "PANTS",
    "chinos": "PANTS",
    "joggers": "PANTS",
    "track_pants": "PANTS",
    "track-pants": "PANTS",
    "leggings": "PANTS",
    "jeans": "JEANS",
    "denim": "JEANS",
    "shorts": "SHORTS",
    "bermuda": "SHORTS",
    "dress": "DRESS",
    "gown": "DRESS",
    "jumpsuit": "DRESS",
    "romper": "DRESS",
    "saree": "DRESS",
    "sari": "DRESS",
    "salwar_kameez": "DRESS",
    "salwar-kameez": "DRESS",
    "suit_set": "DRESS",
    "suit-set": "DRESS",
    "skirt": "SKIRT",
    "lehenga": "SKIRT",
    "lehenga_skirt": "SKIRT",
    "lehenga-skirt": "SKIRT",
    "jacket": "JACKET",
    "bomber": "JACKET",
    "denim_jacket": "JACKET",
    "denim-jacket": "JACKET",
    "coat": "COAT",
    "overcoat": "COAT",
    "trench": "COAT",
    "suit": "SUIT",
    "tuxedo": "SUIT",
    "blazer": "BLAZER",
    "blazer": "BLAZER",
    "sweater": "SWEATER",
    "cardigan": "SWEATER",
    "pullover": "SWEATER",
    "hoodie": "HOODIE",
    "sweatshirt": "HOODIE",
}

STYLE_MAPPING: Final[dict[str, str]] = {
    "casual": "CASUAL",
    "smart_casual": "CASUAL",
    "smart-casual": "CASUAL",
    "streetwear": "CASUAL",
    "loungewear": "CASUAL",
    "formal": "FORMAL",
    "black_tie": "FORMAL",
    "black-tie": "FORMAL",
    "business": "BUSINESS",
    "business_casual": "BUSINESS",
    "business-casual": "BUSINESS",
    "work": "BUSINESS",
    "sporty": "SPORTY",
    "athleisure": "SPORTY",
    "gym": "SPORTY",
    "elegant": "ELEGANT",
    "chic": "ELEGANT",
    "glam": "ELEGANT",
    "bohemian": "BOHEMIAN",
    "boho": "BOHEMIAN",
    "vintage": "VINTAGE",
    "modern": "MODERN",
    "minimalist": "MODERN",
    "classic": "CLASSIC",
    "preppy": "CLASSIC",
}


