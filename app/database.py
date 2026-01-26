from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool

from app.config import settings

# Get database URL from settings
DATABASE_URL = settings.DATABASE_URL

# Handle PostgreSQL URL format from AWS/Heroku (postgres:// -> postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Postgres-only configuration
if "postgresql" not in DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL must be a PostgreSQL URL (postgresql://...). "
        "SQLite is not supported in this deployment."
    )

connect_args = {}
engine_config = {
    "pool_pre_ping": True,  # Verify connections before using
}

import os

engine_config.update({
    "poolclass": QueuePool,
    "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),        # Base connections
    "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")), # Extra connections under load
    "pool_timeout": 30,         # Wait time for connection
    "pool_recycle": 1800,       # Recycle connections every 30 min
    "echo": False,
})
print(
    f"✅ Using PostgreSQL with connection pool "
    f"(size={engine_config['pool_size']}, max_overflow={engine_config['max_overflow']})"
)

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

