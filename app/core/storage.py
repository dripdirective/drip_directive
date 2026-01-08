"""
Storage helpers for saving/removing files under the uploads directory.
"""

from __future__ import annotations

import os
from typing import Optional

import aiofiles

from app.config import settings
from app.core.utils import get_user_folder_name, get_file_extension, normalize_path


def resolve_storage_path(path: str) -> str:
    """Resolve a stored path (relative or absolute) into an absolute filesystem path."""
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
) -> str:
    """
    Save a file under a user-scoped folder (based on email prefix).

    Args:
        base_dir: e.g. settings.USER_IMAGES_DIR
        user_email: used to scope into uploads/<type>/<email_prefix>/
        content: file bytes
        filename: original filename (only used for extension if needed)
        target_filename: name to write within the user folder

    Returns:
        Normalized relative path (for storing in DB and serving via /uploads mount).
    """
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
) -> tuple[str, str]:
    """
    Save a file with an auto-generated filename (prefix + sequence + ext).

    Returns:
        (relative_path, generated_filename)
    """
    ext = get_file_extension(filename, default=default_ext)
    generated_filename = f"{name_prefix}_{sequence}{ext}"
    rel_path = await save_user_scoped_file(
        base_dir=base_dir,
        user_email=user_email,
        content=content,
        filename=filename,
        target_filename=generated_filename,
    )
    return rel_path, generated_filename


def remove_stored_file(path: str) -> None:
    """Remove a stored file (ignores missing files)."""
    abs_path = resolve_storage_path(path)
    if os.path.exists(abs_path):
        os.remove(abs_path)


