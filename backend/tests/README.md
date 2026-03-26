# Backend API Test Suite

Comprehensive test suite for all SmAIrt Mobility API endpoints.

## Available Tests

The test suite validates:
- ✅ Health check endpoint (`GET /health`)
- ✅ Visits endpoint (`GET /api/v1/visits`) - Charger data via SQL JOIN
- ✅ Weekly load endpoint (`GET /api/v1/visits/week`)
- ✅ Metrics endpoint (`GET /api/v1/metrics`) - Complete analytics
- ✅ Metrics with technician filter
- ✅ Database connectivity
- ✅ Response schemas and required fields
- ✅ Charger coordinates from PostgreSQL

## Running Tests

### Option 1: Run Tests Manually (Recommended for Development)

**Terminal 1 - Start the server:**
```powershell
cd backend
& .\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Run tests:**
```powershell
cd backend
& .\.venv\Scripts\Activate.ps1
python tests/test_endpoints.py
```

### Option 2: Run Automated Test Suite (Windows)

```powershell
cd backend\tests
& .\..\..\.venv\Scripts\Activate.ps1
& .\run_tests.ps1
```

This will:
1. Start FastAPI server in background
2. Wait for server to be ready
3. Run all tests
4. Stop the server
5. Display results

### Option 3: Run with Pytest

```powershell
cd backend
& .\.venv\Scripts\Activate.ps1
pytest tests/ -v
```

## Test Output Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST: Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Health check passed: {'status': 'ok'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST: Visits Endpoint - GET /api/v1/visits
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Requesting visits for technician_id=1, date=2026-03-26
✓ Got 3 visits
ℹ Sample visit: {"id": 1, "technician_id": 1, "visit_type": "preventivo", ...}
✓ All required fields present

═══════════════════════════════════════════════════════════
  TEST SUMMARY
═══════════════════════════════════════════════════════════
✓ PASS - Health Check
✓ PASS - Visits Endpoint
✓ PASS - Weekly Load Endpoint
✓ PASS - Metrics Endpoint
✓ PASS - Metrics (Technician Filter)

Results: 5/5 tests passed
```

## Key Validations

### Visits Endpoint Validation
- ✅ Returns `list[VisitOut]` schema
- ✅ Includes charger latitude/longitude from SQL JOIN
- ✅ Includes postal_code from charger table
- ✅ Properly ordered by `route_order` then `planned_date`
- ✅ Handles missing coordinates with COALESCE

### Metrics Endpoint Validation
- ✅ Returns `MetricsResponse` with all required fields:
  - `completadas` - Count of completed visits
  - `pendentes` - Count of pending visits
  - `en_progreso` - Count of in-progress visits
  - `km_por_tecnico` - Distance calculated via Haversine
  - `horas_efectivas_total` - Sum of durations
  - `retardos_por_causa` - Grouped by incident type
  - `sla_por_tipo` - SLA compliance by visit type
- ✅ Supports date range filtering
- ✅ Supports technician_id filtering
- ✅ Uses SQL queries (not ORM) for performance

## Database Setup Required

Tests require:
- PostgreSQL running on `localhost:5432`
- Database: `mantenimiento_db`
- User: `admin` / Password: `adminpassword`
- Charger table with at least 1000 records
- Visit table with test data

If using Docker:
```bash
docker run -d \
  --name postgres-db \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=adminpassword \
  -e POSTGRES_DB=mantenimiento_db \
  -p 5432:5432 \
  ivanmoliinero/postgres-mantenimiento-db:v1
```

## Troubleshooting

### "Connection refused" error
- Make sure PostgreSQL is running and accessible on `localhost:5432`
- Check `.env` file has correct credentials: `DB_HOST=localhost`

### "No visits found" warning
- This is normal if no data exists for the test technician on the test date
- Tests still pass with empty lists

### Metrics showing all zeros
- Check that visit records exist with `status='completed'`
- Verify charger coordinates are not NULL in database
- Check that imprevisto records are linked to visits

### Server won't start
- Make sure port 8000 is not in use
- Check all dependencies are installed: `pip install -r requirements.txt`

## API Documentation

Auto-generated Swagger UI available at: `http://localhost:8000/docs`
ReDoc documentation at: `http://localhost:8000/redoc`

## Notes

- Tests use real database (not mocked)
- Tests are read-only (no data modification)
- Test execution takes ~5 seconds total
- Results display summaries and sample data for validation
