# Progress Report

Fecha: 2026-03-26

## Resumen ejecutivo

Se completo la integracion del nuevo flujo de negocio:
- Admin genera ruta IA y asigna visitas.
- Movil solo visualiza geometria (sin recalcular orden IA).
- Imprevistos devuelve decision operativa y puede actualizar ruta del dia.

Todo se adapto al esquema real de BD vigente (visit -> assignable_id), evitando romper por supuestos de schema no existentes.

## Cambios tecnicos de hoy

1. Motor IA de rutas
- Nuevo archivo `backend/optimizer.py`.
- Feature engineering desde BD real:
  - priority, visit_type_num, days_waiting, visitas_totales, impacto_cliente, tiempo_llegada, km.
- Uso de modelo XGBoost si existe `backend/modelo_rutas_fsm_optimizado.json`.
- Fallback heuristico cuando no hay modelo o no se puede cargar.
- Refinado con OSMnx cuando esta disponible.

2. Flujo de visitas manuales
- `backend/routers/visits.py`
  - POST `/api/v1/visits/from-contract`
  - POST `/api/v1/visits/from-incidence`

3. Flujo Admin de ruta
- `backend/routers/ruta.py`
  - POST `/api/v1/ruta/generar`
  - POST `/api/v1/ruta/assignar`
  - POST `/api/v1/ruta/geometria`

4. Flujo de imprevistos
- `backend/routers/imprevistos.py`
  - POST `/api/v1/imprevistos/evaluar`
  - Decision: `ves_a_buscar_eina` o `esquipa`.
  - Si esquipa: bloquea visita y devuelve ruta actualizada del tecnico ese dia.

5. Dependencias
- `backend/requirements.txt`
  - xgboost, numpy, pandas anadidos.

6. Testing
- `backend/tests/test_all_endpoints.py` ampliado con endpoints nuevos.
- Smoke test backend ejecutado hoy: `Failures: 0`.
- Flujo E2E validado (Admin -> Assignar -> Movil): OK.

## Validaciones realizadas

1. Smoke test completo de API
- Salud, visitas, metricas, reportes, usuarios, rutas e imprevistos: OK.

2. E2E de negocio
- Crear visita desde contrato: OK.
- Crear visita desde incidencia: OK.
- Generar ruta IA: OK.
- Asignar ruta a tecnico: OK.
- Geometria movil: OK.
- Evaluacion de imprevisto: OK.

## Riesgos / notas abiertas

1. Instalacion de `numpy==1.26.4` en algunos entornos Windows puede intentar compilacion local y fallar por toolchain.
- El sistema no queda bloqueado porque optimizer tiene fallback heuristico.
- Recomendado: fijar variantes con wheel precompilado para entorno Windows.

2. El mapeo contrato/incidencia -> assignable en la BD actual usa IDs alineados en datos semilla.
- Si en futuro esos IDs divergen, habra que introducir tabla/columna de relacion explicita.

## Estado actual

- Backend: estable y validado.
- Frontend: operativo para dashboards y consumo de API.
- BD: conectada y consistente con el flujo implementado.

## Siguientes pasos recomendados

1. Endurecer install de dependencias en Windows (wheel-first).
2. Añadir paginacion a `/api/v1/visits/all`.
3. Integrar smoke tests en CI.
4. Definir versionado de API para evoluciones de contrato.
