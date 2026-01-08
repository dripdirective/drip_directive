#!/usr/bin/env python3
"""
Script to check environment configuration
"""
import os
from pathlib import Path
from app.config import settings, ENV_FILE

def check_env():
    print("=" * 60)
    print("Environment Configuration Check")
    print("=" * 60)
    
    # Check if .env file exists
    env_exists = ENV_FILE.exists()
    print(f"\n✓ .env file exists: {env_exists}")
    if env_exists:
        print(f"  Location: {ENV_FILE}")
        print(f"  Size: {ENV_FILE.stat().st_size} bytes")
    else:
        print(f"  Location: {ENV_FILE}")
        print("  ⚠️  .env file not found. Using default values or environment variables.")
        print("  💡 Create .env file from .env.example for custom configuration")
    
    # Check environment variables
    print("\n" + "-" * 60)
    print("Current Configuration:")
    print("-" * 60)
    
    config_items = [
        ("SECRET_KEY", settings.SECRET_KEY[:20] + "..." if len(settings.SECRET_KEY) > 20 else settings.SECRET_KEY, "Security"),
        ("ALGORITHM", settings.ALGORITHM, "Security"),
        ("ACCESS_TOKEN_EXPIRE_MINUTES", settings.ACCESS_TOKEN_EXPIRE_MINUTES, "Security"),
        ("UPLOAD_DIR", settings.UPLOAD_DIR, "File Upload"),
        ("USER_IMAGES_DIR", settings.USER_IMAGES_DIR, "File Upload"),
        ("WARDROBE_IMAGES_DIR", settings.WARDROBE_IMAGES_DIR, "File Upload"),
        ("GENERATED_IMAGES_DIR", settings.GENERATED_IMAGES_DIR, "File Upload"),
        ("MAX_FILE_SIZE (MB)", settings.MAX_FILE_SIZE / (1024 * 1024), "File Upload"),
        ("LLM_MODEL", settings.LLM_MODEL or "Not set", "AI/LLM"),
        ("AI_PROCESSING_TIMEOUT", settings.AI_PROCESSING_TIMEOUT, "AI/LLM"),
    ]
    
    for key, value, category in config_items:
        source = "Environment Variable" if os.getenv(key) else ("File (.env)" if env_exists else "Default")
        print(f"{key:30} = {str(value):30} [{source}]")
    
    # Security warnings
    print("\n" + "-" * 60)
    print("Security Check:")
    print("-" * 60)
    
    default_keys = [
        "your-secret-key-change-this-in-production",
        "your-secret-key-change-this-in-production-use-a-random-string",
    ]
    
    if settings.SECRET_KEY in default_keys or settings.SECRET_KEY.startswith("your-secret-key"):
        print("⚠️  WARNING: Using default SECRET_KEY!")
        print("   This is insecure for production.")
        print("   Please set a strong SECRET_KEY in .env file")
        print("   Generate one: python -c \"import secrets; print(secrets.token_urlsafe(32))\"")
    else:
        print("✓ SECRET_KEY is set (not using default)")
        print(f"   Length: {len(settings.SECRET_KEY)} characters")
    
    # Check directories
    print("\n" + "-" * 60)
    print("Directory Check:")
    print("-" * 60)
    
    directories = [
        settings.UPLOAD_DIR,
        settings.USER_IMAGES_DIR,
        settings.WARDROBE_IMAGES_DIR,
        settings.GENERATED_IMAGES_DIR,
    ]
    
    for directory in directories:
        dir_path = Path(directory)
        exists = dir_path.exists()
        print(f"{directory:30} {'✓ Exists' if exists else '✗ Missing'}")
        if not exists:
            print(f"  Will be created automatically on first use")
    
    print("\n" + "=" * 60)
    print("Check complete!")
    print("=" * 60)

if __name__ == "__main__":
    check_env()

