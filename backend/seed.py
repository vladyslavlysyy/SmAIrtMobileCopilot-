# SmAIrt Mobility Copilot — Backend API

> Hackathon URV × Etecnic · Camp de Tarragona · Març 2026  
> Equip: Eloi + Iván + Arnau (backend/API), Adrián (app tècnic · React Native), Vladyslav (web · Next.js)

---

## Índex

1. [Visió general](#visió-general)
2. [Arquitectura del sistema](#arquitectura-del-sistema)
3. [Repartiment de responsabilitats](#repartiment-de-responsabilitats)
4. [Estructura del projecte](#estructura-del-projecte)
5. [Model de dades](#model-de-dades)
6. [Endpoints](#endpoints)
7. [Posada en marxa](#posada-en-marxa)
8. [Variables d'entorn](#variables-dentorn)
9. [Decisions tècniques justificades](#decisions-tecniques-justificades)
10. [Pendent / TODO](#pendent--todo)

---

## Visió general

Backend FastAPI que exposa la API REST consumida pel frontend Next.js (dashboard d'operacions + app del tècnic). 

El sistema **no automatitza decisions**: proposa i assisteix. La IA (XGBoost, endpoint `/api/v1/prioritize`) calcula scores de prioritat; el backend orquestra les rutes, registra informes i gestiona imprevistos.

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                  │
│  operations-dashboard  │  field-technician-dashboard    │
│  metrics-dashboard     │  (React, Tailwind, Recharts)   │
└────────────────┬────────────────────────────────────────┘
                 │  HTTP REST (JSON)
┌────────────────▼────────────────────────────────────────┐
│                  BACKEND (FastAPI / Python)              │
│                                                         │
│  /api/v1/visits          GET  → llista ordenada         │
│  /api/v1/ruta/calcular   POST → coordenades per al mapa │
│  /api/v1/ruta/asignar-incidencia  POST → inserció òptim │
│  /api/v1/reports         POST → guardar informe         │
│  /api/v1/imprevistos     POST → registrar + replanificar│
│  /api/v1/metrics         GET  → dades per al dashboard  │
│  /api/v1/prioritize      POST → [MODEL IA - Adrián]     │
└────────────────┬────────────────────────────────────────┘
                 │  SQLAlchemy ORM
┌────────────────▼────────────────────────────────────────┐
│           PostgreSQL (postgres-mantenimiento-db)        │
│   technician │ contract │ incidence │ visit             │
│   report     │ imprevisto                               │
└─────────────────────────────────────────────────────────┘
```

---

## Repartiment de responsabilitats

> Llegeix això abans de tocar codi de companys.

| Mòdul | Responsable | Fitxers |
|---|---|---|
| Base de dades, models ORM, schemas | **Eloi** | `models.py`, `schemas.py`, `database.py` |
| Endpoints de ruta, visites, informes, imprevistos, mètriques | **Eloi** | `routers/visits.py`, `routers/ruta.py`, `routers/reports.py`, `routers/imprevistos.py`, `routers/metrics.py` |
| Model IA + endpoint `/prioritize` | **Iván + Arnau** | `routers/prioritize.py` *(pendent d'ells)* |
| Infraestructura Docker + BD | **Iván** | `docker-compose.yml`, imatge Postgres |
| Seed de dades de demo | **Eloi** | `seed.py` |
| Dashboard d'operacions (web) | **Vladyslav** | `src/app/operations-dashboard/` |
| App tècnic de camp | **Adrián** | `src/app/field-technician-dashboard/` |
| Dashboard de mètriques | **Vladyslav** | `src/app/metrics-dashboard/` |
| Estat global / mock data | **Vladyslav** | `src/store/appStore.ts` |

**Frontera clara:** Eloi no toca `appStore.ts` ni components React. Adrián i Vlad no toquen `models.py` ni cap router. Iván i Arnau són els únics que toquen `/prioritize`.

---

## Estructura del projecte

```
backend/
├── main.py              # FastAPI app, CORS, registre de routers
├── database.py          # Engine SQLAlchemy + get_db()
├── models.py            # Taules ORM (Technician, Contract, Incidence, Visit, Report, Imprevisto)
├── schemas.py           # Schemas Pydantic (request / response)
├── seed.py              # [pendent] Dades de demo
├── requirements.txt     # Dependències Python
├── Dockerfile           # [pendent]
└── routers/
    ├── __init__.py
    ├── visits.py        # [pendent] GET  /api/v1/visits
    ├── ruta.py          # [pendent] POST /api/v1/ruta/calcular + /asignar-incidencia
    ├── reports.py       # [pendent] POST /api/v1/reports
    ├── imprevistos.py   # [pendent] POST /api/v1/imprevistos
    └── metrics.py       # [pendent] GET  /api/v1/metrics
```

---

## Model de dades

Segueix l'ERD proporcionat per Etecnic. Canvis justificats respecte a l'original:

### `VisitSourceMixin`
**Per què:** `Contract` i `Incidence` comparteixen `charger_id` i `domain_id`. En lloc de duplicar camps, un mixin Python els centralitza. `Visit` els referencia via dues FK nullables (`contract_id` / `incidence_id`), mantenint la semàntica de l'ERD: una visita pot venir d'un contracte, d'una incidència, o de tots dos.

### Camps afegits a `Visit`
| Camp | Tipus | Motiu |
|---|---|---|
| `last_priority_score` | FLOAT | Guarda l'últim score XGBoost calculat per traçabilitat i auditoría |
| `priority_computed_at` | TIMESTAMP | Quan es va calcular l'últim score |
| `route_order` | INT | Posició a la ruta del dia ordenada pel model |

**Per què no persistir el score:** el score depèn del context del tècnic en aquell moment (posició, autonomia restant, temps de jornada). Es recalcula on-demand. `last_priority_score` és opcional, únicament per auditoría.

### `content_json` a `Report`
Guardem el checklist com a string JSON serialitzat. Senzill per a demo. En producció: columna `JSONB` de Postgres.

---

## Endpoints

### `GET /api/v1/visits`
Retorna la llista de visites d'un tècnic per a un dia concret, ordenades per `route_order ASC NULLS LAST` i per `planned_date` com a fallback.

**Query params:** `technician_id` (int), `date` (YYYY-MM-DD)

**Decisió — ordre doble:** si el model de prioritat ja ha calculat `route_order`, el tècnic veu la llista optimitzada. Si no (primera hora del matí, model pendent), cau al fallback cronològic. El frontend no necessita saber quina de les dues s'aplica.

**Crida des de:** `RouteTimeline.tsx`, `WeeklyCalendarStrip.tsx`

---

### `GET /api/v1/visits/week`
Retorna la càrrega de visites pendents per dia per a una setmana sencera: `{ "2026-03-23": 4, "2026-03-24": 2, ... }`.

**Query params:** `technician_id`, `week_start` (dilluns de la setmana)

**Decisió — un sol endpoint per tota la setmana:** en lloc de 7 crides, una sola query agrupada per `date`. `WeeklyCalendarStrip.tsx` ho necessita per pintar la càrrega visual de cada dia.

**Crida des de:** `WeeklyCalendarStrip.tsx`

---

### `POST /api/v1/ruta/calcular`
El tècnic accepta la llista ordenada proposada. Calcula l'hora estimada d'arribada a cada parada i retorna les coordenades per pintar el mapa. **Persisteix `route_order` a BD**, de manera que si el tècnic perd connexió i reobre l'app, el `GET /visits` ja torna l'ordre acceptat.

**Body:** `{ technician_id, visit_ids_ordered: [...], origen: {lat, lon} }`

**Decisió — persistir route_order en acceptar:** sense això, l'ordre es perdria en tancar l'app. Persistir-lo aquí evita que el frontend hagi de guardar estat local.

**Crida des de:** `RouteTimeline.tsx` en prémer "Acceptar ruta"

---

### `POST /api/v1/ruta/asignar-incidencia`
Insereix una nova incidència en el punt òptim de la ruta activa (mínim desvio). Respecta l'ordre estricte dels `correctivo_critico` existents. Valida que la jornada no superi 480 min. Retorna `JORNADA_EXCEDIDA` si no cap. **També persisteix el nou `route_order`.**

**Decisió — inserció òptima sense reordenar crítics:** els correctius crítics ja assignats no es mouen mai. La nova incidència s'insereix en el primer espai òptim a partir del primer no-crític. Garanteix que les emergències en curs no es retarden.

**Crida des de:** `ContingencyBanner.tsx` (operacions), notificació al tècnic

---

### `POST /api/v1/reports`
Guarda l'informe post-intervenció i marca la visita com a `completed`.

**Body:** `{ visit_id, report_type, content_json }`

**Decisió — upsert en lloc de 409:** si el tècnic tanca l'app abans d'enviar i reobre, el formulari es reenviarà. En lloc d'error per duplicat, el backend actualitza l'informe existent. Crític en camp amb cobertura inestable.

**Decisió — `content_json` opac:** el backend no valida l'estructura interna del checklist. Cada tipus de formulari té els seus camps i el frontend en és responsable. Permet evolucionar els formularis sense canviar l'API.

**Crida des de:** formulari final de `RouteTimeline.tsx`

---

### `GET /api/v1/reports/{visit_id}`
Retorna l'informe d'una visita per revisió des d'Operacions.

**Crida des de:** `InterventionQueue.tsx`

---

### `POST /api/v1/imprevistos`
Registra un imprevist, marca la visita com a `blocked`, calcula l'impacte en la resta de la jornada i retorna una proposta de replanificació **llegible però no executada automàticament**.

**Body:** `{ visit_id, tipo, descripcion, tiempo_perdido_min }`

**Decisió — proposta sense execució automàtica:** el sistema calcula i proposa, però Operacions ha d'acceptar. Si accepta, crida `POST /ruta/calcular` amb els IDs reordenats per fer-lo efectiu. Respecta el requisit: *"el sistema no decideix automàticament"*.

**Crida des de:** `ContingencyButton.tsx` (tècnic) → `ContingencyBanner.tsx` (ops)

---

### `GET /api/v1/imprevistos/{technician_id}`
Imprevistos actius del dia per a un tècnic. `ContingencyBanner.tsx` fa polling aquí.

**Query params:** `date` (opcional, per defecte avui)

---

### `GET /api/v1/metrics`
Un sol endpoint que alimenta tot el dashboard de mètriques.

**Query params:** `date_from`, `date_to`, `technician_id` (tots opcionals, per defecte mes actual)

**Decisió — un sol endpoint:** el dashboard té 5 gràfics. En lloc de 5+ crides, una sola resposta JSON redueix la latència percebuda i simplifica el frontend.

**Decisió — km amb Haversine on-the-fly:** no es guarden km per visita. Es calculen sumant distàncies entre visites completades ordenades per `route_order`. Suficient per a demo; en producció vindrien del GPS.

**Decisió — SLA per `estimated_duration`:** sense camp `completed_at` real, s'estima que la visita va acabar a `planned_date + estimated_duration`. En producció, el tècnic marcaria el moment exacte.

**Crida des de:** `InterventionsAreaChart`, `KmBarChart`, `SlaRadialChart`, `MetricsKpiGrid`, `RecentInterventionsTable`

---

### `POST /api/v1/prioritize` *(Iván + Arnau)*
Model IA que puntua i ordena les visites d'un tècnic. **No tocar.** Definit per Iván i Arnau.

---

## Posada en marxa

```bash
# 1. Activar entorn virtual
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows

# 2. Instal·lar dependències
pip install -r requirements.txt

# 3. Configurar variables d'entorn
cp .env.example .env
# Editar .env si cal (veure secció Variables d'entorn)

# 4. Assegurar-se que el contenidor Postgres està corrent
# (postgres-mantenimiento-db ja el teniu configurat)

# 5. Arrencar el servidor
uvicorn main:app --reload --port 8000

# 6. [Opcional] Poblar la BD amb dades de demo
python seed.py

# 7. Swagger UI disponible a:
# http://localhost:8000/docs
```

---

## Variables d'entorn

Crea un fitxer `.env` a la carpeta `backend/`:

```env
DB_HOST=postgres-mantenimiento-db   # nom del contenidor Docker
DB_PORT=5432
DB_NAME=smairty
DB_USER=postgres
DB_PASSWORD=postgres
```

Si connectes des de fora de la xarxa Docker (desenvolupament local sense Docker):
```env
DB_HOST=localhost
```

---

## Decisions tècniques justificades

| Decisió | Alternativa descartada | Motiu |
|---|---|---|
| FastAPI | Django REST, Flask | Tipat natiu amb Pydantic, rendiment async, Swagger automàtic |
| SQLAlchemy 2.0 ORM | SQL directe, SQLModel | Abstraccó suficient per a demo, migrable a producció |
| `VisitSourceMixin` | Herència de taula (CTI) | Menys complexitat SQL, suficient per al model del hackathon |
| Scores no persistits per defecte | Guardar sempre a BD | El score depèn del context del tècnic en aquell instant |
| CORS `allow_origins=["*"]` | Whitelist d'orígens | Hackathon: simplicitat. En producció: dominis específics |
| `content_json` com a String | JSONB de Postgres | Simplicitat de demo sense extensions addicionals |

---

## Pendent / TODO

- [x] `routers/visits.py` — `GET /api/v1/visits` + `GET /api/v1/visits/week`
- [x] `routers/ruta.py` — `POST /api/v1/ruta/calcular` + `POST /api/v1/ruta/asignar-incidencia`
- [x] `routers/reports.py` — `POST /api/v1/reports` + `GET /api/v1/reports/{visit_id}`
- [x] `routers/imprevistos.py` — `POST /api/v1/imprevistos` + `GET /api/v1/imprevistos/{technician_id}`
- [x] `routers/metrics.py` — `GET /api/v1/metrics`
- [ ] `seed.py` — 3 tècnics, 15 visites, 2 imprevistos simulats
- [ ] `Dockerfile` del backend
- [ ] `.env.example`