"""
Search service - бизнес-логика для поиска
"""
from typing import List
from sqlalchemy.orm import Session

from repositories import SeismicRepository
from schemas import SearchData


class SearchService:
    """Search service"""
    
    def __init__(self):
        self.seismic_repo = SeismicRepository()
    
    def search_data(self, db: Session, plant_id: int, unit_id: int, t_id: int) -> List[SearchData]:
        """Search seismic data by plant, unit and term (eklist)"""
        # Search data using repository
        seism_data_list = self.seismic_repo.search(
            db=db,
            plant_id=plant_id,
            unit_id=unit_id,
            eklist_id=t_id
        )
        
        # Convert ORM objects to response format
        search_results = []
        for seism_data in seism_data_list:
            # Convert ORM object to dictionary using all table columns
            row_dict = {}
            for column in seism_data.__table__.columns:
                value = getattr(seism_data, column.name)
                row_dict[column.name] = value
            
            search_results.append(SearchData(data=row_dict))
        
        return search_results

