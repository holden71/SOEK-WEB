"""
Multimedia API endpoints
"""
from sqlalchemy import text
from fastapi import APIRouter, HTTPException

from api.dependencies import DbSessionDep

router = APIRouter(prefix="/api", tags=["multimedia"])


@router.get("/multimedia/model/{model_id}/check")
async def check_multimedia(db: DbSessionDep, model_id: int):
    """Check if multimedia exists for model"""
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

