"""
File Types API endpoints
"""
from typing import List
from fastapi import APIRouter, Body, HTTPException

from api.dependencies import DbSessionDep
from schemas import FileTypeData, CreateFileTypeRequest
from services import FileService

router = APIRouter(prefix="/api", tags=["file_types"])
file_service = FileService()


@router.get("/file_types", response_model=List[FileTypeData])
async def get_file_types(db: DbSessionDep):
    """Get all file types"""
    return file_service.get_all_file_types(db)


@router.post("/file_types", status_code=201)
async def create_file_type(db: DbSessionDep, request: CreateFileTypeRequest = Body(...)):
    """Create new file type"""
    try:
        file_type_id = file_service.create_file_type(db, request)
        db.commit()
        return {"message": "Тип файлу успішно створено", "file_type_id": file_type_id}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Помилка створення типу файлу: {str(e)}")


@router.delete("/file_types/{file_type_id}")
async def delete_file_type(db: DbSessionDep, file_type_id: int):
    """Delete file type by ID"""
    try:
        file_service.delete_file_type(db, file_type_id)
        db.commit()
        return {"message": "Тип файлу успішно видалено"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Помилка видалення типу файлу: {str(e)}")

