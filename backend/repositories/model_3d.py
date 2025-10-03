"""
3D Model repositories
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models import Model3D, MultimediaModel, EkModel3D, File
from .base import BaseRepository


class Model3DRepository(BaseRepository[Model3D]):
    """3D Model repository"""
    
    def __init__(self):
        super().__init__(Model3D)
    
    def create_model(
        self,
        db: Session,
        sh_name: str,
        descr: str = None,
        model_file_id: int = None
    ) -> int:
        """Create 3D model and return its ID"""
        try:
            new_model = Model3D(
                SH_NAME=sh_name,
                DESCR=descr,
                MODEL_FILE_ID=model_file_id,
                MODEL_PREV1_ID=None,
                MODEL_PREV2_ID=None
            )
            db.add(new_model)
            db.flush()
            return new_model.MODEL_ID
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Не вдалося створити 3D модель: {str(e)}")
    
    def delete_with_files(self, db: Session, model_id: int) -> dict:
        """Delete 3D model and all related files"""
        try:
            model = db.query(Model3D).filter(Model3D.MODEL_ID == model_id).first()
            if not model:
                raise HTTPException(status_code=404, detail="3D модель не знайдена")
            
            # Delete multimedia relations and files
            multimedia_relations = db.query(MultimediaModel).filter(
                MultimediaModel.MODEL_ID == model_id
            ).all()
            for relation in multimedia_relations:
                multimedia_file = db.query(File).filter(
                    File.FILE_ID == relation.MULTIMED_FILE_ID
                ).first()
                if multimedia_file:
                    db.delete(multimedia_file)
                db.delete(relation)
            
            # Delete main model file
            if model.MODEL_FILE_ID:
                model_file = db.query(File).filter(File.FILE_ID == model.MODEL_FILE_ID).first()
                if model_file:
                    db.delete(model_file)
            
            # Delete model
            db.delete(model)
            
            return {"message": f"3D модель {model_id} та всі пов'язані файли успішно видалені"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Помилка при видаленні 3D моделі: {str(e)}")


class MultimediaModelRepository(BaseRepository[MultimediaModel]):
    """Multimedia model repository"""
    
    def __init__(self):
        super().__init__(MultimediaModel)
    
    def create_relation(
        self,
        db: Session,
        sh_name: str,
        multimedia_file_id: int,
        model_id: int
    ) -> int:
        """Create multimedia relationship and return its ID"""
        try:
            new_relation = MultimediaModel(
                SH_NAME=sh_name,
                MULTIMED_FILE_ID=multimedia_file_id,
                MODEL_ID=model_id
            )
            db.add(new_relation)
            db.flush()
            return new_relation.MULTIMED_3D_ID
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Не вдалося створити мультімедіа зв'язок: {str(e)}")


class EkModel3DRepository(BaseRepository[EkModel3D]):
    """EK 3D Model link repository"""
    
    def __init__(self):
        super().__init__(EkModel3D)
    
    def get_by_ek_id(self, db: Session, ek_id: int) -> List[EkModel3D]:
        """Get all 3D models linked to EK_ID"""
        return db.query(EkModel3D).filter(EkModel3D.EK_ID == ek_id).all()
    
    def check_link_exists(self, db: Session, ek_id: int, model_id: int) -> bool:
        """Check if link between EK and Model exists"""
        link = db.query(EkModel3D).filter(
            EkModel3D.EK_ID == ek_id,
            EkModel3D.MODEL_ID == model_id
        ).first()
        return link is not None

