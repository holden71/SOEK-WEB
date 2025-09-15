from typing import List

from fastapi import APIRouter, HTTPException

from db import DbSessionDep
from models import FileData
from database_models import MultimediaModel, File

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
