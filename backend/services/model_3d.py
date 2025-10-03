"""
3D Model service - бизнес-логика для работы с 3D моделями
"""
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from repositories import Model3DRepository, MultimediaModelRepository, EkModel3DRepository, FileRepository, FileTypeRepository
from models import Model3D, File, FileType, EkModel3D
from schemas import CreateModel3DRequest, Model3DData, EkModel3DCreate, EkModel3DResponse


class Model3DService:
    """3D Model service"""
    
    def __init__(self):
        self.model_repo = Model3DRepository()
        self.multimedia_repo = MultimediaModelRepository()
        self.ek_model_repo = EkModel3DRepository()
        self.file_repo = FileRepository()
        self.file_type_repo = FileTypeRepository()
    
    def get_all_models(self, db: Session) -> List[Model3DData]:
        """Get all 3D models"""
        models = self.model_repo.get_all(db)
        result = []
        for model in models:
            model_data = {
                "MODEL_ID": model.MODEL_ID,
                "SH_NAME": model.SH_NAME,
                "DESCR": model.DESCR,
                "MODEL_FILE_ID": model.MODEL_FILE_ID,
            }
            result.append(Model3DData(data=model_data))
        return result
    
    def create_model(self, db: Session, request: CreateModel3DRequest) -> int:
        """Create 3D model with file and multimedia files"""
        try:
            # Get file type by extension
            file_type = self.file_type_repo.get_by_extension(db, request.file_extension)
            
            # Create main model file
            file_bytes = bytes(request.file_content)
            model_file_id = self.file_repo.create_file(
                db=db,
                file_type_id=file_type.FILE_TYPE_ID,
                file_name=request.file_name,
                file_bytes=file_bytes,
                descr=request.descr
            )
            
            # Create 3D model
            model_id = self.model_repo.create_model(
                db=db,
                sh_name=request.sh_name,
                descr=request.descr,
                model_file_id=model_file_id
            )
            
            # Create multimedia files if provided
            if request.multimedia_files:
                for mm_file in request.multimedia_files:
                    # Get multimedia file type
                    mm_file_type = self.file_type_repo.get_by_extension(db, mm_file.file_extension)
                    
                    # Create multimedia file
                    mm_file_bytes = bytes(mm_file.file_content)
                    mm_file_id = self.file_repo.create_file(
                        db=db,
                        file_type_id=mm_file_type.FILE_TYPE_ID,
                        file_name=mm_file.file_name,
                        file_bytes=mm_file_bytes
                    )
                    
                    # Create multimedia relation
                    self.multimedia_repo.create_relation(
                        db=db,
                        sh_name=mm_file.sh_name,
                        multimedia_file_id=mm_file_id,
                        model_id=model_id
                    )
            
            return model_id
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error creating 3D model: {str(e)}")
    
    def delete_model(self, db: Session, model_id: int):
        """Delete 3D model and all related files"""
        result = self.model_repo.delete_with_files(db, model_id)
        return result
    
    def get_models_by_ek_id(self, db: Session, ek_id: int) -> List[EkModel3DResponse]:
        """Get all 3D models linked to EK_ID"""
        try:
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
                models_data.append(EkModel3DResponse(
                    EK_3D_ID=row.EK_3D_ID,
                    SH_NAME=row.SH_NAME,
                    EK_ID=row.EK_ID,
                    MODEL_ID=row.MODEL_ID,
                    MODEL_SH_NAME=row.MODEL_SH_NAME,
                    MODEL_DESCR=row.MODEL_DESCR,
                    MODEL_FILE_NAME=row.MODEL_FILE_NAME,
                    FILE_TYPE_NAME=row.FILE_TYPE_NAME
                ))
            
            return models_data
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching models for EK_ID {ek_id}: {str(e)}"
            )
    
    def check_models_exist(self, db: Session, ek_id: int) -> dict:
        """Check if any 3D models are linked to EK_ID"""
        count = db.query(EkModel3D).filter(EkModel3D.EK_ID == ek_id).count()
        return {"has_models": count > 0, "count": count}
    
    def create_ek_model_link(self, db: Session, ek_model_data: EkModel3DCreate) -> EkModel3DResponse:
        """Create link between EK and 3D Model"""
        try:
            # Check if model exists
            model = self.model_repo.get_by_id(db, ek_model_data.model_id)
            if not model:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"3D Model with ID {ek_model_data.model_id} not found"
                )
            
            # Check if link already exists
            if self.ek_model_repo.check_link_exists(db, ek_model_data.ek_id, ek_model_data.model_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Link between EK_ID {ek_model_data.ek_id} and Model_ID {ek_model_data.model_id} already exists"
                )
            
            # Create new link
            new_link = self.ek_model_repo.create(
                db=db,
                SH_NAME=ek_model_data.sh_name,
                EK_ID=ek_model_data.ek_id,
                MODEL_ID=ek_model_data.model_id
            )
            
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
            
            return EkModel3DResponse(
                EK_3D_ID=query.EK_3D_ID,
                SH_NAME=query.SH_NAME,
                EK_ID=query.EK_ID,
                MODEL_ID=query.MODEL_ID,
                MODEL_SH_NAME=query.MODEL_SH_NAME,
                MODEL_DESCR=query.MODEL_DESCR,
                MODEL_FILE_NAME=query.MODEL_FILE_NAME,
                FILE_TYPE_NAME=query.FILE_TYPE_NAME
            )
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating EK model link: {str(e)}"
            )
    
    def delete_ek_model_link(self, db: Session, ek_3d_id: int):
        """Delete link between EK and 3D Model"""
        try:
            self.ek_model_repo.delete(db, ek_3d_id)
            db.commit()
            return {"message": "EK model link deleted successfully"}
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting EK model link: {str(e)}"
            )

