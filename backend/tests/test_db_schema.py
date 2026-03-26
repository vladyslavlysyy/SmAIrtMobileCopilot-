"""
test_db_schema.py - Verify database schema and data availability

This script checks:
1. Database connectivity
2. Table existence and row counts
3. Data quality (coordinates, required fields)
4. Sample data for testing
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import engine, SessionLocal
from sqlalchemy import text, inspect

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_header(title: str):
    print(f"\n{BLUE}{'═' * 60}{RESET}")
    print(f"{BLUE}{title:^60}{RESET}")
    print(f"{BLUE}{'═' * 60}{RESET}")


def print_success(msg: str):
    print(f"{GREEN}✓{RESET} {msg}")


def print_error(msg: str):
    print(f"{RED}✗{RESET} {msg}")


def print_warning(msg: str):
    print(f"{YELLOW}⚠{RESET} {msg}")


def print_info(msg: str):
    print(f"{BLUE}ℹ{RESET} {msg}")


def check_connection():
    """Test database connection"""
    print_header("Database Connection")
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print_success("Connected to PostgreSQL")
            return True
    except Exception as e:
        print_error(f"Connection failed: {str(e)}")
        return False


def check_tables():
    """Check if all required tables exist"""
    print_header("Database Schema")
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    required_tables = [
        'visit', 'assignable', 'charger', 'technician',
        'imprevisto', 'user_info', 'report', 'contract', 'incidence'
    ]
    
    db = SessionLocal()
    all_ok = True
    
    for table in required_tables:
        if table in tables:
            # Get row count
            result = db.execute(text(f"SELECT COUNT(*) as cnt FROM {table}"))
            count = result.scalar()
            print_success(f"Table '{table}' exists with {count} rows")
        else:
            print_error(f"Table '{table}' NOT FOUND")
            all_ok = False
    
    db.close()
    return all_ok


def check_visit_data():
    """Check visit data quality"""
    print_header("Visit Data Quality")
    
    db = SessionLocal()
    
    try:
        # Check visits with charger data
        result = db.execute(text("""
            SELECT 
                COUNT(v.id) as total_visits,
                COUNT(DISTINCT v.technician_id) as technicians,
                COUNT(CASE WHEN c.latitude IS NOT NULL THEN 1 END) as visits_with_coords,
                COUNT(DISTINCT v.status) as unique_statuses,
                COUNT(DISTINCT v.visit_type) as unique_visit_types
            FROM visit v
            LEFT JOIN assignable a ON v.assignable_id = a.id
            LEFT JOIN charger c ON a.charger_id = c.id
        """))
        
        row = result.fetchone()
        print_info(f"Total visits: {row[0]}")
        print_info(f"Unique technicians: {row[1]}")
        print_info(f"Visits with charger coordinates: {row[2]}")
        print_info(f"Unique statuses: {row[3]}")
        print_info(f"Unique visit types: {row[4]}")
        
        if row[2] > 0:
            print_success("Charger coordinates available for SQL JOINs")
        else:
            print_warning("No charger coordinates found - check data integrity")
        
        # Sample data
        print_info("\nSample visit with charger data:")
        sample = db.execute(text("""
            SELECT 
                v.id,
                v.technician_id,
                v.visit_type,
                v.status,
                c.latitude,
                c.longitude,
                c.postal_code
            FROM visit v
            LEFT JOIN assignable a ON v.assignable_id = a.id
            LEFT JOIN charger c ON a.charger_id = c.id
            LIMIT 1
        """))
        
        sample_row = sample.fetchone()
        if sample_row:
            print_info(f"  Visit ID: {sample_row[0]}")
            print_info(f"  Technician: {sample_row[1]}")
            print_info(f"  Type: {sample_row[2]}, Status: {sample_row[3]}")
            print_info(f"  Charger Coords: ({sample_row[4]}, {sample_row[5]})")
            print_info(f"  Postal Code: {sample_row[6]}")
        
        return True
        
    except Exception as e:
        print_error(f"Data quality check failed: {str(e)}")
        return False
    finally:
        db.close()


def check_technician_data():
    """Check technician data"""
    print_header("Technician Data")
    
    db = SessionLocal()
    
    try:
        result = db.execute(text("""
            SELECT 
                COUNT(*) as total_techs,
                COUNT(DISTINCT zone) as unique_zones,
                COUNT(DISTINCT vehicle) as unique_vehicles
            FROM technician
        """))
        
        row = result.fetchone()
        print_info(f"Total technicians: {row[0]}")
        print_info(f"Unique zones: {row[1]}")
        print_info(f"Unique vehicles: {row[2]}")
        
        # Sample technician
        print_info("\nSample technicians:")
        sample = db.execute(text("""
            SELECT id, name, zone, vehicle, status
            FROM technician
            LIMIT 3
        """))
        
        for tech in sample:
            print_info(f"  #{tech[0]}: {tech[1]} (zone={tech[2]}, vehicle={tech[3]}, status={tech[4]})")
        
        return True
        
    except Exception as e:
        print_error(f"Technician data check failed: {str(e)}")
        return False
    finally:
        db.close()


def check_charger_data():
    """Check charger data"""
    print_header("Charger Data")
    
    db = SessionLocal()
    
    try:
        result = db.execute(text("""
            SELECT 
                COUNT(*) as total_chargers,
                COUNT(DISTINCT zone) as unique_zones,
                COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as with_coords
            FROM charger
        """))
        
        row = result.fetchone()
        print_info(f"Total chargers: {row[0]}")
        print_info(f"Unique zones: {row[1]}")
        print_info(f"Chargers with coordinates: {row[2]}")
        
        if row[2] > 0:
            print_success("Charger coordinates available for distance calculations")
        
        # Sample charger
        print_info("\nSample chargers with coordinates:")
        sample = db.execute(text("""
            SELECT id, latitude, longitude, postal_code, zone, num_visits
            FROM charger
            WHERE latitude IS NOT NULL
            LIMIT 3
        """))
        
        for charger in sample:
            print_info(f"  #{charger[0]}: ({charger[1]:.4f}, {charger[2]:.4f}) | {charger[3]} | zone={charger[4]} | visits={charger[5]}")
        
        return True
        
    except Exception as e:
        print_error(f"Charger data check failed: {str(e)}")
        return False
    finally:
        db.close()


def check_metrics_data():
    """Check data for metrics calculation"""
    print_header("Metrics Data Available")
    
    db = SessionLocal()
    
    try:
        # Status distribution
        result = db.execute(text("""
            SELECT 
                status,
                COUNT(*) as cnt
            FROM visit
            GROUP BY status
            ORDER BY cnt DESC
        """))
        
        print_info("Visit status distribution:")
        for status, cnt in result:
            print_info(f"  {status}: {cnt}")
        
        # Incident types
        result = db.execute(text("""
            SELECT 
                tipo,
                COUNT(*) as cnt
            FROM imprevisto
            GROUP BY tipo
            ORDER BY cnt DESC
        """))
        
        incidents = result.fetchall()
        if incidents:
            print_info("\nIncident types (for retardos_por_causa):")
            for tipo, cnt in incidents:
                print_info(f"  {tipo}: {cnt}")
        else:
            print_warning("No incidents found")
        
        # Visit types
        result = db.execute(text("""
            SELECT 
                visit_type,
                COUNT(*) as cnt,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
            FROM visit
            GROUP BY visit_type
            ORDER BY cnt DESC
        """))
        
        print_info("\nVisit types (for sla_por_tipo):")
        for vtype, cnt, completed in result:
            pct = (completed / cnt * 100) if cnt else 0
            print_info(f"  {vtype}: {cnt} total, {completed} completed ({pct:.1f}%)")
        
        return True
        
    except Exception as e:
        print_error(f"Metrics data check failed: {str(e)}")
        return False
    finally:
        db.close()


def run_all_checks():
    """Run all database checks"""
    print(f"{YELLOW}\n{'═' * 60}")
    print(f"  SmAIrt Mobility Database Schema & Data Diagnostic")
    print(f"{'═' * 60}\n{RESET}")
    
    checks = [
        ("Connection", check_connection),
        ("Tables", check_tables),
        ("Visit Data", check_visit_data),
        ("Technician Data", check_technician_data),
        ("Charger Data", check_charger_data),
        ("Metrics Data", check_metrics_data),
    ]
    
    results = {}
    for name, check_func in checks:
        try:
            results[name] = check_func()
        except Exception as e:
            print_error(f"Unexpected error in {name}: {str(e)}")
            results[name] = False
    
    # Summary
    print_header("Diagnostic Summary")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for check_name, result in results.items():
        status = f"{GREEN}✓{RESET}" if result else f"{RED}✗{RESET}"
        print(f"{status} {check_name}")
    
    print(f"\n{YELLOW}Result: {passed}/{total} checks passed{RESET}\n")
    
    if passed == total:
        print_success("All database checks passed! Ready for metrics calculation.")
    else:
        print_error("Some checks failed. See details above.")
    
    return passed == total


if __name__ == "__main__":
    success = run_all_checks()
    sys.exit(0 if success else 1)
