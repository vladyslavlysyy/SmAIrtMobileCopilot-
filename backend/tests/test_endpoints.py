"""
test_endpoints.py - Comprehensive test suite for all API endpoints

Tests all endpoints with real database data and validates responses.
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

# Color codes for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_test(name: str):
    """Print test name"""
    print(f"\n{BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"{BLUE}TEST: {name}{RESET}")
    print(f"{BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")


def print_success(msg: str):
    """Print success message"""
    print(f"{GREEN}✓ {msg}{RESET}")


def print_error(msg: str):
    """Print error message"""
    print(f"{RED}✗ {msg}{RESET}")


def print_warning(msg: str):
    """Print warning message"""
    print(f"{YELLOW}⚠ {msg}{RESET}")


def print_info(msg: str):
    """Print info message"""
    print(f"{BLUE}ℹ {msg}{RESET}")


def test_health():
    """Test GET /health endpoint"""
    print_test("Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Health check passed: {data}")
            return True
        else:
            print_error(f"Expected 200, got {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Connection failed: {str(e)}")
        print_warning("Make sure FastAPI server is running: uvicorn main:app --reload")
        return False


def test_visits_endpoint():
    """Test GET /api/v1/visits endpoint"""
    print_test("Visits Endpoint - GET /api/v1/visits")
    
    try:
        # Test with technician_id=1 and today's date
        today = date.today().isoformat()
        params = {
            "technician_id": 1,
            "date": today,
        }
        
        print_info(f"Requesting visits for technician_id={params['technician_id']}, date={today}")
        response = requests.get(f"{BASE_URL}/api/v1/visits", params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Got {len(data)} visits")
            
            if data:
                visit = data[0]
                required_fields = [
                    "id", "assignable_id", "technician_id", "visit_type",
                    "status", "planned_date", "estimated_duration", "score",
                    "latitude", "longitude", "postal_code"
                ]
                
                missing = [f for f in required_fields if f not in visit]
                if missing:
                    print_error(f"Missing fields: {missing}")
                    return False
                
                print_info(f"Sample visit: {json.dumps(visit, indent=2, default=str)[:500]}...")
                print_success("All required fields present")
                return True
            else:
                print_warning("No visits found for this technician on this date (empty list is OK)")
                return True
        else:
            print_error(f"Expected 200, got {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False


def test_visits_week_endpoint():
    """Test GET /api/v1/visits/week endpoint"""
    print_test("Weekly Load Endpoint - GET /api/v1/visits/week")
    
    try:
        # Get Monday of current week
        today = date.today()
        week_start = (today - timedelta(days=today.weekday())).isoformat()
        
        params = {
            "technician_id": 1,
            "week_start": week_start,
        }
        
        print_info(f"Requesting week load for technician_id={params['technician_id']}, week_start={week_start}")
        response = requests.get(f"{BASE_URL}/api/v1/visits/week", params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Got weekly load data for {len(data)} days")
            print_info(f"Weekly load: {data}")
            return True
        else:
            print_error(f"Expected 200, got {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False


def test_metrics_endpoint():
    """Test GET /api/v1/metrics endpoint"""
    print_test("Metrics Endpoint - GET /api/v1/metrics")
    
    try:
        today = date.today()
        month_start = today.replace(day=1).isoformat()
        
        params = {
            "date_from": month_start,
            "date_to": today.isoformat(),
        }
        
        print_info(f"Requesting metrics for date range: {month_start} to {today.isoformat()}")
        response = requests.get(f"{BASE_URL}/api/v1/metrics", params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_success("Metrics retrieved successfully")
            
            required_fields = [
                "completadas", "pendentes", "en_progreso",
                "km_por_tecnico", "horas_efectivas_total",
                "retardos_por_causa", "sla_por_tipo"
            ]
            
            missing = [f for f in required_fields if f not in data]
            if missing:
                print_error(f"Missing fields: {missing}")
                return False
            
            print_info("\n═══ METRICS SUMMARY ═══")
            print_info(f"Completadas: {data['completadas']}")
            print_info(f"Pendentes: {data['pendentes']}")
            print_info(f"En Progreso: {data['en_progreso']}")
            print_info(f"Horas Efectivas: {data['horas_efectivas_total']}h")
            
            if data['km_por_tecnico']:
                print_info(f"\nKM por Técnico:")
                for tech in data['km_por_tecnico'][:3]:  # Show first 3
                    print_info(f"  {tech['technician_name']}: {tech['km_total']} km")
            
            if data['sla_por_tipo']:
                print_info(f"\nSLA por Tipo:")
                for sla in data['sla_por_tipo']:
                    pct = sla.get('porcentaje_sla', 0)
                    print_info(f"  {sla['visit_type']}: {pct}% ({sla['completadas']}/{sla['total']} completadas)")
            
            print_success("All required fields present")
            return True
        else:
            print_error(f"Expected 200, got {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False


def test_metrics_by_technician():
    """Test GET /api/v1/metrics with technician_id filter"""
    print_test("Metrics Endpoint - Filtered by Technician")
    
    try:
        today = date.today()
        month_start = today.replace(day=1).isoformat()
        
        params = {
            "date_from": month_start,
            "date_to": today.isoformat(),
            "technician_id": 1,
        }
        
        print_info(f"Requesting metrics for technician_id=1")
        response = requests.get(f"{BASE_URL}/api/v1/metrics", params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print_success("Technician-filtered metrics retrieved successfully")
            print_info(f"Results: Completadas={data['completadas']}, Pendentes={data['pendentes']}, En Progreso={data['en_progreso']}")
            return True
        else:
            print_error(f"Expected 200, got {response.status_code}")
            return False
            
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
        return False


def run_all_tests():
    """Run all endpoint tests"""
    print(f"\n{YELLOW}{'='*50}{RESET}")
    print(f"{YELLOW}  SmAIrt Mobility API - Test Suite{RESET}")
    print(f"{YELLOW}{'='*50}{RESET}")
    
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
            print_error(f"Unexpected error in {test_name}: {str(e)}")
            results[test_name] = False
    
    # Summary
    print(f"\n{YELLOW}{'='*50}{RESET}")
    print(f"{YELLOW}  TEST SUMMARY{RESET}")
    print(f"{YELLOW}{'='*50}{RESET}")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{GREEN}PASS{RESET}" if result else f"{RED}FAIL{RESET}"
        print(f"{status} - {test_name}")
    
    print(f"\n{YELLOW}Results: {passed}/{total} tests passed{RESET}\n")
    
    return all(results.values())


if __name__ == "__main__":
    import time
    
    print("\nWaiting 2 seconds for API to be ready...")
    time.sleep(2)
    
    success = run_all_tests()
    sys.exit(0 if success else 1)
