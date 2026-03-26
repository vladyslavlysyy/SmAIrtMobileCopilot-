"""Populate demo data for local backend testing.

Usage:
	.\\venv\\Scripts\\python.exe seed.py
"""

from datetime import datetime, timedelta

from database import SessionLocal
from models import Charger, Contract, Incidence, Technician, Visit, VisitStatus, VisitType


def next_id(db, model) -> int:
	last = db.query(model.id).order_by(model.id.desc()).first()
	return (int(last[0]) + 1) if last and last[0] is not None else 1


def main() -> None:
	db = SessionLocal()
	try:
		existing = db.query(Visit).count()
		if existing > 0:
			print(f"Seed skipped: visit already has {existing} rows.")
			return

		# Chargers (valid coordinates around Tarragona/Reus/Cambrils)
		c1 = Charger(
			id=next_id(db, Charger),
			latitude=41.1189,
			longitude=1.2445,
			postal_code="43001",
			zone="Tarragona",
		)
		c2 = Charger(
			id=c1.id + 1,
			latitude=41.1541,
			longitude=1.1078,
			postal_code="43201",
			zone="Reus",
		)
		c3 = Charger(
			id=c2.id + 1,
			latitude=41.0659,
			longitude=1.0579,
			postal_code="43850",
			zone="Cambrils",
		)
		db.add_all([c1, c2, c3])
		db.flush()

		# Technicians
		t1 = Technician(id=next_id(db, Technician), name="Tech Demo 1", zone="Tarragona")
		t2 = Technician(id=t1.id + 1, name="Tech Demo 2", zone="Reus")
		db.add_all([t1, t2])
		db.flush()

		# Contracts and incidence
		contract1 = Contract(
			id=next_id(db, Contract),
			type="maintenance",
			client_id=1001,
			charger_id=c1.id,
			domain_id=2001,
			start_date=datetime.utcnow().date(),
			end_date=(datetime.utcnow() + timedelta(days=365)).date(),
			number_of_visits=4,
			frequency="mensual",
			status="active",
		)
		contract2 = Contract(
			id=contract1.id + 1,
			type="maintenance",
			client_id=1002,
			charger_id=c2.id,
			domain_id=2002,
			start_date=datetime.utcnow().date(),
			end_date=(datetime.utcnow() + timedelta(days=365)).date(),
			number_of_visits=2,
			frequency="trimestral",
			status="active",
		)
		incidence1 = Incidence(
			id=next_id(db, Incidence),
			charger_id=c3.id,
			domain_id=3001,
			status="open",
			priority="high",
			auto_create_visit=True,
			created_at=datetime.utcnow(),
		)
		db.add_all([contract1, contract2, incidence1])
		db.flush()

		now = datetime.utcnow().replace(second=0, microsecond=0)

		visits = [
			Visit(
				id=next_id(db, Visit),
				contract_id=contract1.id,
				incidence_id=None,
				technician_id=t1.id,
				visit_type=VisitType.maintenance.value,
				status=VisitStatus.pending.value,
				planned_date=now + timedelta(hours=1),
				address="Demo Stop A - Tarragona",
				postal_code="43001",
				location_source="charger_snapshot",
				estimated_duration=45,
			),
			Visit(
				id=next_id(db, Visit) + 1,
				contract_id=contract2.id,
				incidence_id=None,
				technician_id=t1.id,
				visit_type=VisitType.commissioning.value,
				status=VisitStatus.pending.value,
				planned_date=now + timedelta(hours=2, minutes=30),
				address="Demo Stop B - Reus",
				postal_code="43201",
				location_source="charger_snapshot",
				estimated_duration=50,
			),
			Visit(
				id=next_id(db, Visit) + 2,
				contract_id=None,
				incidence_id=incidence1.id,
				technician_id=t1.id,
				visit_type=VisitType.critical_corrective.value,
				status=VisitStatus.pending.value,
				planned_date=now + timedelta(hours=4),
				address="Demo Stop C - Cambrils",
				postal_code="43850",
				location_source="charger_snapshot",
				estimated_duration=60,
			),
		]

		db.add_all(visits)
		db.commit()

		print("Seed completed.")
		print(f"Technician for tests: {t1.id}")
		print("Visit IDs for /api/v1/ruta/calcular:", [v.id for v in visits])

	except Exception:
		db.rollback()
		raise
	finally:
		db.close()


if __name__ == "__main__":
	main()
