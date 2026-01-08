import logging
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings

# Get the base directory (project root)
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"  # development | production
    LOG_LEVEL: str = "INFO"

    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    OAUTH_TOKEN_URL: str = "api/auth/login"

    # Database
    DATABASE_URL: str = "sqlite:///./style_me.db"

    # CORS
    # Comma-separated list of allowed origins, or "*" to allow all (NOT recommended for production).
    # Example:
    # CORS_ALLOW_ORIGINS=http://localhost:19006,http://localhost:3000,https://app.example.com
    CORS_ALLOW_ORIGINS: str = (
        "http://localhost:8081,"
        "http://127.0.0.1:8081,"
        "http://localhost:19006,"
        "http://127.0.0.1:19006,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )

    # File Upload
    UPLOAD_DIR: str = "uploads"
    USER_IMAGES_DIR: str = "uploads/user_images"
    WARDROBE_IMAGES_DIR: str = "uploads/wardrobe_images"
    GENERATED_IMAGES_DIR: str = "uploads/generated"
    TRYON_IMAGES_DIR: str = "uploads/tryon_images"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    DEFAULT_USER_IMAGE_TYPE: str = "user_image"
    DEFAULT_IMAGE_EXTENSION: str = ".jpg"

    # AI/LLM Configuration
    # Provider: "google" or "openai"
    LLM_PROVIDER: str = "google"
    
    # API Keys (set the one for your chosen provider)
    GOOGLE_API_KEY: Optional[str] = None  # https://aistudio.google.com/apikey
    OPENAI_API_KEY: Optional[str] = None  # https://platform.openai.com/api-keys
    
    # Models - cheap and effective options:
    # Google: gemini-2.0-flash (text), gemini-2.0-flash-exp (image)
    # OpenAI: gpt-4o-mini (text+vision), dall-e-3 (image generation)
    LLM_MODEL: str = "gemini-2.0-flash"
    IMAGE_MODEL: str = "gemini-2.0-flash-exp"
    
    # Legacy (for backwards compatibility)
    TRYON_MODEL: str = "gemini-2.0-flash-exp"
    
    AI_PROCESSING_TIMEOUT: int = 300  # 5 minutes
    MAX_RECOMMENDATION_WARDROBE_ITEMS: int = 20
    
    # Vector Store Configuration
    VECTOR_STORE: str = "chromadb"  # Options: "chromadb" (local), "pgvector" (production), "none" (disabled)
    CHROMADB_PATH: str = "./chroma_data"  # Path for ChromaDB storage (local only)
    CHROMADB_COLLECTION_PREFIX: str = "drip_directive"  # Prefix for ChromaDB collections
    
    # Base directory for absolute path resolution
    BASE_DIR: str = str(BASE_DIR)

    def parsed_cors_allow_origins(self) -> list[str]:
        raw = (self.CORS_ALLOW_ORIGINS or "").strip()
        if not raw:
            return []
        if raw == "*":
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    class Config:
        env_file = str(ENV_FILE) if ENV_FILE.exists() else None
        env_file_encoding = "utf-8"
        case_sensitive = True
        # Allow reading from environment variables even if .env doesn't exist
        extra = "ignore"


# Create settings instance
settings = Settings()

_default_secret_key_prefixes = ("your-secret-key",)
_default_secret_key_values = {
    "your-secret-key-change-this-in-production",
    "your-secret-key-change-this-in-production-use-a-random-string",
}

_env = (settings.ENVIRONMENT or "development").lower()
_using_default_secret = (
    settings.SECRET_KEY in _default_secret_key_values
    or settings.SECRET_KEY.startswith(_default_secret_key_prefixes)
)

if _using_default_secret:
    msg = (
        "SECURITY WARNING: Using default SECRET_KEY. "
        "Set SECRET_KEY to a strong random value for production."
    )
    if _env in {"prod", "production"}:
        raise RuntimeError(msg)
    logger.warning(msg)

