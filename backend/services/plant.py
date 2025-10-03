"""
Plant service - бизнес-логика для работы с растениями и юнитами
"""
from typing import List
from sqlalchemy.orm import Session

from repositories import PlantRepository, UnitRepository, TermLocationRepository
from schemas import Plant, Unit, Term


class PlantService:
    """Plant service"""
    
    def __init__(self):
        self.plant_repo = PlantRepository()
        self.unit_repo = UnitRepository()
        self.term_repo = TermLocationRepository()
    
    def get_all_plants(self, db: Session) -> List[Plant]:
        """Get all plants"""
        plants = self.plant_repo.get_all_ordered(db)
        return [Plant(name=plant.NAME, plant_id=plant.PLANT_ID) for plant in plants]
    
    def get_units_by_plant(self, db: Session, plant_id: int) -> List[Unit]:
        """Get units by plant ID"""
        units = self.unit_repo.get_by_plant(db, plant_id)
        return [Unit(name=unit.NAME, unit_id=unit.UNIT_ID) for unit in units]
    
    def get_terms_by_plant_unit(self, db: Session, plant_id: int, unit_id: int) -> List[Term]:
        """Get terms by plant and unit"""
        terms = self.term_repo.get_by_plant_unit(db, plant_id, unit_id)
        return [Term(name=term.T_NAME, term_id=term.T_ID) for term in terms]

