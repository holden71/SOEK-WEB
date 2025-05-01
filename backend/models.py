from typing import Any, Dict

from pydantic import BaseModel


class Plant(BaseModel):
    name: str
    plant_id: int

class Unit(BaseModel):
    name: str
    unit_id: int

class Term(BaseModel):
    name: str
    term_id: int 

class SearchData(BaseModel):
    data: Dict[str, Any] 