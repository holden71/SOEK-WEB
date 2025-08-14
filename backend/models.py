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
    # Общие характеристики
    natural_frequency: Optional[float] = None
    sigma_dop: Optional[float] = None
    hclpf: Optional[float] = None
    sigma_1: Optional[float] = None
    sigma_2: Optional[float] = None
    # Поля для ПЗ
    sigma_1_1_pz: Optional[float] = None
    sigma_1_2_pz: Optional[float] = None
    sigma_1_s1_pz: Optional[float] = None
    sigma_2_s2_pz: Optional[float] = None
    # Поля для МРЗ
    sigma_1_1_mrz: Optional[float] = None
    sigma_1_2_mrz: Optional[float] = None
    sigma_1_s1_mrz: Optional[float] = None
    sigma_2_s2_mrz: Optional[float] = None

class SaveStressInputsResponse(BaseModel):
    success: bool
    message: str
    updated_fields: Dict[str, Any]

class SaveKResultsParams(BaseModel):
    ek_id: int
    # Сохраняем k1 значения в K1 поля
    k1_pz: Optional[float] = None      # Сохраняется в K1_PZ
    k1_mrz: Optional[float] = None     # Сохраняется в K1_MRZ
    # Параметр n
    n_pz: Optional[float] = None       # Сохраняется в N_PZ
    n_mrz: Optional[float] = None      # Сохраняется в N_MRZ
    # Общий флаг
    calculated: Optional[bool] = None

class SaveKResultsResponse(BaseModel):
    success: bool
    message: str
    updated_fields: Dict[str, Any] 