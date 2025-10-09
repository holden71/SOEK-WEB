"""
Acceleration data Pydantic schemas
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class AccelDataItem(BaseModel):
    """Acceleration data item schema"""
    dempf: Optional[float] = None
    data: Dict[str, List[Any]]


class AccelData(BaseModel):
    """Acceleration data schema"""
    plant_id: int
    unit_id: int
    building: str
    room: Optional[str] = None
    lev: Optional[float] = None
    lev1: Optional[float] = None
    lev2: Optional[float] = None
    pga: Optional[float] = None
    calc_type: str
    set_type: str = "ВІМОГИ"
    sheets: Dict[str, AccelDataItem]
    ek_id: int  # Element ID for checking if can apply
    can_overwrite: int = 0  # Allow overwriting existing sets


class SetAccelProcedureParams(BaseModel):
    """Set acceleration procedure parameters schema"""
    ek_id: int
    set_mrz: int
    set_pz: int
    can_overwrite: int
    do_for_all: int
    clear_sets: int = 0


class SetAccelProcedureResult(BaseModel):
    """Set acceleration procedure result schema"""
    done_for_id_mrz: int
    done_for_id_pz: int
    done_for_all_mrz: Optional[int] = None
    done_for_all_pz: Optional[int] = None
    total_ek: int
    processed_mrz: int
    processed_pz: int


class FindReqAccelSetParams(BaseModel):
    """Find required acceleration set parameters schema"""
    plant_id: int
    unit_id: int
    building: str
    room: Optional[str] = None
    lev1: Optional[str] = None
    lev2: Optional[str] = None
    earthq_type: Optional[str] = None
    calc_type: str
    set_type: Optional[str] = None
    dempf: Optional[str] = None


class FindReqAccelSetResult(BaseModel):
    """Find required acceleration set result schema"""
    set_id: Optional[int] = None
    found_ek: int


class ClearAccelSetParams(BaseModel):
    """Clear acceleration set parameters schema"""
    set_id: int


class ClearAccelSetResult(BaseModel):
    """Clear acceleration set result schema"""
    clear_result: str


class SpectralDataResult(BaseModel):
    """Spectral data result schema"""
    frequency: List[float]
    mrz_x: Optional[List[float]] = None
    mrz_y: Optional[List[float]] = None
    mrz_z: Optional[List[float]] = None
    pz_x: Optional[List[float]] = None
    pz_y: Optional[List[float]] = None
    pz_z: Optional[List[float]] = None


class LocationCheck(BaseModel):
    """Location check schema"""
    plant_id: int
    unit_id: int
    building: str
    room: str


class BuildingCheck(BaseModel):
    """Building check schema"""
    plant_id: int
    unit_id: int
    building: str

