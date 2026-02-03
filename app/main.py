import logging

from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db
from app.routers import auth, users, images, wardrobe, ai_processing, recommendations
from app.config import settings
from app.core.vector_store import get_vector_store
from app.middleware.validation import setup_validation
from app.middleware.rate_limit import setup_rate_limiting
import os

app = FastAPI(title="Dripdirective API", version="1.0.0")

logger = logging.getLogger("dripdirective")

@app.on_event("startup")
def on_startup() -> None:
    # Create database tables (checkfirst=True prevents race condition with multiple workers)
    Base.metadata.create_all(bind=engine, checkfirst=True)

    # Lightweight migration for existing DBs (SQLite-safe): add user_profiles.gender if missing
    try:
        insp = inspect(engine)
        if "user_profiles" in insp.get_table_names():
            cols = {c["name"] for c in insp.get_columns("user_profiles")}
            if "gender" not in cols:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE user_profiles ADD COLUMN gender VARCHAR"))
                print("✅ DB migration: added user_profiles.gender")
    except Exception as e:
        # Non-fatal; in production use Alembic migrations instead
        print(f"⚠️ DB migration skipped/failed: {e}")

    # Ensure upload directories exist
    os.makedirs(settings.USER_IMAGES_DIR, exist_ok=True)
    os.makedirs(settings.WARDROBE_IMAGES_DIR, exist_ok=True)
    os.makedirs(settings.GENERATED_IMAGES_DIR, exist_ok=True)
    os.makedirs(getattr(settings, "TRYON_IMAGES_DIR", "uploads/tryon_images"), exist_ok=True)

    # Initialize vector store (ChromaDB/pgvector)
    try:
        get_vector_store()
    except Exception as e:
        print(f"⚠️ Vector store initialization failed: {e}")

    # Log effective CORS configuration (helps debug preflight failures)
    print(f"✅ CORS allow_origins={settings.parsed_cors_allow_origins()}")


@app.middleware("http")
async def cors_debug_middleware(request: Request, call_next):
    """
    Debug helper for CORS issues.
    If an OPTIONS preflight gets rejected (400), log request Origin and preflight headers.
    """
    origin = request.headers.get("origin")
    acrm = request.headers.get("access-control-request-method")
    acrh = request.headers.get("access-control-request-headers")

    response = await call_next(request)

    if request.method == "OPTIONS" and response.status_code == 400:
        print(
            f"❌ CORS preflight rejected:\n"
            f"   path={request.url.path}\n"
            f"   origin={origin}\n"
            f"   access-control-request-method={acrm}\n"
            f"   access-control-request-headers={acrh}\n"
            f"   allow_origins={settings.parsed_cors_allow_origins()}"
        )

    return response


# Exception handler for validation errors to see what's failing
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    def _json_safe(value):
        """Recursively convert non-JSON-serializable values (e.g., bytes) to strings."""
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        if isinstance(value, (bytes, bytearray)):
            try:
                return value.decode("utf-8", errors="replace")
            except Exception:
                return repr(value)
        if isinstance(value, dict):
            return {str(k): _json_safe(v) for k, v in value.items()}
        if isinstance(value, (list, tuple, set)):
            return [_json_safe(v) for v in value]
        # Fallback: stringify
        return str(value)

    # Log validation errors for debugging
    print(f"\n{'='*60}")
    print(f"❌ VALIDATION ERROR (422)")
    print(f"   Path: {request.url.path}")
    print(f"   Method: {request.method}")
    print(f"   Body received: {exc.body if hasattr(exc, 'body') else 'N/A'}")
    print(f"   Errors: {exc.errors()}")
    print(f"{'='*60}\n")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            # exc.errors() can contain bytes under "input" -> must sanitize
            "detail": _json_safe(exc.errors()),
            "body": _json_safe(getattr(exc, "body", None)),
        }
    )


# CORS middleware
cors_origins = settings.parsed_cors_allow_origins()
print(f"🔧 Configuring CORS with origins: {cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else [],
    # Credentials are only valid with explicit origins (not "*")
    allow_credentials=("*" not in (cors_origins or [])),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security middleware (validation + rate limiting)
setup_validation(app)
setup_rate_limiting(app)

# Mount static files for serving images
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(images.router, prefix="/api/images", tags=["User Images"])
app.include_router(wardrobe.router, prefix="/api/wardrobe", tags=["Wardrobe"])
app.include_router(ai_processing.router, prefix="/api/ai", tags=["AI Processing"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])


@app.get("/")
async def root():
    return {"message": "Dripdirective API is running"}


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint for AWS ELB/ALB and monitoring.
    Returns status of API and database connectivity.
    """
    health_status = {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }
    
    # Test database connection
    try:
        db.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        logger.error(f"❌ Database health check failed: {e}")
        health_status["status"] = "unhealthy"
        health_status["database"] = f"error: {str(e)}"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=health_status
        )
    
    # Test storage (S3 or local)
    try:
        if settings.USE_S3:
            health_status["storage"] = "s3"
        else:
            health_status["storage"] = "local"
    except Exception as e:
        logger.warning(f"⚠️ Storage check warning: {e}")
        health_status["storage"] = "unknown"
    
    return health_status

