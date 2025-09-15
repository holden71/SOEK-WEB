"""
Complete database utilities using SQLAlchemy ORM - simple and reliable
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session
from database_models import (
    File, Model3D, MultimediaModel, FileType,
    Plant, Unit, AccelSet, AccelPlot, AccelPoint,
    EkSeismData, TermLocation
)


# ==================== File Operations ====================

def create_file_orm(db: Session, file_type_id: int, file_name: str, file_bytes: bytes,
                   descr: str = None, sh_descr: str = None) -> int:
    """Create file using SQLAlchemy ORM"""
    try:
        new_file = File(
            FILE_TYPE_ID=file_type_id,
            FILE_NAME=file_name,
            DESCR=descr,
            DATA=file_bytes,
            SH_DESCR=sh_descr
        )
        db.add(new_file)
        db.flush()
        return new_file.FILE_ID
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Не вдалося створити файл: {str(e)}")


def get_file_type_by_extension(db: Session, extension: str) -> int:
    """Get file type ID by extension"""
    try:
        file_type = db.query(FileType).filter(FileType.DEF_EXT == extension).first()
        if not file_type:
            raise HTTPException(status_code=400, detail=f"Тип файлу з розширенням '{extension}' не знайдено")
        return file_type.FILE_TYPE_ID
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка пошуку типу файлу: {str(e)}")


def get_all_files(db: Session):
    """Get all files with metadata"""
    return db.query(File).join(FileType).all()


def get_file_by_id(db: Session, file_id: int):
    """Get file by ID"""
    return db.query(File).filter(File.FILE_ID == file_id).first()


def delete_file_orm(db: Session, file_id: int):
    """Delete file by ID"""
    file_obj = db.query(File).filter(File.FILE_ID == file_id).first()
    if not file_obj:
        raise HTTPException(status_code=404, detail="Файл не знайдено")
    db.delete(file_obj)


# ==================== File Type Operations ====================

def get_all_file_types(db: Session):
    """Get all file types"""
    return db.query(FileType).all()


def get_file_type_by_id(db: Session, file_type_id: int):
    """Get file type by ID"""
    return db.query(FileType).filter(FileType.FILE_TYPE_ID == file_type_id).first()


def create_file_type_orm(db: Session, name: str, descr: str = None, def_ext: str = None) -> int:
    """Create file type"""
    try:
        new_file_type = FileType(NAME=name, DESCR=descr, DEF_EXT=def_ext)
        db.add(new_file_type)
        db.flush()
        return new_file_type.FILE_TYPE_ID
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка створення типу файлу: {str(e)}")


def delete_file_type_orm(db: Session, file_type_id: int):
    """Delete file type"""
    file_type = db.query(FileType).filter(FileType.FILE_TYPE_ID == file_type_id).first()
    if not file_type:
        raise HTTPException(status_code=404, detail="Тип файлу не знайдено")
    db.delete(file_type)


# ==================== 3D Model Operations ====================

def create_model_orm(db: Session, sh_name: str, descr: str = None, model_file_id: int = None) -> int:
    """Create 3D model"""
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


def create_multimedia_relation_orm(db: Session, sh_name: str, multimedia_file_id: int, model_id: int) -> int:
    """Create multimedia relationship"""
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


def get_all_models(db: Session):
    """Get all 3D models"""
    return db.query(Model3D).all()


def get_model_by_id(db: Session, model_id: int):
    """Get model by ID with file"""
    return db.query(Model3D).filter(Model3D.MODEL_ID == model_id).first()


def delete_model_with_files(db: Session, model_id: int) -> dict:
    """Delete 3D model and all related files"""
    try:
        model = db.query(Model3D).filter(Model3D.MODEL_ID == model_id).first()
        if not model:
            raise HTTPException(status_code=404, detail="3D модель не знайдена")
        
        # Delete multimedia relations and files
        multimedia_relations = db.query(MultimediaModel).filter(MultimediaModel.MODEL_ID == model_id).all()
        for relation in multimedia_relations:
            multimedia_file = db.query(File).filter(File.FILE_ID == relation.MULTIMED_FILE_ID).first()
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


# ==================== Plant & Unit Operations ====================

def get_all_plants(db: Session):
    """Get all plants"""
    return db.query(Plant).order_by(Plant.NAME).all()


def get_units_by_plant(db: Session, plant_id: int):
    """Get units by plant ID"""
    return db.query(Unit).filter(Unit.PLANT_ID == plant_id).order_by(Unit.NAME).all()


def get_plant_by_id(db: Session, plant_id: int):
    """Get plant by ID"""
    return db.query(Plant).filter(Plant.PLANT_ID == plant_id).first()


def get_unit_by_id(db: Session, unit_id: int):
    """Get unit by ID"""
    return db.query(Unit).filter(Unit.UNIT_ID == unit_id).first()


# ==================== Acceleration Set Operations ====================

def create_accel_set_orm(db: Session, **kwargs) -> int:
    """Create acceleration set"""
    try:
        new_accel_set = AccelSet(**kwargs)
        db.add(new_accel_set)
        db.flush()
        return new_accel_set.ACCEL_SET_ID
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка створення набору прискорень: {str(e)}")


def get_accel_set_by_id(db: Session, accel_set_id: int):
    """Get acceleration set by ID"""
    return db.query(AccelSet).filter(AccelSet.ACCEL_SET_ID == accel_set_id).first()


def update_accel_set_orm(db: Session, accel_set_id: int, **kwargs):
    """Update acceleration set"""
    accel_set = db.query(AccelSet).filter(AccelSet.ACCEL_SET_ID == accel_set_id).first()
    if not accel_set:
        raise HTTPException(status_code=404, detail="Набір прискорень не знайдено")
    
    for key, value in kwargs.items():
        if hasattr(accel_set, key):
            setattr(accel_set, key, value)


def create_accel_plot_orm(db: Session, axis: str, name: str) -> int:
    """Create acceleration plot"""
    try:
        new_plot = AccelPlot(AXIS=axis, NAME=name)
        db.add(new_plot)
        db.flush()
        return new_plot.PLOT_ID
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка створення графіку: {str(e)}")


def create_accel_point_orm(db: Session, freq: float, accel: float, plot_id: int):
    """Create acceleration point"""
    try:
        new_point = AccelPoint(FREQ=freq, ACCEL=accel, PLOT_ID=plot_id)
        db.add(new_point)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка створення точки: {str(e)}")


# ==================== Seismic Data Operations ====================

def get_ek_seism_data_by_id(db: Session, ek_id: int):
    """Get seismic data by EK_ID"""
    return db.query(EkSeismData).filter(EkSeismData.EK_ID == ek_id).first()


def update_ek_seism_data_orm(db: Session, ek_id: int, **kwargs):
    """Update seismic data"""
    ek_data = db.query(EkSeismData).filter(EkSeismData.EK_ID == ek_id).first()
    if not ek_data:
        raise HTTPException(status_code=404, detail="Сейсмічні дані не знайдено")
    
    for key, value in kwargs.items():
        if hasattr(ek_data, key):
            setattr(ek_data, key, value)


def search_ek_seism_data(db: Session, plant_id: int = None, unit_id: int = None, 
                        eklist_id: int = None, plant_name: str = None, unit_name: str = None, 
                        equip_name: str = None, **filters):
    """Search seismic data with filters using correct column names"""
    query = db.query(EkSeismData)
    
    if plant_id is not None:
        query = query.filter(EkSeismData.PLANT_ID == plant_id)
    if unit_id is not None:
        query = query.filter(EkSeismData.UNIT_ID == unit_id)
    if eklist_id is not None:
        query = query.filter(EkSeismData.EKLIST_ID == eklist_id)
    if plant_name:
        query = query.filter(EkSeismData.PLANT_NAME.ilike(f"%{plant_name}%"))
    if unit_name:
        query = query.filter(EkSeismData.UNIT_NAME.ilike(f"%{unit_name}%"))
    if equip_name:
        # Note: Equipment name column is called NAME, not EQUIP_NAME
        query = query.filter(EkSeismData.NAME.ilike(f"%{equip_name}%"))
    
    for key, value in filters.items():
        if hasattr(EkSeismData, key) and value is not None:
            query = query.filter(getattr(EkSeismData, key) == value)
    
    return query.all()


# ==================== Location Operations ====================

def get_terms_by_plant_unit(db: Session, plant_id: int, unit_id: int):
    """Get terms by plant and unit"""
    return db.query(TermLocation).filter(
        TermLocation.PLANT_ID == plant_id,
        TermLocation.UNIT_ID == unit_id
    ).order_by(TermLocation.T_NAME).all()