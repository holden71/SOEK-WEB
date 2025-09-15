from typing import List, Dict, Any
import base64

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from db import DbSessionDep
from models import FileData
from database_models import MultimediaModel

router = APIRouter(prefix="/api", tags=["multimedia"])


@router.get("/multimedia", response_model=List[FileData])
async def get_multimedia_files(db: DbSessionDep):
    """Get all multimedia files using SQLAlchemy ORM"""
    try:
        # Get all multimedia records using ORM
        multimedia_records = db.query(MultimediaModel).order_by(MultimediaModel.MULTIMED_3D_ID).all()
        
        multimedia_data = []
        for record in multimedia_records:
            # Convert ORM object to dictionary using all table columns
            row_dict = {}
            for column in record.__table__.columns:
                value = getattr(record, column.name)
                row_dict[column.name] = value
            
            multimedia_data.append(FileData(data=row_dict))
        
        print(f"Found {len(multimedia_data)} multimedia records using ORM")  # Debug logging
        return multimedia_data
        
    except Exception as e:
        print(f"Multimedia ORM query error: {str(e)}")  # Debug logging
        # Return empty list instead of error to avoid 500
        return []


@router.delete("/multimedia/{multimed_id}")
async def delete_multimedia_record(db: DbSessionDep, multimed_id: int):
    """Delete multimedia record by MULTIMED_3D_ID"""
    try:
        # Find multimedia record by its primary key
        multimedia_relation = db.query(MultimediaModel).filter(
            MultimediaModel.MULTIMED_3D_ID == multimed_id
        ).first()
        
        if not multimedia_relation:
            raise HTTPException(status_code=404, detail="Мультімедіа запис не знайдено")
        
        # Get the associated file ID before deleting the relation
        file_id = multimedia_relation.MULTIMED_FILE_ID
        
        # Delete multimedia relation
        db.delete(multimedia_relation)
        
        # Optionally delete the file itself (only if not used elsewhere)
        # For now, keep the file - just remove the multimedia relation
        
        db.commit()
        
        return {"message": "Мультімедіа запис успішно видалено"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Не вдалося видалити мультімедіа запис: {str(e)}")


@router.get("/multimedia/model/{model_id}")
async def get_multimedia_for_model(db: DbSessionDep, model_id: int):
    """Get multimedia files for a specific 3D model with file contents"""
    try:
        # Query to get multimedia files for the model including file data and type info
        query = text("""
            SELECT 
                mm.MULTIMED_3D_ID,
                mm.SH_NAME as MULTIMEDIA_NAME,
                mm.MULTIMED_FILE_ID,
                mm.MODEL_ID,
                f.FILE_NAME,
                f.DATA as FILE_DATA,
                ft.NAME as FILE_TYPE_NAME,
                ft.DEF_EXT as FILE_EXTENSION
            FROM SRTN_MULTIMED_3D_MODELS mm
            JOIN SRTN_FILES f ON mm.MULTIMED_FILE_ID = f.FILE_ID
            JOIN SRTN_FILE_TYPES ft ON f.FILE_TYPE_ID = ft.FILE_TYPE_ID
            WHERE mm.MODEL_ID = :model_id
            ORDER BY mm.MULTIMED_3D_ID
        """)
        
        result = db.execute(query, {"model_id": model_id})
        rows = result.fetchall()
        
        multimedia_files = []
        for row in rows:
            multimed_id, multimedia_name, file_id, model_id_ref, file_name, file_data, file_type_name, file_extension = row
            
            # Convert file data to base64 if it exists
            file_content_base64 = None
            if file_data:
                try:
                    if isinstance(file_data, str):
                        file_data = file_data.encode('utf-8')
                    elif not isinstance(file_data, bytes):
                        file_data = bytes(file_data) if file_data else b""
                    
                    file_content_base64 = base64.b64encode(file_data).decode('utf-8')
                except Exception as e:
                    print(f"Error encoding file data for multimedia {multimed_id}: {e}")
                    file_content_base64 = None
            
            # Check if this is an image based on file extension
            image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff']
            is_image = file_extension.lower() in image_extensions if file_extension else False
            
            # Check if this is a PDF file
            is_pdf = file_extension.lower() == '.pdf' if file_extension else False
            
            multimedia_files.append({
                "MULTIMED_3D_ID": multimed_id,
                "MULTIMEDIA_NAME": multimedia_name,
                "MULTIMED_FILE_ID": file_id,
                "MODEL_ID": model_id_ref,
                "FILE_NAME": file_name,
                "FILE_TYPE_NAME": file_type_name,
                "FILE_EXTENSION": file_extension,
                "FILE_CONTENT_BASE64": file_content_base64,
                "IS_IMAGE": is_image,
                "IS_PDF": is_pdf
            })
        
        return {
            "model_id": model_id,
            "multimedia_count": len(multimedia_files),
            "multimedia_files": multimedia_files
        }
        
    except Exception as e:
        print(f"Error getting multimedia for model {model_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Не вдалося отримати мультімедіа для моделі: {str(e)}")


@router.get("/multimedia/model/{model_id}/check")
async def check_multimedia_for_model(db: DbSessionDep, model_id: int):
    """Check if a model has multimedia files without loading the file contents"""
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
