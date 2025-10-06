"""
3D Models API endpoints
"""
from typing import List
from io import BytesIO
import zipfile
from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import StreamingResponse

from api.dependencies import DbSessionDep
from schemas import Model3DData, CreateModel3DRequest, EkModel3DCreate, EkModel3DResponse
from services import Model3DService

router = APIRouter(prefix="/api", tags=["models_3d"])
model_service = Model3DService()


@router.get("/models_3d", response_model=List[Model3DData])
async def get_all_models(db: DbSessionDep):
    """Get all 3D models"""
    return model_service.get_all_models(db)


@router.post("/models_3d", status_code=201)
async def create_model(db: DbSessionDep, request: CreateModel3DRequest = Body(...)):
    """Create new 3D model"""
    try:
        model_id = model_service.create_model(db, request)
        db.commit()
        return {"message": "3D модель успішно створена", "model_id": model_id}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Помилка створення 3D моделі: {str(e)}")


@router.delete("/models_3d/{model_id}")
async def delete_model(db: DbSessionDep, model_id: int):
    """Delete 3D model and all related files"""
    try:
        result = model_service.delete_model(db, model_id)
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Помилка видалення 3D моделі: {str(e)}")


@router.get("/ek_models/by_ek/{ek_id}", response_model=List[EkModel3DResponse])
async def get_models_by_ek_id(ek_id: int, db: DbSessionDep):
    """Get all 3D models linked to EK_ID"""
    return model_service.get_models_by_ek_id(db, ek_id)


@router.get("/ek_models/check/{ek_id}")
async def check_models_exist(ek_id: int, db: DbSessionDep):
    """Check if any 3D models are linked to EK_ID"""
    return model_service.check_models_exist(db, ek_id)


@router.post("/ek_models", response_model=EkModel3DResponse)
async def create_ek_model_link(ek_model_data: EkModel3DCreate, db: DbSessionDep):
    """Create link between EK and 3D Model"""
    return model_service.create_ek_model_link(db, ek_model_data)


@router.delete("/ek_models/{ek_3d_id}")
async def delete_ek_model_link(ek_3d_id: int, db: DbSessionDep):
    """Delete link between EK and 3D Model"""
    return model_service.delete_ek_model_link(db, ek_3d_id)


@router.get("/models_3d/{model_id}/download")
async def download_model(
    db: DbSessionDep,
    model_id: int,
    include_multimedia: bool = Query(False)
):
    """
    Download 3D model with optional multimedia files

    - model_id: ID of 3D model
    - include_multimedia: if True, includes all related multimedia files in ZIP archive
    """
    import mimetypes
    import io
    from fastapi.responses import Response
    from sqlalchemy import text

    # Get 3D model info with file type
    model_query = text("""
        SELECT m.MODEL_ID, m.SH_NAME, m.DESCR, m.MODEL_FILE_ID,
               f.FILE_NAME, f.DATA, ft.DEF_EXT
        FROM SRTN_3D_MODELS m
        JOIN SRTN_FILES f ON m.MODEL_FILE_ID = f.FILE_ID
        JOIN SRTN_FILE_TYPES ft ON f.FILE_TYPE_ID = ft.FILE_TYPE_ID
        WHERE m.MODEL_ID = :model_id
    """)

    model_result = db.execute(model_query, {"model_id": model_id})
    model_row = model_result.fetchone()

    if not model_row:
        raise HTTPException(status_code=404, detail="3D модель не знайдена")

    model_id, sh_name, descr, model_file_id, model_file_name, model_file_data, file_extension = model_row

    # Check model data
    if model_file_data is None:
        model_file_data = b""
    elif isinstance(model_file_data, str):
        model_file_data = model_file_data.encode('utf-8')
    elif not isinstance(model_file_data, bytes):
        model_file_data = bytes(model_file_data) if model_file_data else b""

    if not include_multimedia:
        # Download only 3D model file
        content_type, _ = mimetypes.guess_type(model_file_name)
        if not content_type:
            content_type = 'application/octet-stream'

        # Use original filename from database
        filename = model_file_name or f"model_{model_id}.bin"

        return Response(
            content=model_file_data,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(model_file_data))
            }
        )

    else:
        # Create ZIP archive with model and multimedia files
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add main 3D model file
            model_filename = model_file_name or f"model_{model_id}"
            zip_file.writestr(model_filename, model_file_data)

            # Get all related multimedia files
            multimedia_query = text("""
                SELECT mm.SH_NAME as MM_NAME, f.FILE_NAME, f.DATA
                FROM SRTN_MULTIMED_3D_MODELS mm
                JOIN SRTN_FILES f ON mm.MULTIMED_FILE_ID = f.FILE_ID
                WHERE mm.MODEL_ID = :model_id
            """)

            multimedia_result = db.execute(multimedia_query, {"model_id": model_id})
            multimedia_files = multimedia_result.fetchall()

            # Add multimedia files to archive
            multimedia_count = 0
            for mm_name, file_name, file_data in multimedia_files:
                if file_data is None:
                    file_data = b""
                elif isinstance(file_data, str):
                    file_data = file_data.encode('utf-8')
                elif not isinstance(file_data, bytes):
                    file_data = bytes(file_data) if file_data else b""

                # Create folder for multimedia files
                multimedia_filename = f"multimedia/{file_name}" if file_name else f"multimedia/file_{multimedia_count}"
                zip_file.writestr(multimedia_filename, file_data)
                multimedia_count += 1

            # Create info file
            info_content = f"""3D Model Information
============================
Model Name: {sh_name or 'Unnamed'}
Description: {descr or 'No description'}
Model ID: {model_id}
Model File: {model_filename}
Multimedia Files: {multimedia_count}

This archive contains:
- Main 3D model file: {model_filename}
- Multimedia files folder: multimedia/ ({multimedia_count} files)
"""
            zip_file.writestr("README.txt", info_content.encode('utf-8'))

        zip_buffer.seek(0)
        zip_data = zip_buffer.getvalue()

        # Simple ASCII name for ZIP file
        zip_filename = f"model_{model_id}_with_multimedia.zip"

        return Response(
            content=zip_data,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{zip_filename}"',
                "Content-Length": str(len(zip_data))
            }
        )

