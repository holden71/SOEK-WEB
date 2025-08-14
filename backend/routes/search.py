from typing import List

from fastapi import APIRouter, Query
from sqlalchemy import inspect, text

from db import DbSessionDep
from models import SearchData


router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search", response_model=List[SearchData])
async def search_data(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant"),
    unit_id: int = Query(..., description="ID of the unit"),
    t_id: int = Query(..., description="Term ID (EKLIST_ID)"),
):
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_EK_SEISM_DATA')
    column_names = [col['name'] for col in columns]

    query = text(
        f"""
        SELECT {', '.join(column_names)}
        FROM SRTN_EK_SEISM_DATA
        WHERE PLANT_ID = :plant_id
        AND UNIT_ID = :unit_id
        AND EKLIST_ID = :t_id
        """
    )

    result = db.execute(query, {
        "plant_id": plant_id,
        "unit_id": unit_id,
        "t_id": t_id,
    })

    search_results = []
    for row in result:
        row_dict = {column_names[i]: value for i, value in enumerate(row)}
        search_results.append(SearchData(data=row_dict))

    return search_results


