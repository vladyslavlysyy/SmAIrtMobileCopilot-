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

### Actualizacion UI admin (27-03-2026)

- Web centrada en Admin:
  - El dashboard web activo es Operacions.
  - El dashboard de Tecnic en web queda bloqueado y redirige a Operacions con aviso de que la vista de tecnico vive en la app movil separada.

- Sidebar y acciones:
  - `Operacions` ahora es efectivo tambien cuando ya estas dentro: hace refresh del dashboard y muestra confirmacion visual.
  - `Canviar rol` vuelve al selector inicial de acceso.
  - `Sortir` limpia sesion local y vuelve al selector.

- Cua d'Intervencions:
  - La columna de prioridad ya no muestra todo a 0 cuando falta `last_priority_score`: hay fallback por tipo de visita.
  - El texto del tipo de visita se renderiza legible (`correctivo no critico`, etc.) sin guiones bajos.
  - La localizacion usa `address`; si no hay, usa `postal_code`; y si no existe ningun dato, muestra `Sense adreça`.
  - El selector de `Tecnic` usa todo el registro de tecnicos cargado desde backend (no solo los IDs presentes en las visitas cargadas en ese momento).

- Imprevistos:
  - Se deduplican tarjetas repetidas (misma visita + tipo + descripcion) para evitar ruido visual.
  - Se limita la lista visible para evitar spam de la misma alerta.

- Cabecera de Operacions:
  - Filtro unificado (un solo apartado) para combinar alcance temporal + estado:
    - `Avui · Totes`
    - `Avui · Nomes pendents`
    - `Historic · Totes`
    - `Historic · Nomes pendents`
  - El filtro aplica de forma real sobre cola y calendarios.
  - Refresh automatico cada 30 segundos para mantener datos al dia.
  - El boton `Actualitzar ara` fuerza una recarga inmediata manual.
  - `Nou Tecnic` ya no usa prompts del navegador: abre formulario modal interno con validacion de campos y alta real en BD.

- Navegacion lateral simplificada:
  - Se elimina el boton redundante de `Operacions` del bloque inferior (ya existe en el menu principal).
  - Se elimina `Canviar rol` del lateral para evitar accion duplicada e innecesaria en el flujo admin web.
  - `Mètriques` vuelve a mostrarse con tilde en el menu.

- Calendarios de operacion para Admin:
  - Se añade un `Calendari comu` semanal donde se ven todas las tareas de todos los tecnicos por dia.
  - Se añade un `Calendari per tecnic` semanal con selector de tecnico para revisar carga y asignaciones individuales.
  - La vista permite escoger un unico modo visible (`comu` o `per tecnic`), no ambos a la vez.
  - Usa datos reales de backend via `GET /api/v1/visits/all` con rango de fechas.
  - Si ese endpoint no existe en la instancia backend activa, hace fallback compatible a llamadas diarias `GET /api/v1/visits?date=...` (sin inventar datos en frontend).

- Gestion manual de tareas:
  - Se añade panel `Gestio manual de tasques` para crear tareas sin depender de automatismos de IA.
  - Alta manual soportada:
    - desde contrato -> `POST /api/v1/visits/from-contract`
    - desde incidencia -> `POST /api/v1/visits/from-incidence`
  - Incluye validaciones basicas de IDs, tecnico opcional, fecha opcional y nivel de escalado opcional.
  - Tras crear una tarea, se refrescan cola y calendarios para que la gestion sea comoda y visible al instante.

- Backend routing (correccion de 404):
  - Se registra el router de planning en FastAPI (`/api/v1/planning/assign` y `/api/v1/planning/confirm`).
  - Evita el popup `Not Found` en Operacions al cargar paneles que usan sugerencias IA/assignaciones.

- Alta de tecnico (admin):
  - Formulario con validacion basica (nombre, email, telefono, zona).
  - Inserta en backend via `POST /api/v1/users` con `is_technician=true`.
  - Tras crear, refresca listado de tecnicos en frontend.

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
