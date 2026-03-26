"""
main.py — Punto de entrada de FastAPI.
Levanta la app, configura CORS y registra todos los routers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base

# Importar todos los routers
from routers import visits, reports, ruta, imprevistos, metrics, users

# Crear tablas en BD al arrancar (en producción usaríamos Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SmAIrt Mobility Copilot API",
    description="Backend para el copilot de mantenimiento de puntos de recarga eléctrica.",
    version="1.0.0",
)

# CORS — permite llamadas desde el frontend Next.js en desarrollo y producción
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # en producción limitar al dominio del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(visits.router)
app.include_router(reports.router)
app.include_router(ruta.router)
app.include_router(imprevistos.router)
app.include_router(metrics.router)
app.include_router(users.router)


@app.get("/health")
def health():
    return {"status": "ok"}