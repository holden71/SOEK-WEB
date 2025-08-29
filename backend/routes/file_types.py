from typing import List

from fastapi import APIRouter, Query, HTTPException
from sqlalchemy import inspect, text

from db import DbSessionDep
from models import FileTypeData, CreateFileTypeRequest


router = APIRouter(prefix="/api", tags=["file_types"])


@router.get("/file_types", response_model=List[FileTypeData])
async def get_file_types(
    db: DbSessionDep,
):
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_FILE_TYPES')
    column_names = [col['name'] for col in columns]

    query = text(
        f"""
        SELECT {', '.join(column_names)}
        FROM SRTN_FILE_TYPES
        ORDER BY FILE_TYPE_ID
        """
    )

    result = db.execute(query)

    file_types_data = []
    for row in result:
        row_dict = {column_names[i]: value for i, value in enumerate(row)}
        file_types_data.append(FileTypeData(data=row_dict))

    return file_types_data


@router.get("/file_types/{file_type_id}", response_model=FileTypeData)
async def get_file_type_by_id(
    db: DbSessionDep,
    file_type_id: int,
):
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_FILE_TYPES')
    column_names = [col['name'] for col in columns]

    query = text(
        f"""
        SELECT {', '.join(column_names)}
        FROM SRTN_FILE_TYPES
        WHERE FILE_TYPE_ID = :file_type_id
        """
    )

    result = db.execute(query, {"file_type_id": file_type_id})

    row = result.fetchone()
    if row:
        row_dict = {column_names[i]: value for i, value in enumerate(row)}
        return FileTypeData(data=row_dict)

    return None


@router.post("/file_types", response_model=FileTypeData)
async def create_file_type(
    db: DbSessionDep,
    file_type_data: CreateFileTypeRequest,
):
    try:
        # Get next FILE_TYPE_ID
        get_max_id_query = text("SELECT NVL(MAX(FILE_TYPE_ID), 0) + 1 FROM SRTN_FILE_TYPES")
        result = db.execute(get_max_id_query)
        new_id = result.scalar()

        # Insert new file type
        insert_query = text(
            """
            INSERT INTO SRTN_FILE_TYPES (FILE_TYPE_ID, NAME, DESCR, DEF_EXT)
            VALUES (:file_type_id, :name, :descr, :def_ext)
            """
        )

        db.execute(insert_query, {
            "file_type_id": new_id,
            "name": file_type_data.name,
            "descr": file_type_data.descr,
            "def_ext": file_type_data.def_ext
        })

        db.commit()

        # Return the created file type
        return FileTypeData(data={
            "FILE_TYPE_ID": new_id,
            "NAME": file_type_data.name,
            "DESCR": file_type_data.descr,
            "DEF_EXT": file_type_data.def_ext
        })

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create file type: {str(e)}")


@router.delete("/file_types/{file_type_id}")
async def delete_file_type(
    db: DbSessionDep,
    file_type_id: int,
):
    # Check if file type exists
    check_query = text("SELECT FILE_TYPE_ID FROM SRTN_FILE_TYPES WHERE FILE_TYPE_ID = :file_type_id")
    result = db.execute(check_query, {"file_type_id": file_type_id})
    existing_file_type = result.fetchone()

    if not existing_file_type:
        raise HTTPException(status_code=404, detail="Тип файлу не знайдений")

    # Check if file type is used in files (optional - depending on business logic)
    # You might want to add this check to prevent deletion of file types that are in use

    # Delete the file type
    delete_query = text("DELETE FROM SRTN_FILE_TYPES WHERE FILE_TYPE_ID = :file_type_id")
    db.execute(delete_query, {"file_type_id": file_type_id})
    db.commit()

    return {"message": "Тип файлу успішно видалений"}