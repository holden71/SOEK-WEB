"""
Multimedia API endpoints
"""
from typing import List
from fastapi import APIRouter, HTTPException

from api.dependencies import DbSessionDep
from services import Model3DService

router = APIRouter(prefix="/api", tags=["multimedia"])
model_3d_service = Model3DService()


@router.get("/multimedia", response_model=List[dict])
async def get_all_multimedia(db: DbSessionDep):
    """Get all multimedia files"""
    return model_3d_service.get_all_multimedia(db)


@router.delete("/multimedia/{multimed_id}")
async def delete_multimedia(db: DbSessionDep, multimed_id: int):
    """Delete multimedia file by ID"""
    try:
        result = model_3d_service.delete_multimedia(db, multimed_id)
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting multimedia: {str(e)}")


@router.get("/multimedia/model/{model_id}")
async def get_multimedia_by_model(db: DbSessionDep, model_id: int):
    """Get all multimedia files for a specific model"""
    return model_3d_service.get_multimedia_by_model(db, model_id)


@router.get("/multimedia/model/{model_id}/check")
async def check_multimedia(db: DbSessionDep, model_id: int):
    """Check if multimedia exists for model"""
    from sqlalchemy import text

    try:
        query = text("""
            SELECT COUNT(*) as multimedia_count
            FROM SRTN_MULTIMED_3D_MODELS mm
            WHERE mm.MODEL_ID = :model_id
        """)

        result = db.execute(query, {"model_id": model_id})
        row = result.fetchone()

        multimedia_count = row[0] if row else 0

        return {
            "model_id": model_id,
            "has_multimedia": multimedia_count > 0,
            "multimedia_count": multimedia_count
        }

    except Exception as e:
        print(f"Error checking multimedia for model {model_id}: {str(e)}")
        return {
            "model_id": model_id,
            "has_multimedia": False,
            "multimedia_count": 0
        }

