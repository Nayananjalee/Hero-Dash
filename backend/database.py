"""
Database Configuration
======================
Supports both SQLite (local development) and PostgreSQL (production).
Set DATABASE_URL environment variable for PostgreSQL.

Recommended free PostgreSQL providers for production:
  - Neon (neon.tech) — 0.5 GB free, serverless PostgreSQL
  - Supabase (supabase.com) — 500 MB free PostgreSQL
  - Aiven (aiven.io) — free PostgreSQL tier
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment or use SQLite as default for local dev
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./hero_dash.db")

# Fix for Render/Heroku: they provide postgres:// but SQLAlchemy requires postgresql://
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configure engine with appropriate settings
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # SQLite-specific configuration (local development only)
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL with connection pooling for production
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,  # Recycle connections every 30 min
        pool_pre_ping=True,  # Verify connections before use
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Database session dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
