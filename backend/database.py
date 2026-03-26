"""
database.py — Conexión a PostgreSQL y sesión SQLAlchemy
El host 'postgres-mantenimiento-db' es el nombre del contenedor Docker.
Desde fuera de Docker (desarrollo local) usa localhost sobreescribiendo DB_HOST en .env
"""

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "mantenimiento_db"
    DB_USER: str = "admin"
    DB_PASSWORD: str = "adminpassword"

    class Config:
        env_file = str(Path(__file__).parent / ".env")
        extra = "ignore"


settings = Settings()

DATABASE_URL = (
    f"postgresql+psycopg://{settings.DB_USER}:{settings.DB_PASSWORD}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
)

engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependencia FastAPI: abre sesión, la inyecta y la cierra al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()