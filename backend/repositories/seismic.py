"""
Seismic data repository
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from models import EkSeismData
from .base import BaseRepository


class SeismicRepository(BaseRepository[EkSeismData]):
    """Seismic data repository"""
    
    def __init__(self):
        super().__init__(EkSeismData)
    
    def get_by_ek_id(self, db: Session, ek_id: int) -> Optional[EkSeismData]:
        """Get seismic data by EK_ID"""
        return db.query(EkSeismData).filter(EkSeismData.EK_ID == ek_id).first()
    
    def update_fields(self, db: Session, ek_id: int, **kwargs):
        """Update seismic data fields"""
        ek_data = db.query(EkSeismData).filter(EkSeismData.EK_ID == ek_id).first()
        if not ek_data:
            raise HTTPException(status_code=404, detail="Сейсмічні дані не знайдено")
        
        for key, value in kwargs.items():
            if hasattr(ek_data, key):
                setattr(ek_data, key, value)
    
    def search(
        self,
        db: Session,
        plant_id: int = None,
        unit_id: int = None,
        eklist_id: int = None,
        plant_name: str = None,
        unit_name: str = None,
        equip_name: str = None,
        **filters
    ) -> List[EkSeismData]:
        """Search seismic data with filters"""
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
            query = query.filter(EkSeismData.NAME.ilike(f"%{equip_name}%"))
        
        for key, value in filters.items():
            if hasattr(EkSeismData, key) and value is not None:
                query = query.filter(getattr(EkSeismData, key) == value)
        
        return query.all()

