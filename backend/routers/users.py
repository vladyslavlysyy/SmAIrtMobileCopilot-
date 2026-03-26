"""Endpoints de usuarios basados en user_info y clasificación opcional a técnico."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import UserInfo, Technician
from schemas import UserInfoCreate, UserInfoOut, ClassifyTechnicianRequest

router = APIRouter(prefix="/api/v1/users", tags=["users"])


def _next_technician_id(db: Session) -> int:
    """Fallback para esquemas legacy donde technician.id no tiene autoincrement."""
    last = db.query(Technician.id).order_by(Technician.id.desc()).first()
    return (int(last[0]) + 1) if last and last[0] is not None else 1


@router.post("", response_model=UserInfoOut, status_code=201)
def create_user(payload: UserInfoCreate, db: Session = Depends(get_db)) -> UserInfoOut:
    """
    Crea un registro en user_info con name, telefono, email, passwd.
    Si is_technician=true, también crea (o vincula) su clasificación en technician.
    """
    existing = db.query(UserInfo).filter(UserInfo.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email.")

    technician_id = None
    if payload.is_technician:
        technician = Technician(id=_next_technician_id(db), name=payload.name, zone=payload.zone)
        db.add(technician)
        db.flush()
        technician_id = technician.id

    user = UserInfo(
        name=payload.name,
        telefono=payload.telefono,
        email=payload.email,
        passwd=payload.passwd,
        is_technician=payload.is_technician,
        technician_id=technician_id,
    )

    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="No se pudo crear el usuario (email duplicado).") from exc

    db.refresh(user)
    return user


@router.get("", response_model=list[UserInfoOut])
def list_users(db: Session = Depends(get_db)) -> list[UserInfoOut]:
    return db.query(UserInfo).order_by(UserInfo.id.desc()).all()


@router.get("/{user_id}", response_model=UserInfoOut)
def get_user(user_id: int, db: Session = Depends(get_db)) -> UserInfoOut:
    user = db.query(UserInfo).filter(UserInfo.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return user


@router.post("/{user_id}/classify-technician", response_model=UserInfoOut)
def classify_user_as_technician(
    user_id: int,
    payload: ClassifyTechnicianRequest,
    db: Session = Depends(get_db),
) -> UserInfoOut:
    user = db.query(UserInfo).filter(UserInfo.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if user.technician_id:
        technician = db.query(Technician).filter(Technician.id == user.technician_id).first()
        if technician and payload.zone is not None:
            technician.zone = payload.zone
        user.is_technician = True
    else:
        technician = Technician(id=_next_technician_id(db), name=user.name, zone=payload.zone)
        db.add(technician)
        db.flush()
        user.technician_id = technician.id
        user.is_technician = True

    db.commit()
    db.refresh(user)
    return user
