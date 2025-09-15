from typing import List

from fastapi import APIRouter, Query

from db import DbSessionDep
from models import Plant, Unit, Term
from database_utils import get_all_plants, get_units_by_plant, get_terms_by_plant_unit


router = APIRouter(prefix="/api", tags=["plants"])


@router.get("/plants", response_model=List[Plant])
async def get_plants(db: DbSessionDep):
    """Get all plants using SQLAlchemy ORM"""
    plants_orm = get_all_plants(db)
    return [Plant(name=plant.NAME, plant_id=plant.PLANT_ID) for plant in plants_orm]


@router.get("/units", response_model=List[Unit])
async def get_units(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant to get units for"),
):
    """Get units by plant using SQLAlchemy ORM"""
    units_orm = get_units_by_plant(db, plant_id)
    return [Unit(name=unit.NAME, unit_id=unit.UNIT_ID) for unit in units_orm]


@router.get("/terms", response_model=List[Term])
async def get_terms(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant"),
    unit_id: int = Query(..., description="ID of the unit"),
):
    """Get terms by plant and unit using SQLAlchemy ORM"""
    terms_orm = get_terms_by_plant_unit(db, plant_id, unit_id)
    return [Term(name=term.T_NAME, term_id=term.T_ID) for term in terms_orm]


