# SmAIrt Mobility Copilot

Proyecto full-stack para operaciones de mantenimiento de cargadores electricos.

- Frontend: Next.js (carpeta frontend)
- Backend: FastAPI (carpeta backend)
- Base de datos: PostgreSQL (Docker, puerto 5432)

## Estado actual

- API backend estable con endpoints de visitas, metricas, reportes, imprevistos, usuarios y ruta.
- Frontend conectado al backend en tiempo real.
- Endpoint nuevo para consultar todas las visitas con filtros opcionales:
  - GET /api/v1/visits/all

## Estructura del proyecto

- frontend: aplicacion web Next.js
- backend: API FastAPI y logica de negocio
- README.md: guia operativa consolidada
- PROGRESS.md: resumen de avances y decisiones tecnicas

## Arranque rapido

### 1) PostgreSQL en Docker

Si el contenedor ya existe:

```powershell
docker start awesome_banzai
docker ps --filter "name=awesome_banzai"
```

Si necesitas crearlo:

```powershell
docker run -d --name awesome_banzai -p 5432:5432 -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=adminpassword -e POSTGRES_DB=mantenimiento_db ivanmoliinero/postgres-mantenimiento-db:v1
```

### 2) Backend

```powershell
cd backend
& ..\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Checks rapidos:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/metrics" -UseBasicParsing
```

### 3) Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Endpoints clave

### Salud

- GET /health

### Visitas

- GET /api/v1/visits
  - Params opcionales: technician_id, date
  - Si no se envia date, usa el dia actual.

- GET /api/v1/visits/all
  - Params opcionales: technician_id, date_from, date_to
  - Devuelve todas las visitas o un subconjunto por filtros.

- GET /api/v1/visits/week
  - Params: technician_id, week_start

Ejemplos:

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/visits/all" -UseBasicParsing
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/visits/all?technician_id=1" -UseBasicParsing
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/visits/all?date_from=2026-03-01&date_to=2026-04-30" -UseBasicParsing
```

### Metricas

- GET /api/v1/metrics
  - Params opcionales: date_from, date_to, technician_id

Nota: si hay pocas o ninguna visita completada, es normal ver km y horas en 0.

## Testing oficial (actual)

Suite canónica mantenida:

```powershell
cd backend
& ..\.venv\Scripts\Activate.ps1
python tests/test_all_endpoints.py
```

Esperado:

```text
Failures: 0
```

## Limpieza de procesos (si hay puertos ocupados)

```powershell
$ports = 8000,4028
foreach ($port in $ports) {
  $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
}
```

## Notas de mantenimiento

- Se eliminaron tests legacy y documentos duplicados para evitar drift de contrato.
- La documentacion activa queda centralizada en este README y en PROGRESS.md.
- Artefactos generados (__pycache__, *.tsbuildinfo) quedan ignorados por git.
