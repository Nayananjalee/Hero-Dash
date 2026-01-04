from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# UPDATE THIS WITH YOUR MYSQL CREDENTIALS
# Format: mysql+pymysql://<username>:<password>@<host>/<dbname>
# For local development, you might need to create a database named 'herooo_db' first.
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:1234@localhost/heroo"

# Fallback to SQLite if MySQL is not configured/available for demonstration
# SQLALCHEMY_DATABASE_URL = "sqlite:///./herooo.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    # connect_args={"check_same_thread": False} # Only needed for SQLite
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
