# SmAIrt Mobility Copilot - Backend

Updated: 2026-03-26

## 1) Current backend status

This README reflects the real backend that is running now (not the original hackathon draft).

Implemented and validated modules:
- FastAPI app bootstrap and CORS
- SQLAlchemy models and Pydantic schemas
- Visits endpoints
- Route endpoints (OSMnx + NetworkX)
- Reports endpoints
- Imprevistos endpoints
- Metrics endpoint
- Users endpoints (base user_info + optional technician classification)

## 2) Real project structure (backend)

```txt
backend/
  main.py
  database.py
  models.py
  schemas.py
  seed.py
  requirements.txt
  .env
  routers/
    visits.py
    reports.py
    ruta.py
    imprevistos.py
    metrics.py
    users.py
```

## 3) Active endpoints

### Health
- GET /health

### Users
- POST /api/v1/users
  - Creates user_info with: name, telefono, email, passwd
  - If is_technician=true, classifies to technician as well
- GET /api/v1/users
- GET /api/v1/users/{user_id}
- POST /api/v1/users/{user_id}/classify-technician

### Visits
- GET /api/v1/visits
- GET /api/v1/visits/week

### Route
- POST /api/v1/ruta/calcular
- POST /api/v1/ruta/asignar-incidencia

### Reports
- POST /api/v1/reports
- GET /api/v1/reports/{visit_id}

### Imprevistos
- POST /api/v1/imprevistos
- GET /api/v1/imprevistos/{technician_id}

### Metrics
- GET /api/v1/metrics

## 4) Route engine details

Current route engine in `routers/ruta.py`:
- Uses OSMnx + NetworkX over road graph (drive)
- Uses a complete mini-graph between stops
- Runs traveling salesman approximation on mini-graph
- Reconstructs route geometry from shortest paths in full graph
- Adds working-day validation with `validar_jornada_laboral`

Important constants:
- Place: Tarragona, Spain
- Working-day limit used by assign-incidencia: 480 minutes

## 5) Users logic details

Input always goes through user_info (name, telefono, email, passwd).
Then optional classification to technician is done via:
- creation flow (is_technician=true), or
- explicit endpoint /classify-technician

Compatibility note:
- Current DB required a fallback for technician.id insertion (manual next id), because the existing table did not auto-generate id.

## 6) Validations already executed

Executed successfully during this session:
- Dependency installation from requirements.txt
- FastAPI import smoke test (`import main`)
- Runtime API checks on live server:
  - GET /health -> 200
  - POST /api/v1/users -> 201
  - POST /api/v1/users/{id}/classify-technician -> 200 (after fix)
  - GET /api/v1/users/{id} -> 200
  - POST /api/v1/ruta/calcular with empty list -> 422 expected
  - POST /api/v1/ruta/asignar-incidencia with missing incidence -> controlled business response

Latest live validation snapshot (2026-03-26):
- GET /health -> 200
- POST /api/v1/users -> 201
- GET /api/v1/users -> 200
- POST /api/v1/ruta/calcular (empty visit list) -> 422
- POST /api/v1/ruta/asignar-incidencia (missing id) -> 200 with INCIDENCIA_NO_ENCONTRADA payload

## 7) Target DB schema (next stage)

The following is the target schema provided by product/backend alignment.
This section is the source of truth for the next migration/refactor phase.

```sql
CREATE TABLE charger (
    id BIGINT PRIMARY KEY,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    postal_code VARCHAR(20),
    zone VARCHAR(255)
);

CREATE TABLE assignable (
    id BIGINT PRIMARY KEY,
    status VARCHAR(255),
    priority SMALLINT,
    charger_id BIGINT REFERENCES charger(id)
);

CREATE TABLE contract (
    id BIGINT PRIMARY KEY REFERENCES assignable(id),
    type VARCHAR(255),
    client_id BIGINT,
    domain_id BIGINT,
    start_date DATE,
    end_date DATE,
    total_visits INT,
    frequency VARCHAR(255)
);

CREATE TABLE incidence (
    id BIGINT PRIMARY KEY REFERENCES assignable(id),
    domain_id BIGINT,
    auto_create_visit BOOLEAN,
    created_at TIMESTAMP
);

CREATE TABLE user_info (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255),
    telefono VARCHAR(255),
    email VARCHAR(255),
    passwd VARCHAR(255)
);

CREATE TABLE technician (
    id BIGINT PRIMARY KEY REFERENCES user_info(id),
    zone VARCHAR(255),
    start_work_day TIME,
    end_work_day TIME
);

CREATE TABLE visit (
    id BIGINT PRIMARY KEY,
    assignable_id BIGINT REFERENCES assignable(id),
    technician_id BIGINT REFERENCES technician(id),
    visit_type VARCHAR(255),
    status VARCHAR(255),
    planned_date TIMESTAMP,
    estimated_duration INT,
    score DOUBLE PRECISION
);

CREATE TABLE report (
    id BIGINT PRIMARY KEY,
    visit_id BIGINT UNIQUE REFERENCES visit(id),
    report_type VARCHAR(255),
    status TEXT,
    created_at TIMESTAMP
);
```

## 8) Gap vs target schema (known)

Current code still differs from target schema in these points:
- Current models do not use assignable base table yet
- Current visit model still references contract_id / incidence_id directly (not assignable_id)
- Current technician model includes name; target technician links 1:1 to user_info by id
- Current user_info includes is_technician and technician_id helper fields
- Current report/user tables include created_at defaults at ORM level that may need DB-level defaults

This is expected for now and should be solved in the next migration/refactor iteration.

## 9) Run locally

```bash
# 1) Create/activate venv
python -m venv venv
# Windows
venv\Scripts\activate

# 2) Install deps
pip install -r requirements.txt

# 3) Set env
# DB_HOST for local outside docker usually localhost

# 4) Run API
uvicorn main:app --reload --port 8000
```

## 10) Immediate next refactor plan

1. Introduce assignable model and migrate contract/incidence inheritance by FK id
2. Refactor visit to assignable_id
3. Refactor technician to 1:1 id with user_info
4. Remove transitional helper fields from user_info
5. Add migration scripts and data backfill for existing rows
6. Re-validate all endpoints after migration
