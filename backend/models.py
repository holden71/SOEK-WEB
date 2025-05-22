from typing import Any, Dict, Optional

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

class SetAccelProcedureParams(BaseModel):
    ek_id: int
    set_mrz: int
    set_pz: int
    can_overwrite: int
    do_for_all: int

class SetAccelProcedureResult(BaseModel):
    done_for_id: int
    done_for_all: Optional[int] = None 