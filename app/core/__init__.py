"""
Core business logic module.

This module contains the core business logic separated from the API routes.
Each submodule handles a specific domain:
- auth: Authentication and user registration
- users: User profile management
- images: User image handling
- wardrobe: Wardrobe item management
- recommendations: Outfit recommendations (with vector search)
- ai_processing: Background AI processing tasks
- vector_search: Semantic search and diversity utilities
- utils: Shared utility functions
- constants: Shared constants
- storage: File storage utilities
"""

# Utils are safe to import at module level
from app.core.utils import (
    get_user_folder_name,
    parse_json_safe,
    validate_and_read_image,
    get_file_extension,
    normalize_path,
    map_garment_type,
    map_style,
    DRESS_TYPE_MAPPING,
    STYLE_MAPPING
)

__all__ = [
    # Utils
    "get_user_folder_name",
    "parse_json_safe",
    "validate_and_read_image",
    "get_file_extension",
    "normalize_path",
    "map_garment_type",
    "map_style",
    "DRESS_TYPE_MAPPING",
    "STYLE_MAPPING",
]
