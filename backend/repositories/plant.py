"""
Plant and Unit repositories
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from models import Plant, Unit, TermLocation
from .base import BaseRepository


class PlantRepository(BaseRepository[Plant]):
    """Plant repository"""
    
    def __init__(self):
        super().__init__(Plant)
    
    def get_all_ordered(self, db: Session) -> List[Plant]:
        """Get all plants ordered by name"""
        return db.query(Plant).order_by(Plant.NAME).all()


class UnitRepository(BaseRepository[Unit]):
    """Unit repository"""
    
    def __init__(self):
        super().__init__(Unit)
    
    def get_by_plant(self, db: Session, plant_id: int) -> List[Unit]:
        """Get units by plant ID"""
        return db.query(Unit).filter(Unit.PLANT_ID == plant_id).order_by(Unit.NAME).all()


class TermLocationRepository(BaseRepository[TermLocation]):
    """Term location repository"""
    
    def __init__(self):
        super().__init__(TermLocation)
    
    def get_by_plant_unit(self, db: Session, plant_id: int, unit_id: int) -> List[TermLocation]:
        """Get terms by plant and unit"""
        return db.query(TermLocation).filter(
            TermLocation.PLANT_ID == plant_id,
            TermLocation.UNIT_ID == unit_id
        ).order_by(TermLocation.T_NAME).all()

