"""
test_endpoints_simple.py - Simple test suite for all API endpoints (Windows compatible)

Tests all endpoints with real database data and validates responses.
Uses ASCII characters only for Windows PowerShell compatibility.
"""

import sys
from datetime import date, datetime, timedelta
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db, engine
from models import Base
import requests
import json

BASE_URL = "http://localhost:8000"


def print_header(title: str):
    print(f"\n{'='*60}")
    print(f"{title:^60}")
    print(f"{'='*60}")


def test_health():
    """Test GET /health endpoint"""
    print_header("Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"[+] Health check passed: {data}")
            return True
        else:
            print(f"[-] Expected 200, got {response.status_code}")
            print(f"[*] Response: {response.text}")
            return False
    except Exception as e:
        print(f"[-] Connection failed: {str(e)}")
        print("[!] Make sure FastAPI server is running: uvicorn main:app --reload")
        return False


def test_visits_endpoint():
    """Test GET /api/v1/visits endpoint"""
    print_header("Visits Endpoint: GET /api/v1/visits")
    
    try:
        today = date.today().isoformat()
        params = {
            "technician_id": 1,
            "date": today,
        }
        
        print(f"[*] Requesting visits for technician_id={params['technician_id']}, date={today}")
        response = requests.get(f"{BASE_URL}/api/v1/visits", params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"[+] Got {len(data)} visits")
            
            if data:
                visit = data[0]
                required_fields = [
                    "id", "assignable_id", "technician_id", "visit_type",
                    "status", "planned_date", "estimated_duration", "score",
                    "latitude", "longitude", "postal_code"
                ]
                
                missing = [f for f in required_fields if f not in visit]
                if missing:
                    print(f"[-] Missing fields: {missing}")
                    return False
                
                print(f"[*] Sample visit (first 400 chars):")
                sample_str = json.dumps(visit, indent=2, default=str)[:400]
                for line in sample_str.split('\n'):
                    print(f"    {line}")
                print("[+] All required fields present")
                return True
            else:
                print("[!] No visits found for this technician on this date")
                return True
        else:
            print(f"[-] Expected 200, got {response.status_code}")
            print(f"[*] Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"[-] Test failed: {str(e)}")
        return False


def test_visits_week_endpoint():
    """Test GET /api/v1/visits/week endpoint"""
    print_header("Weekly Load Endpoint: GET /api/v1/visits/week")
    
    try:
        today = date.today()
        week_start = (today - timedelta(days=today.weekday())).isoformat()
        
        params = {
            "technician_id": 1,
            "week_start": week_start,
        }
        
        print(f"[*] Requesting week load for technician_id={params['technician_id']}, week_start={week_start}")
        response = requests.get(f"{BASE_URL}/api/v1/visits/week", params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"[+] Got weekly load data for {len(data)} days")
            print(f"[*] Weekly load: {data}")
            return True
        else:
            print(f"[-] Expected 200, got {response.status_code}")
            print(f"[*] Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"[-] Test failed: {str(e)}")
        return False


def test_metrics_endpoint():
    """Test GET /api/v1/metrics endpoint"""
    print_header("Metrics Endpoint: GET /api/v1/metrics")
    
    try:
        today = date.today()
        month_start = today.replace(day=1).isoformat()
        
        params = {
            "date_from": month_start,
            "date_to": today.isoformat(),
        }
        
        print(f"[*] Requesting metrics for date range: {month_start} to {today.isoformat()}")
        response = requests.get(f"{BASE_URL}/api/v1/metrics", params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("[+] Metrics retrieved successfully")
            
            required_fields = [
                "completadas", "pendentes", "en_progreso",
                "km_por_tecnico", "horas_efectivas_total",
                "retardos_por_causa", "sla_por_tipo"
            ]
            
            missing = [f for f in required_fields if f not in data]
            if missing:
                print(f"[-] Missing fields: {missing}")
                return False
            
            print("\n===== METRICS SUMMARY =====")
            print(f"Completadas: {data['completadas']}")
            print(f"Pendentes: {data['pendentes']}")
            print(f"En Progreso: {data['en_progreso']}")
            print(f"Horas Efectivas: {data['horas_efectivas_total']}h")
            
            if data['km_por_tecnico']:
                print(f"\nKM por Tecnico (top 3):")
                for tech in data['km_por_tecnico'][:3]:
                    print(f"  {tech['technician_name']}: {tech['km_total']} km")
            
            if data['sla_por_tipo']:
                print(f"\nSLA por Tipo (visit_type: pct% completed/total):")
                for sla in data['sla_por_tipo']:
                    pct = sla.get('porcentaje_sla', 0)
                    print(f"  {sla['visit_type']}: {pct}% ({sla['completadas']}/{sla['total']})")
            
            print("[+] All required fields present")
            return True
        else:
            print(f"[-] Expected 200, got {response.status_code}")
            print(f"[*] Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"[-] Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_metrics_by_technician():
    """Test GET /api/v1/metrics with technician_id filter"""
    print_header("Metrics (Filtered by Technician)")
    
    try:
        today = date.today()
        month_start = today.replace(day=1).isoformat()
        
        params = {
            "date_from": month_start,
            "date_to": today.isoformat(),
            "technician_id": 1,
        }
        
        print(f"[*] Requesting metrics for technician_id=1")
        response = requests.get(f"{BASE_URL}/api/v1/metrics", params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("[+] Technician-filtered metrics retrieved successfully")
            print(f"[*] Results: Completadas={data['completadas']}, Pendentes={data['pendentes']}, En Progreso={data['en_progreso']}")
            return True
        else:
            print(f"[-] Expected 200, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"[-] Test failed: {str(e)}")
        return False


def run_all_tests():
    """Run all endpoint tests"""
    print(f"\n{'='*60}")
    print("  SmAIrt Mobility API - Test Suite")
    print(f"{'='*60}\n")
    
    tests = [
        ("Health Check", test_health),
        ("Visits Endpoint", test_visits_endpoint),
        ("Weekly Load Endpoint", test_visits_week_endpoint),
        ("Metrics Endpoint", test_metrics_endpoint),
        ("Metrics (Technician Filter)", test_metrics_by_technician),
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"[-] Unexpected error in {test_name}: {str(e)}")
            results[test_name] = False
    
    # Summary
    print(f"\n{'='*60}")
    print("  TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "[+] PASS" if result else "[-] FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nResults: {passed}/{total} tests passed\n")
    
    return all(results.values())


if __name__ == "__main__":
    import time
    
    print("\nWaiting 2 seconds for API to be ready...")
    time.sleep(2)
    
    success = run_all_tests()
    sys.exit(0 if success else 1)
