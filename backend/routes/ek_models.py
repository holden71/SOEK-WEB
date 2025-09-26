"""
API routes for EK 3D Models (SRTN_EK_3D_MODELS table)
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database_models import EkModel3D, Model3D, File, FileType
from db import DbSessionDep

router = APIRouter(prefix="/api", tags=["ek_models"])

# Pydantic models for request/response
class EkModel3DCreate(BaseModel):
    sh_name: Optional[str] = None
    ek_id: int
    model_id: int

class EkModel3DResponse(BaseModel):
    EK_3D_ID: int
    SH_NAME: Optional[str]
    EK_ID: int
    MODEL_ID: int
    
    # Model details
    MODEL_SH_NAME: Optional[str] = None
    MODEL_DESCR: Optional[str] = None
    MODEL_FILE_NAME: Optional[str] = None
    FILE_TYPE_NAME: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/ek_models/by_ek/{ek_id}", response_model=List[EkModel3DResponse])
async def get_models_by_ek_id(
    ek_id: int,
    db: DbSessionDep,
):
    """Get all 3D models linked to a specific EK_ID"""
    try:
        # Query with joins to get model and file details
        query = (
            db.query(
                EkModel3D.EK_3D_ID,
                EkModel3D.SH_NAME,
                EkModel3D.EK_ID,
                EkModel3D.MODEL_ID,
                Model3D.SH_NAME.label('MODEL_SH_NAME'),
                Model3D.DESCR.label('MODEL_DESCR'),
                File.FILE_NAME.label('MODEL_FILE_NAME'),
                FileType.NAME.label('FILE_TYPE_NAME')
            )
            .join(Model3D, EkModel3D.MODEL_ID == Model3D.MODEL_ID)
            .join(File, Model3D.MODEL_FILE_ID == File.FILE_ID)
            .join(FileType, File.FILE_TYPE_ID == FileType.FILE_TYPE_ID)
            .filter(EkModel3D.EK_ID == ek_id)
        )
        
        results = query.all()
        
        models_data = []
        for row in results:
            models_data.append({
                "EK_3D_ID": row.EK_3D_ID,
                "SH_NAME": row.SH_NAME,
                "EK_ID": row.EK_ID,
                "MODEL_ID": row.MODEL_ID,
                "MODEL_SH_NAME": row.MODEL_SH_NAME,
                "MODEL_DESCR": row.MODEL_DESCR,
                "MODEL_FILE_NAME": row.MODEL_FILE_NAME,
                "FILE_TYPE_NAME": row.FILE_TYPE_NAME
            })
        
        return models_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching models for EK_ID {ek_id}: {str(e)}"
        )

@router.get("/ek_models/check/{ek_id}")
async def check_models_exist(
    ek_id: int,
    db: DbSessionDep,
):
    """Check if any 3D models are linked to a specific EK_ID"""
    try:
        count = db.query(EkModel3D).filter(EkModel3D.EK_ID == ek_id).count()
        return {"has_models": count > 0, "count": count}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking models for EK_ID {ek_id}: {str(e)}"
        )

@router.post("/ek_models", response_model=EkModel3DResponse)
async def create_ek_model_link(
    ek_model_data: EkModel3DCreate,
    db: DbSessionDep,
):
    """Create a new link between EK and 3D Model"""
    try:
        # Check if model exists
        model = db.query(Model3D).filter(Model3D.MODEL_ID == ek_model_data.model_id).first()
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"3D Model with ID {ek_model_data.model_id} not found"
            )
        
        # Check if link already exists
        existing_link = db.query(EkModel3D).filter(
            EkModel3D.EK_ID == ek_model_data.ek_id,
            EkModel3D.MODEL_ID == ek_model_data.model_id
        ).first()
        
        if existing_link:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Link between EK_ID {ek_model_data.ek_id} and Model_ID {ek_model_data.model_id} already exists"
            )
        
        # Create new link
        new_link = EkModel3D(
            SH_NAME=ek_model_data.sh_name,
            EK_ID=ek_model_data.ek_id,
            MODEL_ID=ek_model_data.model_id
        )
        
        db.add(new_link)
        db.commit()
        db.refresh(new_link)
        
        # Get full details for response
        query = (
            db.query(
                EkModel3D.EK_3D_ID,
                EkModel3D.SH_NAME,
                EkModel3D.EK_ID,
                EkModel3D.MODEL_ID,
                Model3D.SH_NAME.label('MODEL_SH_NAME'),
                Model3D.DESCR.label('MODEL_DESCR'),
                File.FILE_NAME.label('MODEL_FILE_NAME'),
                FileType.NAME.label('FILE_TYPE_NAME')
            )
            .join(Model3D, EkModel3D.MODEL_ID == Model3D.MODEL_ID)
            .join(File, Model3D.MODEL_FILE_ID == File.FILE_ID)
            .join(FileType, File.FILE_TYPE_ID == FileType.FILE_TYPE_ID)
            .filter(EkModel3D.EK_3D_ID == new_link.EK_3D_ID)
        ).first()
        
        return {
            "EK_3D_ID": query.EK_3D_ID,
            "SH_NAME": query.SH_NAME,
            "EK_ID": query.EK_ID,
            "MODEL_ID": query.MODEL_ID,
            "MODEL_SH_NAME": query.MODEL_SH_NAME,
            "MODEL_DESCR": query.MODEL_DESCR,
            "MODEL_FILE_NAME": query.MODEL_FILE_NAME,
            "FILE_TYPE_NAME": query.FILE_TYPE_NAME
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating EK model link: {str(e)}"
        )

@router.delete("/ek_models/{ek_3d_id}")
async def delete_ek_model_link(
    ek_3d_id: int,
    db: DbSessionDep,
):
    """Delete a link between EK and 3D Model"""
    try:
        link = db.query(EkModel3D).filter(EkModel3D.EK_3D_ID == ek_3d_id).first()
        
        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"EK model link with ID {ek_3d_id} not found"
            )
        
        db.delete(link)
        db.commit()
        
        return {"message": "EK model link deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting EK model link: {str(e)}"
        )
