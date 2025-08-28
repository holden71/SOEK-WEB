from typing import List

from fastapi import APIRouter, Query
from sqlalchemy import inspect, text

from db import DbSessionDep
from models import FileData


router = APIRouter(prefix="/api", tags=["files"])


@router.get("/files", response_model=List[FileData])
async def get_files(
    db: DbSessionDep,
):
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_FILES')
    column_names = [col['name'] for col in columns]

    query = text(
        f"""
        SELECT {', '.join(column_names)}
        FROM SRTN_FILES
        ORDER BY FILE_ID
        """
    )

    result = db.execute(query)

    files_data = []
    for row in result:
        row_dict = {column_names[i]: value for i, value in enumerate(row)}
        files_data.append(FileData(data=row_dict))

    return files_data


@router.get("/files/{file_id}", response_model=FileData)
async def get_file_by_id(
    db: DbSessionDep,
    file_id: int,
):
    inspector = inspect(db.get_bind())
    columns = inspector.get_columns('SRTN_FILES')
    column_names = [col['name'] for col in columns]

    query = text(
        f"""
        SELECT {', '.join(column_names)}
        FROM SRTN_FILES
        WHERE FILE_ID = :file_id
        """
    )

    result = db.execute(query, {"file_id": file_id})

    row = result.fetchone()
    if row:
        row_dict = {column_names[i]: value for i, value in enumerate(row)}
        return FileData(data=row_dict)

    return None
