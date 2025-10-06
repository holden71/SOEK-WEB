"""
3D Models API endpoints
"""
from typing import List
from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import Response

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
    result = model_service.download_model_files(db, model_id, include_multimedia)

    return Response(
        content=result['content'],
        media_type=result['mime_type'],
        headers={
            "Content-Disposition": f'attachment; filename="{result["filename"]}"',
            "Content-Length": str(len(result['content']))
        }
    )

