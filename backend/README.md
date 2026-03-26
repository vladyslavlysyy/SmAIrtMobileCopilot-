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
6. [Sistema de prioritats](#sistema-de-prioritats)
7. [Algoritme de planificació](#algoritme-de-planificació)
8. [Endpoints](#endpoints)
9. [Migrations](#migrations)
10. [Posada en marxa](#posada-en-marxa)
11. [Variables d'entorn](#variables-dentorn)
12. [Decisions tècniques justificades](#decisions-tècniques-justificades)
13. [Pendent / TODO](#pendent--todo)

---

## Visió general

Backend FastAPI que exposa la API REST consumida pel frontend Next.js (dashboard d'operacions + app del tècnic).

El sistema **no automatitza decisions**: proposa i assisteix. Operacions sempre confirma abans que s'apliqui cap canvi.

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
│  /api/v1/visits              GET  → llista ordenada     │
│  /api/v1/ruta/calcular       POST → coordenades mapa    │
│  /api/v1/ruta/asignar-incidencia POST → inserció P5     │
│  /api/v1/planning/assign     POST → proposta assignació │
│  /api/v1/planning/confirm    POST → confirmar proposta  │
│  /api/v1/reports             POST → guardar informe     │
│  /api/v1/imprevistos         POST → registrar + impacte │
│  /api/v1/metrics             GET  → dashboard analítica │
│  /api/v1/prioritize          POST → [model IA - Iván]   │
└────────────────┬────────────────────────────────────────┘
                 │  SQLAlchemy ORM
┌────────────────▼────────────────────────────────────────┐
│           PostgreSQL (postgres-mantenimiento-db)        │
│  charger │ technician │ contract │ incidence            │
│  visit   │ report     │ imprevisto                      │
└─────────────────────────────────────────────────────────┘
```

---

## Repartiment de responsabilitats

| Mòdul | Responsable | Fitxers |
|---|---|---|
| Models ORM, schemas, migrations | **Eloi** | `models.py`, `schemas.py`, `migrations.sql` |
| Tots els endpoints REST | **Eloi** | `routers/` |
| Algoritme de planificació | **Eloi** | `routers/planning.py` |
| Seed de dades de demo | **Eloi** | `seed.py` |
| Model IA + `/prioritize` | **Iván + Arnau** | `routers/prioritize.py` |
| Infraestructura Docker + BD | **Iván** | `docker-compose.yml`, schema SQL |
| Dashboard d'operacions (web) | **Vladyslav** | `src/app/operations-dashboard/` |
| App tècnic de camp | **Adrián** | `src/app/field-technician-dashboard/` |
| Dashboard de mètriques | **Vladyslav** | `src/app/metrics-dashboard/` |

**Frontera clara:** Eloi no toca `appStore.ts` ni cap component React. Adrián/Vlad no toquen `models.py` ni cap router. Iván/Arnau són els únics que toquen `/prioritize`.

---

## Estructura del projecte

```
backend/
├── main.py              # FastAPI app, CORS, registre de routers
├── database.py          # Engine SQLAlchemy + get_db()
├── models.py            # Taules ORM
├── schemas.py           # Schemas Pydantic
├── migrations.sql       # ALTER TABLE per als camps nous
├── seed.py              # [pendent] Dades de demo
├── requirements.txt     # Dependències Python
├── Dockerfile           # [pendent]
├── .env.example         # Plantilla de variables d'entorn
└── routers/
    ├── __init__.py
    ├── visits.py        # GET  /api/v1/visits + /visits/week
    ├── ruta.py          # POST /api/v1/ruta/calcular + /asignar-incidencia
    ├── planning.py      # POST /api/v1/planning/assign + /confirm
    ├── reports.py       # POST /api/v1/reports + GET /reports/{visit_id}
    ├── imprevistos.py   # POST /api/v1/imprevistos + GET /imprevistos/{id}
    └── metrics.py       # GET  /api/v1/metrics
```

---

## Model de dades

Segueix el schema real del contenidor (`table_scheme.sql`). Canvis justificats:

### `Charger` (present al schema real, absent a l'ERD original)
Font de veritat de la ubicació física. `Contract` i `Incidence` hi fan FK.
**Les coordenades no es guarden a `Visit`**: es resolen en temps d'execució via `visit → contract → charger` o `visit → incidence → charger`. Evita duplicació i inconsistències.

### `Contract` i `Incidence` — completament separats
Cada entitat té la seva pròpia FK a `charger` i la seva pròpia relació amb `Visit`. Reflecteix el schema real de la BD.

### Camps afegits a `Visit` (via `migrations.sql`)

| Camp | Tipus | Motiu |
|---|---|---|
| `priority` | INT (1-5) | Prioritat explícita. Si NULL, es deriva de `visit_type` |
| `route_order` | INT | Posició a la ruta del dia |
| `last_priority_score` | FLOAT | Últim score del model IA (auditoría) |
| `priority_computed_at` | TIMESTAMP | Quan es va calcular l'últim score |

### `content_json` a `Report` (via `migrations.sql`)
Checklist serialitzat com a TEXT. En producció: JSONB.

### `Imprevisto` (taula nova, via `migrations.sql`)
Registre d'imprevistos en camp. No estava al schema original.

---

## Sistema de prioritats

| Nivell | Nom | Comportament |
|---|---|---|
| **P5** | Correctiu crític | Inserció forçada **avui**. Modifica la ruta del tècnic menys afectat. Si cal, cancel·la una visita P1 (la de deadline més llunyà). Pot reassignar a un tècnic diferent. |
| **P4** | Correctiu no crític | ASAP, però **no modifica rutes ja tancades**. S'insereix al primer slot disponible dels propers dies. |
| **P3** | Diagnosi | Prèvia a una P2 o correctiu. Es planifica el dia anterior (o el mateix matí) que la visita associada. |
| **P2** | Puesta en marcha / periòdica | **Oportunista**. Només s'insereix si la jornada té ≤ 360 min ocupats. Es prioritzen dies on el tècnic ja passa pel mateix codi postal. |
| **P1** | Preventiu contractual | **Omple buits**. S'insereix al dia amb menys càrrega dins la finestra del contracte. Si queden ≤ 3 dies per al deadline, s'escala a P4. |

**Mapa `visit_type` → prioritat per defecte:**

| `visit_type` | Prioritat per defecte |
|---|---|
| `correctivo_critico` | 5 |
| `correctivo_no_critico` | 4 |
| `diagnosi` | 3 |
| `puesta_en_marcha` | 2 |
| `preventivo` | 1 |

La prioritat es pot sobreescriure explícitament al camp `priority` de `Visit`.

---

## Algoritme de planificació

### Flux complet

```
Nova visita creada (amb priority i visit_type)
        │
        ▼
POST /api/v1/planning/assign
        │
        ├─ P5 → plan_p5(): busca tècnic mínim cost avui, pot cancel·lar P1
        ├─ P4 → plan_p4(): primer slot disponible sense tocar avui
        ├─ P3 → plan_p3(): dia anterior a visita associada, fallback P4
        ├─ P2 → plan_p2(): dies amb ≤360 min, bonus codi postal
        └─ P1 → plan_p1(): dia menys carregat dins finestra contracte
                │
                ▼
        Retorna llista de CandidateTechnician ordenada per cost
        (Operacions revisa, NO s'aplica cap canvi)
                │
                ▼
POST /api/v1/planning/confirm
        │
        ├─ Assigna tècnic + data a la visita
        ├─ Actualitza route_order del dia
        └─ Si P5 amb cancel·lació: marca visita P1 com 'cancelled'
```

### Cost d'inserció

```
extra_km  = dist(prev→nova) + dist(nova→seg) − dist(prev→seg)
extra_min = travel(extra_km) + estimated_duration
cost      = extra_km × 0.6 + extra_min × 0.4
```

Les distàncies es calculen amb la fórmula de Haversine (sense API externa).
Els pesos (0.6 / 0.4) es poden ajustar sense canviar l'API.

### Penalització per dies de retard (P4/P1)
Cada dia addicional afegeix +5 al cost, de manera que el sistema sempre prefereix la solució més ràpida quan tot és igual.

### Penalització per cancel·lació (P5)
Cancel·lar una visita P1 afegeix +50 al cost, de manera que el sistema prefereix un tècnic amb capacitat natural abans de recórrer a cancel·lacions.

---

## Endpoints

### `GET /api/v1/visits`
Visites d'un tècnic per a un dia, ordenades per `route_order ASC NULLS LAST` + fallback `planned_date`.
**Decisió — ordre doble:** si el model ja ha calculat `route_order`, s'usa. Si no, fallback cronològic. El frontend no ho sap.
**Crida des de:** `RouteTimeline.tsx`, `WeeklyCalendarStrip.tsx`

---

### `GET /api/v1/visits/week`
Càrrega de visites pendents per dia per a una setmana: `{ "2026-03-26": 4, ... }`.
**Crida des de:** `WeeklyCalendarStrip.tsx`

---

### `POST /api/v1/ruta/calcular`
El tècnic accepta la llista ordenada. Retorna coordenades per al mapa + hora estimada per parada. **Persisteix `route_order` a BD**.
**Crida des de:** `RouteTimeline.tsx` en prémer "Acceptar ruta"

---

### `POST /api/v1/ruta/asignar-incidencia`
Inserció ràpida d'una incidència P5 a la ruta activa. Valida jornada (480 min). Retorna `JORNADA_EXCEDIDA` si no cap. **Persisteix `route_order`**.
**Crida des de:** `ContingencyBanner.tsx`

---

### `POST /api/v1/planning/assign`
Calcula la proposta d'assignació per a una visita nova. Aplica l'algoritme corresponent a la seva prioritat (P1–P5). **No aplica cap canvi**. Retorna llista de candidats ordenada per cost.
**Decisió — proposta sense execució:** el sistema calcula, Operacions decideix. Respecta el requisit de l'enunciat.
**Crida des de:** `AISuggestionsPanel.tsx`, `InterventionQueue.tsx`

---

### `POST /api/v1/planning/confirm`
Operacions confirma la proposta. S'apliquen els canvis: assignació, `route_order`, cancel·lació P1 si escau.
**Crida des de:** botó "Confirmar" al dashboard d'operacions

---

### `POST /api/v1/reports`
Guarda l'informe post-intervenció i marca la visita com `completed`. Upsert (segur si el tècnic reobre el formulari).
**Crida des de:** formulari final de `RouteTimeline.tsx`

---

### `GET /api/v1/reports/{visit_id}`
Informe d'una visita per revisió des d'Operacions.
**Crida des de:** `InterventionQueue.tsx`

---

### `POST /api/v1/imprevistos`
Registra imprevist, marca visita com `blocked`, calcula impacte i retorna proposta de replanificació **llegible però no executada**.
**Crida des de:** `ContingencyButton.tsx` → `ContingencyBanner.tsx`

---

### `GET /api/v1/imprevistos/{technician_id}`
Imprevistos actius del dia. `ContingencyBanner.tsx` fa polling aquí.

---

### `GET /api/v1/metrics`
Un sol endpoint per a tot el dashboard de mètriques. Rang i tècnic opcionals.
**Decisió — un endpoint:** evita 5+ crides paral·leles del frontend.
**Crida des de:** tots els components de `metrics-dashboard/`

---

## Migrations

El `table_scheme.sql` original no inclou tots els camps. `migrations.sql` els afegeix de forma segura (`IF NOT EXISTS`).

```bash
# Primer confirma usuari i BD amb Iván, després:
docker exec -i blissful_colden psql -U <usuari> -d <nom_bd> < backend/migrations.sql
```

Per a futures instàncies: afegir el contingut de `migrations.sql` al final de `table_scheme.sql`.

---

## Posada en marxa

```bash
# 1. Entorn virtual
python -m venv venv
source venv/bin/activate       # Linux/Mac
venv\Scripts\activate          # Windows

# 2. Dependències
pip install -r requirements.txt

# 3. Variables d'entorn
cp .env.example .env
# Omplir DB_USER, DB_PASSWORD, DB_NAME (consultar Iván)

# 4. Executar migrations (una sola vegada)
docker exec -i blissful_colden psql -U <usuari> -d <nom_bd> < migrations.sql

# 5. Arrencar el servidor
uvicorn main:app --reload --port 8000

# 6. Seed de demo (quan estigui llest)
python seed.py

# 7. Swagger: http://localhost:8000/docs
```

---

## Variables d'entorn

```env
DB_HOST=postgres-mantenimiento-db   # nom del contenidor Docker
DB_PORT=5432
DB_NAME=        # consultar Iván
DB_USER=        # consultar Iván
DB_PASSWORD=    # consultar Iván

# Dev local fora de Docker:
# DB_HOST=localhost
```

---

## Decisions tècniques justificades

| Decisió | Alternativa descartada | Motiu |
|---|---|---|
| Coordenades a `Charger`, no a `Visit` | Snapshot a `Visit` | Evita duplicació; si el charger es mou, totes les visites futures reflecteixen la posició correcta automàticament |
| Prioritat INT (1-5) + `visit_type` separat | Un sol camp | `visit_type` determina el formulari d'informe; `priority` determina el comportament de planificació. Separar-los permet flexibilitat |
| Haversine sense API externa | Google Maps API | Funciona offline, zero latència, suficient precisió per a 40 km/h metropolità |
| `plan_p*` funcions separades | Switch monolític | Cada prioritat té lògica molt diferent; funcions separades faciliten testejar i modificar individualment |
| `assign` + `confirm` en dos passos | Assignació automàtica | El repte requereix explícitament que el sistema no decideixi sol |
| Cost = km×0.6 + min×0.4 | Només km o només temps | El tècnic va en VE: els km afecten l'autonomia, el temps afecta la jornada. Ponderar tots dos dona un cost realista |
| Penalització +50 per cancel·lació P1 | Prohibir cancel·lacions | Permet al sistema trobar solució sempre en P5, però fa que cancel·lar sigui l'últim recurs |
| FastAPI | Django REST, Flask | Tipat nadiu amb Pydantic, Swagger automàtic, rendiment async |
| `content_json` com a TEXT | JSONB | Simplicitat per a demo; migrable a JSONB sense canviar l'API |

---

## Pendent / TODO

- [x] `models.py` — alineat amb schema real, nou sistema de prioritats
- [x] `migrations.sql` — ALTER TABLE + imprevisto + priority
- [x] `routers/visits.py`
- [x] `routers/ruta.py`
- [x] `routers/planning.py` — algoritme P1–P5
- [x] `routers/reports.py`
- [x] `routers/imprevistos.py`
- [x] `routers/metrics.py`
- [x] `.env.example`
- [ ] `seed.py` — 3 tècnics, 15 visites (totes 5 prioritats), 2 imprevistos
- [ ] `Dockerfile`
- [ ] Confirmar `DB_USER` i `DB_NAME` amb Iván → executar `migrations.sql`
- [ ] Registrar `routers/prioritize.py` de Iván/Arnau a `main.py`