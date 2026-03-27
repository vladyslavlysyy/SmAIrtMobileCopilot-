"""Endpoints de usuarios basados en user_info y clasificación opcional a técnico."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db
from schemas import UserInfoCreate, UserInfoOut, ClassifyTechnicianRequest

router = APIRouter(prefix="/api/v1/users", tags=["users"])


def _row_to_user_out(row) -> UserInfoOut:
    return UserInfoOut(
        id=row.id,
        name=row.name,
        username=row.username,
        phone=row.phone,
        email=row.email,
        is_technician=bool(row.technician_id is not None),
        technician_id=row.technician_id,
        created_at=row.created_at,
    )


@router.post("", response_model=UserInfoOut, status_code=201)
def create_user(payload: UserInfoCreate, db: Session = Depends(get_db)) -> UserInfoOut:
    """
    Crea un registro en user_info con name, telefono, email, passwd.
    Si is_technician=true, también crea (o vincula) su clasificación en technician.
    """
    existing = db.execute(
        text("SELECT id FROM user_info WHERE email = :email LIMIT 1"),
        {"email": payload.email},
    ).fetchone()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email.")

    max_id_row = db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM user_info")).fetchone()
    new_id = int(max_id_row.next_id)

    db.execute(
        text(
            """
            INSERT INTO user_info (id, name, username, phone, email, passwd, created_at)
            VALUES (:id, :name, :username, :phone, :email, :passwd, :created_at)
            """
        ),
        {
            "id": new_id,
            "name": payload.name,
            "username": payload.username or payload.email.split("@")[0],
            "phone": payload.phone,
            "email": payload.email,
            "passwd": payload.passwd,
            "created_at": datetime.utcnow(),
        },
    )

    technician_id = None
    if payload.is_technician:
        print(f'payload.start_work_day')
        db.execute(
            text(
                """
                INSERT INTO technician (id, zone, vehicle, status, start_work_day, end_work_day)
                VALUES (:id, :zone, :vehicle, :status, :start_work_day, :end_work_day)
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {
                "id": new_id,
                "zone": payload.zone,
                "vehicle": "N/A",
                "status": "available",
                "start_work_day": payload.start_work_day,
                "end_work_day": payload.end_work_day,
            },
        )
        technician_id = new_id

    db.commit()

    row = db.execute(
        text(
            """
            SELECT u.id, u.name, u.username, u.phone, u.email, u.created_at, t.id AS technician_id
            FROM user_info u
            LEFT JOIN technician t ON t.id = u.id
            WHERE u.id = :id
            """
        ),
        {"id": new_id},
    ).fetchone()
    return _row_to_user_out(row)


@router.get("", response_model=list[UserInfoOut])
def list_users(db: Session = Depends(get_db)) -> list[UserInfoOut]:
    rows = db.execute(
        text(
            """
            SELECT u.id, u.name, u.username, u.phone, u.email, u.created_at, t.id AS technician_id
            FROM user_info u
            LEFT JOIN technician t ON t.id = u.id
            ORDER BY u.id DESC
            """
        )
    ).fetchall()
    return [_row_to_user_out(r) for r in rows]


@router.get("/{user_id}", response_model=UserInfoOut)
def get_user(user_id: int, db: Session = Depends(get_db)) -> UserInfoOut:
    row = db.execute(
        text(
            """
            SELECT u.id, u.name, u.username, u.phone, u.email, u.created_at, t.id AS technician_id
            FROM user_info u
            LEFT JOIN technician t ON t.id = u.id
            WHERE u.id = :id
            """
        ),
        {"id": user_id},
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return _row_to_user_out(row)


@router.post("/{user_id}/classify-technician", response_model=UserInfoOut)
def classify_user_as_technician(
    user_id: int,
    payload: ClassifyTechnicianRequest,
    db: Session = Depends(get_db),
) -> UserInfoOut:
    user = db.execute(
        text("SELECT id FROM user_info WHERE id = :id"),
        {"id": user_id},
    ).fetchone()
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    db.execute(
        text(
            """
            INSERT INTO technician (id, zone, vehicle, status, start_work_day, end_work_day)
            VALUES (:id, :zone, :vehicle, :status, :start_work_day, :end_work_day)
            ON CONFLICT (id) DO UPDATE SET
              zone = COALESCE(EXCLUDED.zone, technician.zone),
              start_work_day = COALESCE(EXCLUDED.start_work_day, technician.start_work_day),
              end_work_day = COALESCE(EXCLUDED.end_work_day, technician.end_work_day)
            """
        ),
        {
            "id": user_id,
            "zone": payload.zone,
            "vehicle": "N/A",
            "status": "available",
            "start_work_day": payload.start_work_day,
            "end_work_day": payload.end_work_day,
        },
    )
    db.commit()

    row = db.execute(
        text(
            """
            SELECT u.id, u.name, u.username, u.phone, u.email, u.created_at, t.id AS technician_id
            FROM user_info u
            LEFT JOIN technician t ON t.id = u.id
            WHERE u.id = :id
            """
        ),
        {"id": user_id},
    ).fetchone()
    return _row_to_user_out(row)
