"""
conftest.py - Pytest configuration for backend tests
"""

import pytest
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import engine, SessionLocal
from models import Base
from fastapi.testclient import TestClient


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create test database tables"""
    Base.metadata.create_all(bind=engine)
    yield
    # Teardown if needed


@pytest.fixture
def db():
    """Provide test database session"""
    from database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    """Provide FastAPI test client"""
    from main import app
    return TestClient(app)
