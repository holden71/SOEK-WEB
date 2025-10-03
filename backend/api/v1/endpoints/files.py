"""
Files API endpoints
"""
from typing import List
import mimetypes

from fastapi import APIRouter, Query, HTTPException, Body
from fastapi.responses import Response

from api.dependencies import DbSessionDep
from schemas import FileData, CreateFileRequest
from services import FileService

router = APIRouter(prefix="/api", tags=["files"])
file_service = FileService()


@router.get("/files", response_model=List[FileData])
async def get_files(db: DbSessionDep):
    """Get all files"""
    return file_service.get_all_files(db)


@router.get("/files/{file_id}/download")
async def download_file(db: DbSessionDep, file_id: int):
    """Download file by ID"""
    file_obj = file_service.get_file_by_id(db, file_id)
    
    if not file_obj.DATA:
        raise HTTPException(status_code=404, detail="Файл не містить даних")
    
    # Determine MIME type
    mime_type, _ = mimetypes.guess_type(file_obj.FILE_NAME)
    if not mime_type:
        mime_type = "application/octet-stream"
    
    # Return file as response
    return Response(
        content=file_obj.DATA,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{file_obj.FILE_NAME}"'
        }
    )


@router.post("/files", status_code=201)
async def create_file(db: DbSessionDep, request: CreateFileRequest = Body(...)):
    """Create new file"""
    try:
        file_id = file_service.create_file(db, request)
        db.commit()
        return {"message": "Файл успішно створено", "file_id": file_id}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Помилка створення файлу: {str(e)}")


@router.delete("/files/{file_id}")
async def delete_file(db: DbSessionDep, file_id: int):
    """Delete file by ID"""
    try:
        file_service.delete_file(db, file_id)
        db.commit()
        return {"message": "Файл успішно видалено"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Помилка видалення файлу: {str(e)}")


@router.get("/files/extensions/allowed", response_model=List[str])
async def get_allowed_extensions(db: DbSessionDep):
    """Get list of allowed file extensions"""
    return file_service.get_allowed_extensions(db)

