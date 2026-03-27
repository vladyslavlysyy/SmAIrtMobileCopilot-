import os
import psycopg2
from datetime import datetime, timedelta
import random

def seed_database():
    db_name = os.getenv("POSTGRES_DB")
    db_user = os.getenv("POSTGRES_USER")
    db_password = os.getenv("POSTGRES_PASSWORD")

    try:
        # Conexión al servidor temporal de inicialización de Docker
        conn = psycopg2.connect(
            host="/var/run/postgresql",
            dbname=db_name,
            user=db_user,
            password=db_password
        )
        cur = conn.cursor()

        # 1. Assignable (20 registros)
        for i in range(1, 21):
            status = 'ACTIVE' if i <= 10 else 'PENDING'
            priority = random.randint(1, 5)
            cur.execute(
                "INSERT INTO assignable (id, status, priority, charger_id) VALUES (%s, %s, %s, %s)",
                (i, status, priority, i)
            )

        # 2. Contract (IDs 1 al 10)
        start_date = datetime(2026, 1, 1).date()
        end_date = datetime(2027, 1, 1).date()
        for i in range(1, 11):
            cur.execute(
                "INSERT INTO contract (id, type, client_id, domain_id, start_date, end_date, total_visits, frequency) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (i, 'PREVENTIVE', 100 + i, 500, start_date, end_date, 4, 'QUARTERLY')
            )

        # 3. Incidence (IDs 11 al 20)
        for i in range(11, 21):
            created_at = datetime.now() - timedelta(days=random.randint(1, 30))
            cur.execute(
                "INSERT INTO incidence (id, domain_id, auto_create_visit, created_at) VALUES (%s, %s, %s, %s)",
                (i, 500, True, created_at)
            )

        # 4. User Info (10 técnicos)
        for i in range(1, 11):
            created_at = datetime.now() - timedelta(days=random.randint(30, 365))
            cur.execute(
                "INSERT INTO user_info (id, name, username, phone, email, created_at, passwd) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (i, f'Técnico {i}', f'tecnico{i}', f'+346000000{i:02d}', f'tecnico{i}@empresa.com', created_at, 'hash_secreto')
            )

        # 5. Technician 
        zonas = ['Tarragona_Centro', 'Reus_Centro', 'Salou_Costa', 'Cambrils_Playa']
        for i in range(1, 11):
            zona = random.choice(zonas)
            cur.execute(
                "INSERT INTO technician (id, zone, vehicle, status, start_work_day, end_work_day) VALUES (%s, %s, %s, %s, %s, %s)",
                (i, zona, f'Furgoneta {i}', 'ON_DUTY', '08:00:00', '16:00:00')
            )

        visit_types = [
            'correctivo_critico',
            'correctivo_no_critico',
            'diagnosi',
            'puesta_en_marcha',
            'preventivo'
        ]

        # 6. Visit 
        for i in range(1, 21):
            tech_id = random.randint(1, 10)
            planned_date = datetime.now() + timedelta(days=random.randint(1, 15))
            visit_type = visit_types[(i - 1) % len(visit_types)]
            cur.execute(
                "INSERT INTO visit (id, assignable_id, technician_id, visit_type, status, planned_date, estimated_duration, score) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (i, i, tech_id, visit_type, 'SCHEDULED', planned_date, 90, None)
            )

        # 6.1 Pending visits en diferentes días y semanas (sin eliminar datos existentes)
        pending_offsets_days = [2, 2, 2, 2, 2, 2, 31, 38, 45, 52]
        for idx, offset_days in enumerate(pending_offsets_days, start=21):
            tech_id = random.randint(1, 10)
            assignable_id = random.randint(1, 20)
            planned_date = datetime.now() + timedelta(days=offset_days)
            visit_type = visit_types[(idx - 21) % len(visit_types)]
            cur.execute(
                "INSERT INTO visit (id, assignable_id, visit_type, status, planned_date, estimated_duration, score) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (idx, assignable_id, visit_type, 'PENDING', planned_date, 90, None)
            )

        # 7. Report 
        for i in range(1, 11):
            created_at = datetime.now()
            cur.execute(
                "INSERT INTO report (id, visit_id, report_type, status, created_at) VALUES (%s, %s, %s, %s, %s)",
                (i, i, 'STANDARD', 'APPROVED', created_at)
            )

        conn.commit()
        cur.close()
        conn.close()

    except Exception as e:
        print(f"Error técnico en script Python: {e}")

if __name__ == "__main__":
    seed_database()