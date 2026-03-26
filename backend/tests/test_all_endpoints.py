"""
Runs smoke tests against all registered API endpoints.

Policy:
- Endpoint should never return 500 for a valid-ish request.
- 200/201/404/409/422 are considered acceptable in smoke tests.
"""

from datetime import date
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app


ACCEPTABLE = {200, 201, 404, 409, 422}


def _ok(status_code: int) -> bool:
    return status_code in ACCEPTABLE


def run() -> int:
    client = TestClient(app)

    checks = [
        ("GET /health", lambda: client.get("/health")),
        ("GET /api/v1/visits", lambda: client.get(
            "/api/v1/visits",
            params={"technician_id": 1, "date": date.today().isoformat()},
        )),
        ("GET /api/v1/visits/all", lambda: client.get("/api/v1/visits/all")),
        ("GET /api/v1/visits/all (filtered)", lambda: client.get(
            "/api/v1/visits/all",
            params={"technician_id": 1, "date_from": "2026-03-01", "date_to": "2026-04-30"},
        )),
        ("GET /api/v1/visits/week", lambda: client.get(
            "/api/v1/visits/week",
            params={"technician_id": 1, "week_start": date.today().isoformat()},
        )),
        ("GET /api/v1/metrics", lambda: client.get("/api/v1/metrics")),
        ("GET /api/v1/metrics (ranged)", lambda: client.get(
            "/api/v1/metrics",
            params={"date_from": "2026-03-01", "date_to": "2026-04-30"},
        )),
        ("GET /api/v1/reports/1", lambda: client.get("/api/v1/reports/1")),
        ("POST /api/v1/reports", lambda: client.post(
            "/api/v1/reports",
            json={"visit_id": 1, "report_type": "preventivo", "content_json": "{}"},
        )),
        ("GET /api/v1/imprevistos/1", lambda: client.get("/api/v1/imprevistos/1")),
        ("POST /api/v1/imprevistos", lambda: client.post(
            "/api/v1/imprevistos",
            json={"visit_id": 1, "tipo": "trafico", "descripcion": "smoke test", "tiempo_perdido_min": 5},
        )),
        ("GET /api/v1/users", lambda: client.get("/api/v1/users")),
        ("GET /api/v1/users/1", lambda: client.get("/api/v1/users/1")),
        ("POST /api/v1/users", lambda: client.post(
            "/api/v1/users",
            json={
                "name": "smoke-test-user",
                "username": "smoke_test_user",
                "phone": "000000000",
                "email": "smoke-test-user@example.com",
                "passwd": "x",
                "is_technician": False,
            },
        )),
        ("POST /api/v1/users/1/classify-technician", lambda: client.post(
            "/api/v1/users/1/classify-technician",
            json={"zone": "Tarragona"},
        )),
        ("POST /api/v1/ruta/calcular", lambda: client.post(
            "/api/v1/ruta/calcular",
            json={
                "technician_id": 1,
                "visit_ids_ordered": [1],
                "origen": {"latitude": 41.1, "longitude": 1.2},
            },
        )),
        ("POST /api/v1/ruta/asignar-incidencia", lambda: client.post(
            "/api/v1/ruta/asignar-incidencia",
            json={
                "tecnico_id": "1",
                "ubicacion_actual": {"latitude": 41.1, "longitude": 1.2},
                "ruta_actual_ids": [1],
                "nueva_incidencia_id": 1,
            },
        )),
    ]

    failed = 0
    print("=" * 70)
    print("SMOKE TEST - ALL ENDPOINTS")
    print("=" * 70)

    for label, call in checks:
        try:
            response = call()
            status = response.status_code
            if _ok(status):
                print(f"[+] {label}: {status}")
            else:
                failed += 1
                body = response.text[:300]
                print(f"[-] {label}: {status}")
                print(f"    {body}")
        except Exception as exc:
            failed += 1
            print(f"[-] {label}: exception")
            print(f"    {exc}")

    print("=" * 70)
    print(f"Failures: {failed}")
    print("=" * 70)
    return failed


if __name__ == "__main__":
    raise SystemExit(1 if run() else 0)
