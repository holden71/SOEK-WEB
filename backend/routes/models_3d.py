from typing import List

from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import inspect, text

from db import DbSessionDep
from models import Model3DData, CreateModel3DRequest


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
    # Check if model exists and get file_id
    check_query = text("SELECT MODEL_FILE_ID FROM SRTN_3D_MODELS WHERE MODEL_ID = :model_id")
    result = db.execute(check_query, {"model_id": model_id})
    existing_model = result.fetchone()

    if not existing_model:
        raise HTTPException(status_code=404, detail="3D модель не знайдена")

    model_file_id = existing_model[0]

    # Delete the associated file first
    if model_file_id:
        delete_file_query = text("DELETE FROM SRTN_FILES WHERE FILE_ID = :file_id")
        db.execute(delete_file_query, {"file_id": model_file_id})

    # Delete the model
    delete_query = text("DELETE FROM SRTN_3D_MODELS WHERE MODEL_ID = :model_id")
    db.execute(delete_query, {"model_id": model_id})
    db.commit()

    return {"message": "3D модель та пов'язаний файл успішно видалені"}


@router.post("/models_3d", response_model=Model3DData)
async def create_3d_model(db: DbSessionDep, model_data: CreateModel3DRequest):
    try:
        # Get next MODEL_ID
        result = db.execute(text("SELECT NVL(MAX(MODEL_ID), 0) + 1 FROM SRTN_3D_MODELS"))
        new_model_id = result.scalar()

        # Get next FILE_ID for the model file
        result = db.execute(text("SELECT NVL(MAX(FILE_ID), 0) + 1 FROM SRTN_FILES"))
        new_file_id = result.scalar()

        # Convert file content
        file_bytes = bytes(model_data.file_content) if model_data.file_content else None

        # Find file type by extension
        file_type_result = db.execute(text("SELECT FILE_TYPE_ID FROM SRTN_FILE_TYPES WHERE DEF_EXT = :extension"), {"extension": model_data.file_extension})
        file_type_row = file_type_result.fetchone()

        if not file_type_row:
            raise HTTPException(status_code=400, detail=f"Тип файлу з розширенням '{model_data.file_extension}' не знайдено в базі даних")

        file_type_id = file_type_row[0]

        # Insert file first
        insert_file_query = text("""
            INSERT INTO SRTN_FILES (FILE_ID, FILE_TYPE_ID, FILE_NAME, DESCR, DATA, SH_DESCR)
            VALUES (:file_id, :file_type_id, :file_name, :descr, :data, :sh_descr)
        """)

        db.execute(insert_file_query, {
            "file_id": new_file_id,
            "file_type_id": file_type_id,
            "file_name": model_data.file_name,
            "descr": model_data.descr or None,
            "data": file_bytes,
            "sh_descr": f"Файл 3D моделі: {model_data.sh_name}"
        })

        # Insert 3D model
        insert_model_query = text("""
            INSERT INTO SRTN_3D_MODELS (MODEL_ID, SH_NAME, DESCR, MODEL_FILE_ID)
            VALUES (:model_id, :sh_name, :descr, :model_file_id)
        """)

        db.execute(insert_model_query, {
            "model_id": new_model_id,
            "sh_name": model_data.sh_name,
            "descr": model_data.descr or None,
            "model_file_id": new_file_id
        })

        db.commit()

        # Return created model info
        return Model3DData(data={
            "MODEL_ID": new_model_id,
            "SH_NAME": model_data.sh_name,
            "DESCR": model_data.descr,
            "MODEL_FILE_ID": new_file_id
        })

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Не вдалося створити 3D модель: {str(e)}")
