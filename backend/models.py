"""
models.py — Taules ORM alineades amb el table_scheme.sql ACTUAL del contenidor.

IMPORTANT: els camps de planificació (priority, route_order, last_priority_score,
priority_computed_at) i la taula imprevisto NO existeixen encara a la BD.
Quan el company executi migrations.sql s'activaran.
Si s'afegeixen aquí ara, SQLAlchemy farà SELECT d'una columna inexistent → error.

Per tant, la lògica de planificació opera en memòria i no persisteix route_order
fins que les migrations s'apliquin.
"""

from datetime import datetime, date
from sqlalchemy import (
    BigInteger, String, Boolean, Float, Integer,
    Date, DateTime, ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from database import Base


# ─────────────────────────────────────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────────────────────────────────────
class VisitType(str, enum.Enum):
    correctivo_critico    = "correctivo_critico"     # P5 per defecte
    correctivo_no_critico = "correctivo_no_critico"  # P4 per defecte
    diagnosi              = "diagnosi"               # P3 per defecte
    puesta_en_marcha      = "puesta_en_marcha"       # P2 per defecte
    preventivo            = "preventivo"             # P1 per defecte


class VisitStatus(str, enum.Enum):
    pending     = "pending"
    in_progress = "in_progress"
    completed   = "completed"
    blocked     = "blocked"
    cancelled   = "cancelled"


class ReportType(str, enum.Enum):
    puesta_en_marcha = "puesta_en_marcha"
    preventivo       = "preventivo"
    correctivo       = "correctivo"


class ImprevistoType(str, enum.Enum):
    trafico              = "trafico"
    material             = "material"
    cliente              = "cliente"
    incidencia_adicional = "incidencia_adicional"


# Prioritat per defecte derivada del tipus de visita
DEFAULT_PRIORITY: dict[str, int] = {
    "correctivo_critico":    5,
    "correctivo_no_critico": 4,
    "diagnosi":              3,
    "puesta_en_marcha":      2,
    "preventivo":            1,
}

# Coordenades de referència per zona (inici/fi de jornada del tècnic)
# S'usen per calcular el viatge d'anada i tornada al dipòsit.
ZONE_DEPOTS: dict[str, tuple[float, float]] = {
    "Tarragona": (41.1189, -1.2445),
    "Reus":      (41.1541, -1.1078),
    "Cambrils":  (41.0659, -1.0579),
    "Valls":     (41.2858, -1.2520),
    "Tortosa":   (40.8121,  0.5213),
}
DEFAULT_DEPOT = (41.1189, -1.2445)  # Tarragona com a fallback


# ─────────────────────────────────────────────────────────────────────────────
# CHARGER
# ─────────────────────────────────────────────────────────────────────────────
class Charger(Base):
    __tablename__ = "charger"

    id:          Mapped[int]          = mapped_column(BigInteger,  primary_key=True, autoincrement=True)
    latitude:    Mapped[float | None] = mapped_column(Float,       nullable=True)
    longitude:   Mapped[float | None] = mapped_column(Float,       nullable=True)
    postal_code: Mapped[str | None]   = mapped_column(String(20),  nullable=True)
    zone:        Mapped[str | None]   = mapped_column(String(255), nullable=True)

    contracts:  Mapped[list["Contract"]]  = relationship("Contract",  back_populates="charger")
    incidences: Mapped[list["Incidence"]] = relationship("Incidence", back_populates="charger")


# ─────────────────────────────────────────────────────────────────────────────
# TECHNICIAN
# ─────────────────────────────────────────────────────────────────────────────
class Technician(Base):
    __tablename__ = "technician"

    id:   Mapped[int]        = mapped_column(BigInteger,  primary_key=True, autoincrement=True)
    name: Mapped[str]        = mapped_column(String(255), nullable=False)
    zone: Mapped[str | None] = mapped_column(String(255), nullable=True)

    visits: Mapped[list["Visit"]] = relationship("Visit", back_populates="technician")

    @property
    def depot(self) -> tuple[float, float]:
        """Coordenades del dipòsit/inici de jornada, per zona."""
        return ZONE_DEPOTS.get(self.zone or "", DEFAULT_DEPOT)


# ─────────────────────────────────────────────────────────────────────────────
# CONTRACT
# ─────────────────────────────────────────────────────────────────────────────
class Contract(Base):
    __tablename__ = "contract"

    id:               Mapped[int]          = mapped_column(BigInteger,  primary_key=True, autoincrement=True)
    type:             Mapped[str | None]   = mapped_column(String(255), nullable=True)
    client_id:        Mapped[int | None]   = mapped_column(BigInteger,  nullable=True)
    charger_id:       Mapped[int | None]   = mapped_column(BigInteger,  ForeignKey("charger.id"), nullable=True)
    domain_id:        Mapped[int | None]   = mapped_column(BigInteger,  nullable=True)
    start_date:       Mapped[date | None]  = mapped_column(Date,        nullable=True)
    end_date:         Mapped[date | None]  = mapped_column(Date,        nullable=True)
    number_of_visits: Mapped[int]          = mapped_column(Integer,     default=1)
    frequency:        Mapped[str | None]   = mapped_column(String(255), nullable=True)
    status:           Mapped[str]          = mapped_column(String(255), default="active")

    charger: Mapped["Charger | None"] = relationship("Charger", back_populates="contracts")
    visits:  Mapped[list["Visit"]]    = relationship("Visit",   back_populates="contract")


# ─────────────────────────────────────────────────────────────────────────────
# INCIDENCE
# ─────────────────────────────────────────────────────────────────────────────
class Incidence(Base):
    __tablename__ = "incidence"

    id:                Mapped[int]         = mapped_column(BigInteger,  primary_key=True, autoincrement=True)
    charger_id:        Mapped[int | None]  = mapped_column(BigInteger,  ForeignKey("charger.id"), nullable=True)
    domain_id:         Mapped[int | None]  = mapped_column(BigInteger,  nullable=True)
    status:            Mapped[str]         = mapped_column(String(255), default="open")
    priority:          Mapped[str | None]  = mapped_column(String(255), nullable=True)
    auto_create_visit: Mapped[bool]        = mapped_column(Boolean,     default=False)
    created_at:        Mapped[datetime]    = mapped_column(DateTime,    default=datetime.utcnow)

    charger: Mapped["Charger | None"] = relationship("Charger", back_populates="incidences")
    visits:  Mapped[list["Visit"]]    = relationship("Visit",   back_populates="incidence")


# ─────────────────────────────────────────────────────────────────────────────
# VISIT — entitat central
#
# Les coordenades NO es guarden aquí. Es resolen via:
#   visit.charger_coords → contract.charger o incidence.charger
#
# Camps de planificació (priority, route_order...) pendents de migrations.sql.
# Fins aleshores, la prioritat es deriva de visit_type via DEFAULT_PRIORITY.
# ─────────────────────────────────────────────────────────────────────────────
class Visit(Base):
    __tablename__ = "visit"

    id:            Mapped[int]         = mapped_column(BigInteger,  primary_key=True, autoincrement=True)
    contract_id:   Mapped[int | None]  = mapped_column(BigInteger,  ForeignKey("contract.id"),   nullable=True)
    incidence_id:  Mapped[int | None]  = mapped_column(BigInteger,  ForeignKey("incidence.id"),  nullable=True)
    technician_id: Mapped[int | None]  = mapped_column(BigInteger,  ForeignKey("technician.id"), nullable=True)

    visit_type:         Mapped[str]        = mapped_column(String(255), nullable=False)
    status:             Mapped[str]        = mapped_column(String(255), nullable=False, default="pending")
    planned_date:       Mapped[datetime]   = mapped_column(DateTime,    nullable=False)
    address:            Mapped[str | None] = mapped_column(String(255), nullable=True)
    postal_code:        Mapped[str | None] = mapped_column(String(255), nullable=True)
    location_source:    Mapped[str | None] = mapped_column(String(255), default="charger_snapshot")
    estimated_duration: Mapped[int]        = mapped_column(Integer,     default=45)

    # Relacions
    contract:    Mapped["Contract | None"]   = relationship("Contract",   back_populates="visits")
    incidence:   Mapped["Incidence | None"]  = relationship("Incidence",  back_populates="visits")
    technician:  Mapped["Technician | None"] = relationship("Technician", back_populates="visits")
    report:      Mapped["Report | None"]     = relationship("Report",     back_populates="visit", uselist=False)

    @property
    def effective_priority(self) -> int:
        """Prioritat derivada de visit_type. Quan arribin les migrations,
        aquest mètode llegirà el camp `priority` directament."""
        return DEFAULT_PRIORITY.get(self.visit_type, 1)

    @property
    def _charger(self) -> "Charger | None":
        if self.contract and self.contract.charger:
            return self.contract.charger
        if self.incidence and self.incidence.charger:
            return self.incidence.charger
        return None

    @property
    def lat(self) -> float | None:
        c = self._charger
        return c.latitude if c else None

    @property
    def lon(self) -> float | None:
        c = self._charger
        return c.longitude if c else None


# ─────────────────────────────────────────────────────────────────────────────
# REPORT
# content_json pendent de migrations.sql — no s'afegeix aquí fins aleshores
# ─────────────────────────────────────────────────────────────────────────────
class Report(Base):
    __tablename__ = "report"

    id:          Mapped[int]        = mapped_column(BigInteger,  primary_key=True, autoincrement=True)
    visit_id:    Mapped[int]        = mapped_column(BigInteger,  ForeignKey("visit.id"), nullable=False, unique=True)
    report_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status:      Mapped[str]        = mapped_column(String(255), default="draft")
    created_at:  Mapped[datetime]   = mapped_column(DateTime,    default=datetime.utcnow)

    visit: Mapped["Visit"] = relationship("Visit", back_populates="report")


# ─────────────────────────────────────────────────────────────────────────────
# IMPREVISTO
# ─────────────────────────────────────────────────────────────────────────────
class Imprevisto(Base):
    __tablename__ = "imprevisto"

    id:               Mapped[int]          = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    visit_id:         Mapped[int]          = mapped_column(BigInteger, ForeignKey("visit.id"), nullable=False)
    tipo:             Mapped[str]          = mapped_column(String(255), nullable=False)
    descripcion:      Mapped[str | None]   = mapped_column(String(500), nullable=True)
    temps_perdut_min: Mapped[int | None]   = mapped_column(Integer, nullable=True)
    created_at:       Mapped[datetime]     = mapped_column(DateTime, default=datetime.utcnow)

    visit: Mapped["Visit"] = relationship("Visit")