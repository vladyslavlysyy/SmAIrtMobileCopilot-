# Progress Report

Fecha: 2026-03-26

## Resumen ejecutivo

El proyecto quedo estabilizado sobre PostgreSQL real y contratos de API alineados con el esquema existente. Se resolvieron errores de consultas antiguas, conflictos de procesos en puerto 8000 y desajustes de nombres de campos entre backend y frontend.

## Avances clave

1. Backend alineado con schema real
- Routers reescritos o ajustados para usar SQL compatible con tablas reales.
- Eliminados supuestos ORM que no existian en la BD actual.
- Manejo de rollback en consultas opcionales para evitar transacciones abortadas en cascada.

2. Endpoints estabilizados
- /api/v1/metrics devuelve datos consistentes con filtros opcionales.
- /api/v1/visits acepta parametros opcionales.
- Nuevo endpoint /api/v1/visits/all para recuperar todas las visitas con filtros opcionales por tecnico y rango de fechas.

3. Frontend conectado correctamente
- Normalizacion de campos de metricas para compatibilidad backend/frontend:
  - completadas -> completades
  - pendientes -> pendentes
- Dashboard de metricas mostrando pendientes segun datos reales.

4. Testing operativo
- Suite canonica backend: backend/tests/test_all_endpoints.py
- Resultado de smoke tests: sin fallos en los endpoints actuales.

5. Documentacion operativa
- README consolidado con:
  - arranque de Docker, backend y frontend
  - endpoints clave
  - pruebas oficiales
  - troubleshooting de puertos

## Limpieza realizada

- Eliminacion de documentos legacy y redundantes para reducir drift de informacion.
- Eliminacion de tests antiguos no alineados con el contrato actual.
- Ignorados artefactos generados en git (__pycache__, *.tsbuildinfo).

## Estado actual

- Backend: operativo y validado por smoke tests.
- Frontend: funcional para dashboards principales.
- DB: conectada por Docker en 5432 con consultas activas.

## Pendientes recomendados

1. Añadir paginacion en /api/v1/visits/all (limit/offset).
2. Integrar tests con CI para evitar regresiones.
3. Cerrar deuda de type-check en modulos frontend no usados en flujo principal.
4. Definir versionado de API para cambios futuros de contrato.
