"""
Script to run the FastAPI application
"""
import uvicorn
import sys
import os
from pathlib import Path
from app.config import settings

# Check if .env file exists and warn if using defaults
env_file = Path(".env")
if not env_file.exists():
    print("⚠️  Note: .env file not found. Using default configuration.")
    print("   Create .env from .env.example for custom settings.")
    print("   Run 'python check_env.py' to verify configuration.\n")

if __name__ == "__main__":
    try:
        is_prod = (settings.ENVIRONMENT or "development").lower() in {"prod", "production"}
        uvicorn.run(
            "app.main:app",
            host=os.getenv("BACKEND_HOST", "0.0.0.0"),
            port=int(os.getenv("BACKEND_PORT", "8000")),
            reload=not is_prod,
            log_level=(settings.LOG_LEVEL or "info").lower(),
        )
    except KeyboardInterrupt:
        print("\n✓ Server stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Error starting server: {e}")
        sys.exit(1)

