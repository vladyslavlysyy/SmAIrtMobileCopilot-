# SmAIrt Mobility Copilot

Proyecto full-stack para operaciones de mantenimiento de cargadores electricos.

- Frontend: Next.js (carpeta `frontend`)
- Backend: FastAPI (carpeta `backend`)
- BD: PostgreSQL en Docker (puerto 5432)

## Estado actual

- Flujo Admin -> generar ruta IA -> asignar visitas al tecnico: operativo.
- Flujo movil -> visualizar ruta (sin recalcular IA): operativo.
- Flujo de imprevistos -> evaluar esquipa o buscar herramienta: operativo.
- Suite de smoke test backend: verde (Failures: 0).

## Flujo funcional (resumen)

### Flujo 1: Planificacion manual por Admin

1. Admin crea visitas:
   - desde contrato: `POST /api/v1/visits/from-contract`
   - desde incidencia: `POST /api/v1/visits/from-incidence`
2. Admin genera propuesta de ruta IA:
   - `POST /api/v1/ruta/generar`
3. Admin revisa/modifica orden si quiere (frontend).
4. Admin confirma y asigna a tecnico:
   - `POST /api/v1/ruta/assignar`
5. Se guarda calendario diario (`technician_id` + `planned_date`).

### Flujo 2: Tecnico movil

1. Lee agenda diaria:
   - `GET /api/v1/visits?technician_id=...&date=...`
2. Si necesita dibujar ruta del dia:
   - `POST /api/v1/ruta/geometria`
   - Solo genera geometria del orden ya decidido, sin IA.

### Flujo 3: Imprevistos

1. Movil reporta evaluacion de imprevisto:
   - `POST /api/v1/imprevistos/evaluar`
2. El backend compara score de la visita vs penalizacion de herramienta.
3. Devuelve decision:
   - `ves_a_buscar_eina` o `esquipa`
4. Si `esquipa`, bloquea visita y retorna ruta actualizada de ese dia.

## Que hace cada archivo clave

### Backend core

- `backend/main.py`
  - Arranque FastAPI, CORS, registro de routers.

- `backend/models.py`
  - Modelo ORM alineado al esquema real de la BD actual.

- `backend/schemas.py`
  - Contratos request/response de la API.

- `backend/database.py`
  - Conexion y sesion SQLAlchemy.

### Backend dominio

- `backend/optimizer.py`
  - Motor IA de rutas.
  - Calcula features desde BD.
  - Usa XGBoost si existe `backend/modelo_rutas_fsm_optimizado.json`.
  - Fallback heuristico si no hay modelo o falla carga.
  - Refina con OSMnx si disponible y genera GeoJSON.

- `backend/routers/visits.py`
  - Consultas de visitas (`/visits`, `/visits/all`, `/visits/week`).
  - Creacion manual desde contrato/incidencia.

- `backend/routers/ruta.py`
  - Ruteo historico (`/ruta/calcular`, `/ruta/asignar-incidencia`).
  - Nuevo flujo admin (`/ruta/generar`, `/ruta/assignar`, `/ruta/geometria`).

- `backend/routers/imprevistos.py`
  - Registro y consulta de imprevistos.
  - Evaluacion de decision operativa (`/imprevistos/evaluar`).

- `backend/routers/metrics.py`
  - KPIs agregados para dashboard de metricas.

### Testing y docs

- `backend/tests/test_all_endpoints.py`
  - Smoke test canonico para endpoints activos.

- `README.md`
  - Guia operativa y de flujos.

- `PROGRESS.md`
  - Estado de avance tecnico y cambios aplicados.

## Arranque rapido

### 1) PostgreSQL en Docker

Si el contenedor ya existe:

```powershell
docker start awesome_banzai
docker ps --filter "name=awesome_banzai"
```

Si hay que crearlo:

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

### Visitas

- `GET /api/v1/visits`
- `GET /api/v1/visits/all`
- `GET /api/v1/visits/week`
- `POST /api/v1/visits/from-contract`
- `POST /api/v1/visits/from-incidence`

### Rutas

- `POST /api/v1/ruta/generar`
- `POST /api/v1/ruta/assignar`
- `POST /api/v1/ruta/geometria`

### Imprevistos

- `POST /api/v1/imprevistos/evaluar`

### Metricas

- `GET /api/v1/metrics`

## Pruebas

Suite oficial actual:

```powershell
cd backend
& ..\.venv\Scripts\Activate.ps1
python tests/test_all_endpoints.py
```

Esperado:

```text
Failures: 0
```

## Notas de dependencias IA

- El optimizador funciona con y sin modelo.
- Si existe `backend/modelo_rutas_fsm_optimizado.json`, usa prediccion XGBoost.
- Si no existe, cae en heuristica y no bloquea el flujo.

## Limpieza de puertos (Windows)

```powershell
$ports = 8000,4028
foreach ($port in $ports) {
  $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
}
```
