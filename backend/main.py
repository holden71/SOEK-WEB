#!/usr/bin/env -S uv run

from contextlib import asynccontextmanager
from typing import List

from db import DbSessionDep, DbSessionManager
from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from models import Plant, SearchData, Term, Unit
from settings import settings
from sqlalchemy import inspect, text


@asynccontextmanager
async def lifespan(_app: FastAPI):
    DbSessionManager.initialize()
    yield
    DbSessionManager.dispose()
    print("Database connection closed")


app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/api/plants", response_model=List[Plant])
async def get_plants(db: DbSessionDep):
    """Get all plants from UNS_PLANTS table"""
    result = db.execute(text("SELECT NAME, PLANT_ID FROM UNS_PLANTS ORDER BY NAME"))
    plants = [Plant(name=row[0], plant_id=row[1]) for row in result]
    return plants

@app.get("/api/units", response_model=List[Unit])
async def get_units(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant to get units for")
):
    """Get all units for a specific plant from UNS_UNITS table"""
    result = db.execute(
        text("SELECT NAME, UNIT_ID FROM UNS_UNITS WHERE PLANT_ID = :plant_id ORDER BY NAME"),
        {"plant_id": plant_id}
    )
    units = [Unit(name=row[0], unit_id=row[1]) for row in result]
    return units

@app.get("/api/terms", response_model=List[Term])
async def get_terms(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant"),
    unit_id: int = Query(..., description="ID of the unit")
):
    """Get all terms for a specific plant and unit from SRT_TERMS_LOC table"""
    result = db.execute(
        text("""
            SELECT T_NAME, T_ID 
            FROM SRT_TERMS_LOC 
            WHERE PLANT_ID = :plant_id 
            AND UNIT_ID = :unit_id 
            ORDER BY T_NAME
        """),
        {"plant_id": plant_id, "unit_id": unit_id}
    )
    terms = [Term(name=row[0], term_id=row[1]) for row in result]
    return terms

@app.get("/api/search", response_model=List[SearchData])
async def search_data(
    db: DbSessionDep,
    plant_id: int = Query(..., description="ID of the plant"),
    unit_id: int = Query(..., description="ID of the unit"),
    t_id: int = Query(..., description="Term ID (EKLIST_ID)")
):
    """Search data from SRTN_EK_SEISM_DATA table with dynamic column selection"""
    # First, get all columns from the table
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_EK_SEISM_DATA')
    column_names = [col['name'] for col in columns]
    
    # Build the dynamic query
    query = text(f"""
        SELECT {', '.join(column_names)}
        FROM SRTN_EK_SEISM_DATA
        WHERE PLANT_ID = :plant_id
        AND UNIT_ID = :unit_id
        AND EKLIST_ID = :t_id
    """)
    
    result = db.execute(query, {
        "plant_id": plant_id,
        "unit_id": unit_id,
        "t_id": t_id
    })
    
    # Convert each row to a dictionary with column names as keys
    search_results = []
    for row in result:
        row_dict = {column_names[i]: value for i, value in enumerate(row)}
        search_results.append(SearchData(data=row_dict))
    
    return search_results

if __name__ == "__main__":
    import uvicorn
    
    if settings.dev:
        uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    else:
        uvicorn.run(app, host="0.0.0.0", port=8000)
