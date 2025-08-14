from fastapi import APIRouter, Body
from sqlalchemy import text

from db import DbSessionDep
from models import BuildingCheck, LocationCheck


router = APIRouter(prefix="/api", tags=["locations"])


@router.post("/check-location")
async def check_location(db: DbSessionDep, location: LocationCheck = Body(...)):
    result = db.execute(
        text(
            """
            SELECT COUNT(*) 
            FROM SRTN_EK_SEISM_DATA 
            WHERE PLANT_ID = :plant_id 
            AND UNIT_ID = :unit_id 
            AND BUILDING = :building 
            AND ROOM = :room
            """
        ),
        {
            "plant_id": location.plant_id,
            "unit_id": location.unit_id,
            "building": location.building,
            "room": location.room,
        },
    )
    count = result.scalar()
    return {"exists": count > 0}


@router.post("/check-building")
async def check_building(db: DbSessionDep, data: BuildingCheck = Body(...)):
    result = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM SRTN_EK_SEISM_DATA
            WHERE PLANT_ID = :plant_id
            AND UNIT_ID = :unit_id
            AND BUILDING = :building
            """
        ),
        {"plant_id": data.plant_id, "unit_id": data.unit_id, "building": data.building},
    )
    count = result.scalar()
    return {"exists": count > 0}


