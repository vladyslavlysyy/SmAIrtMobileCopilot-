"""
database.py — Conexión a PostgreSQL y sesión SQLAlchemy

Configuración desde .env:
  DB_HOST       → host PostgreSQL (localhost para dev, postgres-mantenimiento-db para Docker)
  DB_PORT       → puerto PostgreSQL (5432 por defecto)
  DB_NAME       → nombre de la base datos (mantenimiento_db)
  DB_USER       → usuario PostgreSQL (admin)
  DB_PASSWORD   → contraseña (adminpassword)
"""

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Carga variables desde .env (requerido)"""
    DB_HOST: str
    DB_PORT: int = 5432
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

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