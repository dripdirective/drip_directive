import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import inspect, text
from app.database import engine, Base
from app.routers import auth, users, images, wardrobe, ai_processing, recommendations
from app.config import settings
from app.core.vector_store import get_vector_store
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
            "detail": exc.errors(),
            "body": str(exc.body) if hasattr(exc, 'body') and exc.body else None
        }
    )


# CORS middleware
cors_origins = settings.parsed_cors_allow_origins()
print(f"🔧 Configuring CORS with origins: {cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else [],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
async def health_check():
    return {"status": "healthy"}

