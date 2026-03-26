# 🔌 INTEGRATION GUIDE: Frontend → Backend API Specification

**Versión**: 1.0.0 | **Fecha**: 26 Marzo 2026 | **Stack**: Next.js ↔ FastAPI

---

## 📋 TABLA DE CONTENIDOS

1. [Setup Rápido](#setup-rápido)
2. [Endpoints Reference](#endpoints-reference)
3. [Data Models](#data-models)
4. [Error Handling](#error-handling)
5. [Examples in TypeScript](#examples-in-typescript)
6. [WebSocket (Bonus)](#websocket-bonus)

---

## ⚡ SETUP RÁPIDO

### Backend URL
```
Development: http://localhost:8000
Production: https://api.smartmobility.com (to be configured)
```

### CORS Configuration
```
✅ Allowed: http://localhost:3000 (Next.js)
✅ Allowed: */* (development)
✅ Credentials: Enabled
✅ Methods: GET, POST, PUT, DELETE, OPTIONS
```

### API Documentation
```
Swagger UI: http://localhost:8000/docs
ReDoc: http://localhost:8000/redoc
OpenAPI JSON: http://localhost:8000/openapi.json
```

---

## 📚 ENDPOINTS REFERENCE

### 1️⃣ HEALTH & INFO

#### GET /health
```
Purpose: Verificar si API está activa
Headers: -
Body: -
Response: 200 OK
{
  "status": "ok"
}
```

#### GET /docs
```
Purpose: Swagger UI (documentación interactiva)
Response: HTML (Swagger)
```

---

### 2️⃣ USUARIOS (NEW)

#### POST /api/v1/users

**Crear nuevo usuario (opcional técnico)**

```
Method: POST
URL: http://localhost:8000/api/v1/users
Headers: Content-Type: application/json
Body: {
  "name": "string",                    // Nombre completo
  "telefono": "string",                 // Teléfono de contacto
  "email": "string",                    // Email único
  "passwd": "string",                   // Contraseña
  "is_technician": false,               // [Optional] Crear como técnico?
  "zone": "Tarragona"                  // [Optional] Si is_technician=true
}

Success Response: 201 Created
{
  "id": 1,
  "name": "Juan Pérez",
  "telefono": "+34612345678",
  "email": "juan@example.com",
  "is_technician": true,
  "technician_id": 3,
  "created_at": "2026-03-26T17:35:00Z"
}

Error Responses:
  409 Conflict: Email ya existe
  400 Bad Request: Campos requeridos faltantes
  422 Unprocessable Entity: Datos inválidos
```

#### GET /api/v1/users

**Listar todos los usuarios**

```
Method: GET
URL: http://localhost:8000/api/v1/users
Headers: -
Body: -

Response: 200 OK
[
  {
    "id": 1,
    "name": "Juan Pérez",
    "telefono": "+34612345678",
    "email": "juan@example.com",
    "is_technician": true,
    "technician_id": 3,
    "created_at": "2026-03-26T17:35:00Z"
  },
  {
    "id": 2,
    "name": "María García",
    "telefono": "+34687654321",
    "email": "maria@example.com",
    "is_technician": false,
    "technician_id": null,
    "created_at": "2026-03-26T18:00:00Z"
  }
]
```

#### GET /api/v1/users/{user_id}

**Obtener usuario específico**

```
Method: GET
URL: http://localhost:8000/api/v1/users/1
Headers: -
Body: -

Response: 200 OK
{
  "id": 1,
  "name": "Juan Pérez",
  "telefono": "+34612345678",
  "email": "juan@example.com",
  "is_technician": true,
  "technician_id": 3,
  "created_at": "2026-03-26T17:35:00Z"
}

Error Responses:
  404 Not Found: Usuario no existe
```

#### POST /api/v1/users/{user_id}/classify-technician

**Convertir usuario existente a técnico**

```
Method: POST
URL: http://localhost:8000/api/v1/users/1/classify-technician
Headers: Content-Type: application/json
Body: {
  "zone": "Tarragona"  // Zona geográfica del técnico
}

Response: 200 OK
{
  "id": 1,
  "name": "Juan Pérez",
  "telefono": "+34612345678",
  "email": "juan@example.com",
  "is_technician": true,
  "technician_id": 3,
  "created_at": "2026-03-26T17:35:00Z"
}

Error Responses:
  404 Not Found: Usuario no existe
  400 Bad Request: Ya es técnico
```

---

### 3️⃣ VISITAS

#### GET /api/v1/visits

**Listar visitas programadas**

```
Method: GET
URL: http://localhost:8000/api/v1/visits
Headers: -
Body: -

Response: 200 OK
[
  {
    "id": 1,
    "contract_id": 1,
    "incidence_id": null,
    "technician_id": 2,
    "visit_type": "preventivo",
    "status": "pending",
    "planned_date": "2026-03-26T17:35:00Z",
    "address": "Calle Main 123",
    "postal_code": "43001",
    "estimated_duration": 45
  }
]
```

#### GET /api/v1/visits/{visit_id}

**Obtener visita específica**

```
Method: GET
URL: http://localhost:8000/api/v1/visits/1
Headers: -
Body: -

Response: 200 OK
{
  "id": 1,
  "contract_id": 1,
  "incidence_id": null,
  "technician_id": 2,
  "visit_type": "preventivo",
  "status": "pending",
  "planned_date": "2026-03-26T17:35:00Z",
  "address": "Calle Main 123",
  "postal_code": "43001",
  "estimated_duration": 45
}
```

#### POST /api/v1/visits

**Crear nueva visita**

```
Method: POST
URL: http://localhost:8000/api/v1/visits
Headers: Content-Type: application/json
Body: {
  "contract_id": 1,
  "technician_id": 2,
  "visit_type": "preventivo",
  "planned_date": "2026-03-26T17:35:00Z",
  "estimated_duration": 45
}

Response: 201 Created
{
  "id": 4,
  "contract_id": 1,
  "technician_id": 2,
  "visit_type": "preventivo",
  "status": "pending",
  "planned_date": "2026-03-26T17:35:00Z",
  "estimated_duration": 45
}
```

#### PUT /api/v1/visits/{visit_id}

**Actualizar visita**

```
Method: PUT
URL: http://localhost:8000/api/v1/visits/1
Headers: Content-Type: application/json
Body: {
  "status": "in_progress",
  "estimated_duration": 60
}

Response: 200 OK
{
  "id": 1,
  "status": "in_progress",
  "estimated_duration": 60
}
```

#### DELETE /api/v1/visits/{visit_id}

**Eliminar visita**

```
Method: DELETE
URL: http://localhost:8000/api/v1/visits/1
Headers: -
Body: -

Response: 204 No Content
```

---

### 4️⃣ RUTAS OPTIMIZADAS ⭐

#### POST /api/v1/ruta/calcular

**Calcular ruta óptima para técnico con múltiples visitas**

```
Method: POST
URL: http://localhost:8000/api/v1/ruta/calcular
Headers: Content-Type: application/json

Body: {
  "technician_id": 2,                           // ID del técnico
  "visit_ids_ordered": [1, 2, 3],               // IDs de visitas a secuenciar
  "origen": {                                    // Coordenadas iniciales (depot)
    "latitude": 41.1189,
    "longitude": 1.2445
  }
}

Success Response: 200 OK
{
  "coordenadas_ruta": [                          // Waypoints de la ruta calculada
    {"latitude": 41.118873, "longitude": 1.2444014},
    {"latitude": 41.119200, "longitude": 1.2450000},
    {"latitude": 41.121500, "longitude": 1.2470000},
    ...                                          // ~20+ coordenadas
  ],
  "segmentos": [                                 // Detalles de cada segmento
    {
      "desde": 0,                                // índice waypoint origen
      "hasta": 1,                                // índice waypoint destino
      "distancia_km": 0.15,                      // distancia en km
      "tiempo_min": 3,                           // tiempo estimado (minutos)
      "direccion": "Norte"
    }
  ],
  "distancia_total_km": 23.45,                   // Distancia total
  "tiempo_total_min": 125,                       // Tiempo total
  "jornada_valida": true,                        // ¿Cumple 480min limit?
  "mensaje_jornada": "Total: 215min ✓"           // Descripción validación
}

Error Responses:
  422 Unprocessable Entity: Campos requeridos faltantes
  {
    "detail": [
      {
        "loc": ["body", "technician_id"],
        "msg": "field required",
        "type": "value_error.missing"
      }
    ]
  }
  
  404 Not Found: Técnico o visitas no existen
  {
    "detail": "Technician with ID 999 not found"
  }
  
  500 Internal Server Error: Error al calcular ruta
  {
    "detail": "Error calculating route"
  }
```

**Notas Importantes**:
- Las coordenadas retornadas representan la ruta ACTUAL en la red de carreteras
- Distancia y tiempo incluyen esperas en paradas (45min por defecto)
- Jornada válida si total ≤ 480 minutos (8 horas)

#### POST /api/v1/ruta/asignar-incidencia

**Insertar incidencia P5 (crítica) en ruta activa**

```
Method: POST
URL: http://localhost:8000/api/v1/ruta/asignar-incidencia
Headers: Content-Type: application/json

Body: {
  "technician_id": 2,                            // Técnico actual
  "incidence_id": 1,                             // Incidencia P5 a insertar
  "visit_ids_actual": [1, 2, 3]                  // Visitas actuales
}

Response: 200 OK
{
  "ruta_actualizada": [1, 8, 2, 3],              // Nueva secuencia con incidencia
  "tiempo_extra_min": 15,                        // Minutos añadidos
  "jornada_valida": true                         // ¿Sigue validando?
}
```

---

### 5️⃣ REPORTES

#### POST /api/v1/reports

**Crear reporte de visita**

```
Method: POST
URL: http://localhost:8000/api/v1/reports
Headers: Content-Type: application/json

Body: {
  "visit_id": 1,
  "report_type": "correctivo",
  "status": "completed"
}

Response: 201 Created
{
  "id": 1,
  "visit_id": 1,
  "report_type": "correctivo",
  "status": "completed",
  "created_at": "2026-03-26T17:35:00Z"
}
```

#### GET /api/v1/reports/{report_id}

**Obtener reporte específico**

```
Method: GET
URL: http://localhost:8000/api/v1/reports/1
Headers: -
Body: -

Response: 200 OK
{
  "id": 1,
  "visit_id": 1,
  "report_type": "correctivo",
  "status": "completed",
  "created_at": "2026-03-26T17:35:00Z"
}
```

---

### 6️⃣ MÉTRICAS

#### GET /api/v1/metrics/kpis

**Obtener KPIs del sistema**

```
Method: GET
URL: http://localhost:8000/api/v1/metrics/kpis
Headers: -
Body: -

Response: 200 OK
{
  "total_visits": 45,
  "completed_visits": 38,
  "pending_visits": 7,
  "sla_compliance": 95.5,
  "avg_visit_duration_min": 47.3,
  "total_technicians": 5,
  "active_technicians": 4
}
```

#### GET /api/v1/metrics/daily-report

**Reporte diario de métricas**

```
Method: GET
URL: http://localhost:8000/api/v1/metrics/daily-report?date=2026-03-26
Headers: -
Body: -

Response: 200 OK
{
  "date": "2026-03-26",
  "visits_completed": 12,
  "visits_pending": 3,
  "total_km": 156.8,
  "total_time_min": 580,
  "incidents_resolved": 2,
  "sla_breaches": 1
}
```

---

### 7️⃣ IMPREVISTOS

#### POST /api/v1/imprevistos

**Reportar imprevisto durante visita**

```
Method: POST
URL: http://localhost:8000/api/v1/imprevistos
Headers: Content-Type: application/json

Body: {
  "visit_id": 1,
  "tipo": "trafico",
  "descripcion": "Accidente en autopista, desviado 30min"
}

Response: 201 Created
{
  "id": 1,
  "visit_id": 1,
  "tipo": "trafico",
  "descripcion": "Accidente en autopista, desviado 30min",
  "created_at": "2026-03-26T17:35:00Z"
}
```

#### GET /api/v1/imprevistos/{visit_id}

**Obtener imprevistos de visita**

```
Method: GET
URL: http://localhost:8000/api/v1/imprevistos/1
Headers: -
Body: -

Response: 200 OK
[
  {
    "id": 1,
    "visit_id": 1,
    "tipo": "trafico",
    "descripcion": "Accidente en autopista",
    "created_at": "2026-03-26T17:35:00Z"
  }
]
```

---

## 🗂️ DATA MODELS

### User (NEW)

```typescript
interface User {
  id: number;
  name: string;                   // Nombre completo
  telefono: string;                // Teléfono contacto
  email: string;                   // Email único
  is_technician: boolean;          // ¿Es técnico?
  technician_id?: number;          // FK a technician
  created_at: string;              // Timestamp ISO
}
```

### Technician

```typescript
interface Technician {
  id: number;
  name: string;
  zone: string;                    // Zona geográfica ("Tarragona", "Reus", etc.)
}
```

### Visit

```typescript
interface Visit {
  id: number;
  contract_id?: number;            // FK
  incidence_id?: number;           // FK
  technician_id?: number;          // FK
  visit_type: string;              // "preventivo" | "correctivo..." 
  status: string;                  // "pending" | "in_progress" | "completed"
  planned_date: string;            // ISO timestamp
  address?: string;
  postal_code?: string;
  estimated_duration: number;      // minutos
}
```

### Route (Calculated)

```typescript
interface CalculatedRoute {
  coordenadas_ruta: Coordinate[];  // Waypoints de la ruta
  segmentos: Segment[];            // Detalles por tramo
  distancia_total_km: number;
  tiempo_total_min: number;
  jornada_valida: boolean;
  mensaje_jornada: string;
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface Segment {
  desde: number;                   // índice origen
  hasta: number;                   // índice destino
  distancia_km: number;
  tiempo_min: number;
  direccion?: string;
}
```

---

## ❌ ERROR HANDLING

### HTTP Status Codes

| Code | Meaning | Ejemplo |
|------|---------|---------|
| **200** | OK | Recurso obtenido/actualizado exitosamente |
| **201** | Created | Recurso creado exitosamente |
| **204** | No Content | Eliminar exitoso |
| **400** | Bad Request | Datos malformados |
| **404** | Not Found | Recurso no existe |
| **409** | Conflict | Email duplicado, constraint violation |
| **422** | Unprocessable Entity | Validación de campos falla |
| **500** | Internal Server Error | Error en el servidor (ej: scikit-learn falta) |

### Error Response Format

```typescript
// Sucess: 2xx
{
  "id": 1,
  "name": "Juan",
  ...
}

// Error: 4xx/5xx (Pydantic validation)
{
  "detail": [
    {
      "loc": ["body", "technician_id"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}

// Error: 4xx/5xx (Custom message)
{
  "detail": "User with email 'juan@test.com' already exists"
}
```

### Manejo en Frontend

```typescript
// Función helper para fetch
async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`http://localhost:8000${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `API Error: ${response.status}`);
  }
  
  return response.json() as Promise<T>;
}

// Uso
try {
  const user = await apiCall<User>('/api/v1/users/1');
} catch (error) {
  console.error('Failed to fetch user:', error.message);
  // Mostrar toast/alert al usuario
}
```

---

## 💻 EXAMPLES IN TYPESCRIPT

### 1️⃣ Crear Usuario

```typescript
// src/lib/api/users.ts
import { User } from '@/types';

export const createUser = async (data: {
  name: string;
  telefono: string;
  email: string;
  passwd: string;
  is_technician?: boolean;
  zone?: string;
}): Promise<User> => {
  const response = await fetch('http://localhost:8000/api/v1/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }
  
  return response.json();
};

// Uso en componente
export default function CreateUserForm() {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      const user = await createUser({
        name: formData.get('name'),
        telefono: formData.get('phone'),
        email: formData.get('email'),
        passwd: formData.get('password'),
        is_technician: formData.get('isTechnician') === 'on',
        zone: formData.get('zone')
      });
      alert(`User created: ${user.name}`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(new FormData(e.currentTarget));
    }}>
      <input name="name" required />
      <input name="phone" required />
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <label>
        <input name="isTechnician" type="checkbox" />
        Technician?
      </label>
      {/* Show zone input if isTechnician */}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

### 2️⃣ Calcular Ruta

```typescript
// src/lib/api/routes.ts
import { CalculatedRoute } from '@/types';

export const calculateRoute = async (
  technicianId: number,
  visitIds: number[],
  origin: { latitude: number; longitude: number }
): Promise<CalculatedRoute> => {
  const response = await fetch('http://localhost:8000/api/v1/ruta/calcular', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      technician_id: technicianId,
      visit_ids_ordered: visitIds,
      origen: origin
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }
  
  return response.json();
};

// Uso en dashboard
export default function RouteCalculator() {
  const [route, setRoute] = useState<CalculatedRoute | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleCalculate = async () => {
    setLoading(true);
    try {
      const result = await calculateRoute(2, [1, 2, 3], {
        latitude: 41.1189,
        longitude: 1.2445
      });
      
      if (!result.jornada_valida) {
        alert(`⚠️ Working day exceeds 480 minutes: ${result.mensaje_jornada}`);
      }
      
      setRoute(result);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <button onClick={handleCalculate} disabled={loading}>
        {loading ? 'Calculating...' : 'Calculate Route'}
      </button>
      
      {route && (
        <div>
          <h3>Route Calculated</h3>
          <p>Distance: {route.distancia_total_km.toFixed(2)} km</p>
          <p>Time: {Math.round(route.tiempo_total_min)} min</p>
          <p>Valid: {route.jornada_valida ? '✅' : '❌'}</p>
          
          {/* Map component con route.coordenadas_ruta */}
          <MapComponent coordinates={route.coordenadas_ruta} />
        </div>
      )}
    </div>
  );
}
```

### 3️⃣ Listar Usuarios con React Query

```typescript
// src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/types';

const API_BASE = 'http://localhost:8000/api/v1';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json() as Promise<User[]>;
    }
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<User, 'id' | 'created_at'>) => {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json() as Promise<User>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

// Uso en componente
export default function UsersList() {
  const { data: users, isLoading } = useUsers();
  const createMutation = useCreateUser();
  
  return (
    <div>
      <h2>Users</h2>
      {isLoading && <p>Loading...</p>}
      {users?.map(user => (
        <div key={user.id}>
          <h3>{user.name}</h3>
          <p>Email: {user.email}</p>
          <p>Technician: {user.is_technician ? 'Yes' : 'No'}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🎌 WEBSOCKET (Bonus)

Para actualización en tiempo real de visitas, considerar WebSocket en fase 2:

```typescript
// Ejemplo (aún no implementado)
const ws = new WebSocket('ws://localhost:8000/ws/visits/2');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // {type: "visit_completed", visit_id: 1, time: "17:45"}
  setVisits(prev => prev.map(v => v.id === update.visit_id ? {...v, status: 'completed'} : v));
};

ws.send(JSON.stringify({ action: 'subscribe', visit_id: 1 }));
```

---

## ✅ CHECKLIST PARA INTEGRACIÓN

- [ ] **Backend ejecutándose** en `http://localhost:8000`
- [ ] **CORS habilitado** (verificar en red requests)
- [ ] **Seed data creado** (`python seed.py`)
- [ ] **Documentación Swagger** accesible en `/docs`
- [ ] **Endpoints probados** con Postman/Curl
- [ ] **TypeScript types definidos** (User, Visit, Route, etc.)
- [ ] **API client functions** creadas en `src/lib/api/`
- [ ] **Error handling** implementado en componentes
- [ ] **Loading states** añadidos
- [ ] **E2E testing** completado

---

## 📞 TROUBLESHOOTING

### Error: CORS blocked request
```
❌ Access to XMLHttpRequest has been blocked by CORS policy
✅ Solución: Verificar que backend tiene CORS habilitado
   - GET http://localhost:8000/health → debe funcionar
```

### Error: 500 en /ruta/calcular
```
❌ ImportError: scikit-learn must be installed
✅ Solución: pip install scikit-learn==1.7.2 + restart uvicorn
```

### Error: 404 en /api/v1/users
```
❌ endpoint not found
✅ Solución: Verificar que router está registrado en main.py
```

### Error: Email duplicado
```
❌ 409 Conflict
✅ Solución: Usar email único en crear usuario
```

---

**Document Version: 1.0.0**  
**Last Updated: 26 Marzo 2026**  
**Status: Ready for Integration**
