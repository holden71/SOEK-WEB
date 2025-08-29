from typing import List

from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import inspect, text

from db import DbSessionDep
from models import Model3DData


router = APIRouter(prefix="/api", tags=["models_3d"])


@router.get("/models_3d", response_model=List[Model3DData])
async def get_3d_models(
    db: DbSessionDep,
):
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_3D_MODELS')
    column_names = [col['name'] for col in columns]

    # Exclude MODEL_PREV1_ID and MODEL_PREV2_ID as requested
    excluded_columns = ['MODEL_PREV1_ID', 'MODEL_PREV2_ID']
    filtered_columns = [col for col in column_names if col not in excluded_columns]

    query = text(
        f"""
        SELECT {', '.join(filtered_columns)}
        FROM SRTN_3D_MODELS
        ORDER BY MODEL_ID
        """
    )

    result = db.execute(query)

    models_data = []
    for row in result:
        row_dict = {filtered_columns[i]: value for i, value in enumerate(row)}
        models_data.append(Model3DData(data=row_dict))

    return models_data


@router.get("/models_3d/{model_id}", response_model=Model3DData)
async def get_3d_model_by_id(
    db: DbSessionDep,
    model_id: int,
):
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_3D_MODELS')
    column_names = [col['name'] for col in columns]

    # Exclude MODEL_PREV1_ID and MODEL_PREV2_ID as requested
    excluded_columns = ['MODEL_PREV1_ID', 'MODEL_PREV2_ID']
    filtered_columns = [col for col in column_names if col not in excluded_columns]

    query = text(
        f"""
        SELECT {', '.join(filtered_columns)}
        FROM SRTN_3D_MODELS
        WHERE MODEL_ID = :model_id
        """
    )

    result = db.execute(query, {"model_id": model_id})

    row = result.fetchone()
    if row:
        row_dict = {filtered_columns[i]: value for i, value in enumerate(row)}
        return Model3DData(data=row_dict)

    return None


@router.delete("/models_3d/{model_id}")
async def delete_3d_model(
    db: DbSessionDep,
    model_id: int,
):
    # Check if model exists
    check_query = text("SELECT MODEL_ID FROM SRTN_3D_MODELS WHERE MODEL_ID = :model_id")
    result = db.execute(check_query, {"model_id": model_id})
    existing_model = result.fetchone()

    if not existing_model:
        raise HTTPException(status_code=404, detail="3D модель не знайдена")

    # Delete the model
    delete_query = text("DELETE FROM SRTN_3D_MODELS WHERE MODEL_ID = :model_id")
    db.execute(delete_query, {"model_id": model_id})
    db.commit()

    return {"message": "3D модель успішно видалена"}
