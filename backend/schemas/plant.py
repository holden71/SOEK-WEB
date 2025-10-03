"""
Plant, Unit, Term Pydantic schemas
"""
from pydantic import BaseModel


class Plant(BaseModel):
    """Plant schema"""
    name: str
    plant_id: int


class Unit(BaseModel):
    """Unit schema"""
    name: str
    unit_id: int


class Term(BaseModel):
    """Term schema"""
    name: str
    term_id: int

