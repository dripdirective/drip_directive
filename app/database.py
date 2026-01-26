import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool, QueuePool

from app.config import settings

# Get database URL from settings
DATABASE_URL = settings.DATABASE_URL

# Handle PostgreSQL URL format from AWS/Heroku (postgres:// -> postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configure engine based on database type
connect_args = {}
engine_config = {
    "pool_pre_ping": True,  # Verify connections before using
}

if "postgresql" in DATABASE_URL:
    # PostgreSQL configuration for production
    engine_config.update({
        "poolclass": QueuePool,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),        # Base connections
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")), # Extra connections under load
        "pool_timeout": 30,         # Wait time for connection
        "pool_recycle": 1800,       # Recycle connections every 30 min
        "echo": False,
    })
    print(f"✅ Using PostgreSQL with connection pool (size={engine_config['pool_size']}, max_overflow={engine_config['max_overflow']})")
elif DATABASE_URL.startswith("sqlite"):
    # SQLite-specific (local dev)
    connect_args = {"check_same_thread": False}
    engine_config["poolclass"] = NullPool
    print("✅ Using SQLite for local development")

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_config
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

