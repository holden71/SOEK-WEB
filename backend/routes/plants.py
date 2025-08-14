from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text

from db import DbSessionDep
from models import Plant, Unit, Term


router = APIRouter(prefix="/api", tags=["plants"])


@router.get("/plants", response_model=List[Plant])
async def get_plants(db: DbSessionDep):
    result = db.execute(text("SELECT NAME, PLANT_ID FROM UNS_PLANTS ORDER BY NAME"))
    plants = [Plant(name=row[0], plant_id=row[1]) for row in result]
    return plants


@router.get("/units", response_model=List[Unit])
async def get_units(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant to get units for"),
):
    result = db.execute(
        text("SELECT NAME, UNIT_ID FROM UNS_UNITS WHERE PLANT_ID = :plant_id ORDER BY NAME"),
        {"plant_id": plant_id},
    )
    units = [Unit(name=row[0], unit_id=row[1]) for row in result]
    return units


@router.get("/terms", response_model=List[Term])
async def get_terms(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant"),
    unit_id: int = Query(..., description="ID of the unit"),
):
    result = db.execute(
        text(
            """
            SELECT T_NAME, T_ID 
            FROM SRT_TERMS_LOC 
            WHERE PLANT_ID = :plant_id 
            AND UNIT_ID = :unit_id 
            ORDER BY T_NAME
            """
        ),
        {"plant_id": plant_id, "unit_id": unit_id},
    )
    terms = [Term(name=row[0], term_id=row[1]) for row in result]
    return terms


