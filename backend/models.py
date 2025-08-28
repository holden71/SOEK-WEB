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
    # Сохраняем k3 значения
    k3_pz: Optional[float] = None      # Сохраняется в K3_PZ
    k3_mrz: Optional[float] = None     # Сохраняется в K3_MRZ
    # Сохраняем k2 (общая величина)
    k2_value: Optional[float] = None   # Сохраняется в K2_
    # Параметр n
    n_pz: Optional[float] = None       # Сохраняется в N_PZ
    n_mrz: Optional[float] = None      # Сохраняется в N_MRZ
    # Общий флаг
    calculated: Optional[bool] = None

class SaveKResultsResponse(BaseModel):
    success: bool
    message: str
    updated_fields: Dict[str, Any] 


# Request/response models moved from main.py for better modularity
class LocationCheck(BaseModel):
    plant_id: int
    unit_id: int
    building: str
    room: str


class BuildingCheck(BaseModel):
    plant_id: int
    unit_id: int
    building: str


class AccelDataItem(BaseModel):
    dempf: Optional[float] = None
    data: Dict[str, List[Any]]


class AccelData(BaseModel):
    plant_id: int
    unit_id: int
    building: str
    room: Optional[str] = None
    lev: Optional[float] = None
    lev1: Optional[float] = None
    lev2: Optional[float] = None
    pga: Optional[float] = None
    calc_type: str
    set_type: str = "ВИМОГИ"
    sheets: Dict[str, AccelDataItem]


class LoadAnalysisParams(BaseModel):
    element_id: int
    material: Optional[str] = None
    doc_code_analytics: Optional[str] = None
    doc_code_operation: Optional[str] = None
    sigma_alt_dop: Optional[float] = None
    p1_pz: Optional[float] = None
    temp1_pz: Optional[float] = None
    p2_pz: Optional[float] = None
    temp2_pz: Optional[float] = None
    sigma_dop_a_pz: Optional[float] = None
    ratio_e_pz: Optional[float] = None
    p1_mrz: Optional[float] = None
    temp1_mrz: Optional[float] = None
    p2_mrz: Optional[float] = None
    temp2_mrz: Optional[float] = None
    sigma_dop_a_mrz: Optional[float] = None
    ratio_e_mrz: Optional[float] = None
    # Результаты расчетов
    delta_t_pz: Optional[float] = None
    ratio_p_pz: Optional[float] = None
    delta_t_mrz: Optional[float] = None
    ratio_p_mrz: Optional[float] = None
    # Новые частоты
    first_freq_alt_pz: Optional[float] = None
    first_freq_alt_mrz: Optional[float] = None
    # deltaSigma
    ration_sigma_dop_pz: Optional[float] = None
    ration_sigma_dop_mrz: Optional[float] = None
    # M1 альтернативные
    m1_alt_pz: Optional[float] = None
    m1_alt_mrz: Optional[float] = None
    # K1 альтернативные
    k1_alt_pz: Optional[float] = None
    k1_alt_mrz: Optional[float] = None


class Model3DData(BaseModel):
    data: Dict[str, Any]

class FileData(BaseModel):
    data: Dict[str, Any]

class FileTypeData(BaseModel):
    data: Dict[str, Any]

class CreateFileTypeRequest(BaseModel):
    name: str
    descr: str
    def_ext: str