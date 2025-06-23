from typing import Any, Dict, Optional, List

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
    clear_sets: int = 0

class SetAccelProcedureResult(BaseModel):
    done_for_id_mrz: int
    done_for_id_pz: int
    done_for_all_mrz: Optional[int] = None
    done_for_all_pz: Optional[int] = None
    total_ek: int
    processed_mrz: int
    processed_pz: int

class FindReqAccelSetParams(BaseModel):
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
    set_id: Optional[int] = None
    found_ek: int

class ClearAccelSetParams(BaseModel):
    set_id: int

class ClearAccelSetResult(BaseModel):
    clear_result: str

class SpectralDataResult(BaseModel):
    frequency: List[float]
    mrz_x: Optional[List[float]] = None
    mrz_y: Optional[List[float]] = None
    mrz_z: Optional[List[float]] = None
    pz_x: Optional[List[float]] = None
    pz_y: Optional[List[float]] = None
    pz_z: Optional[List[float]] = None

class SaveAnalysisResultParams(BaseModel):
    ek_id: int
    spectrum_type: str  # МРЗ or ПЗ
    m1: Optional[float] = None
    m2: Optional[float] = None

class SaveAnalysisResultResponse(BaseModel):
    success: bool
    message: str
    updated_fields: Dict[str, Any]

class SaveStressInputsParams(BaseModel):
    ek_id: int
    sigma: Optional[float] = None
    hclpf: Optional[float] = None
    sigma_1: Optional[float] = None
    sigma_2: Optional[float] = None
    sigma_1_1: Optional[float] = None
    sigma_1_2: Optional[float] = None
    sigma_1_s1: Optional[float] = None
    sigma_2_s2: Optional[float] = None

class SaveStressInputsResponse(BaseModel):
    success: bool
    message: str
    updated_fields: Dict[str, Any] 