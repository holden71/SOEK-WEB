"""
Analysis Pydantic schemas
"""
from typing import Any, Dict, Optional
from pydantic import BaseModel


class SaveAnalysisResultParams(BaseModel):
    """Save analysis result parameters schema"""
    ek_id: int
    spectrum_type: str  # МРЗ or ПЗ
    m1: Optional[float] = None
    m2: Optional[float] = None


class SaveAnalysisResultResponse(BaseModel):
    """Save analysis result response schema"""
    success: bool
    message: str
    updated_fields: Dict[str, Any]


class SaveStressInputsParams(BaseModel):
    """Save stress inputs parameters schema"""
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
    """Save stress inputs response schema"""
    success: bool
    message: str
    updated_fields: Dict[str, Any]


class SaveKResultsParams(BaseModel):
    """Save K results parameters schema"""
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
    """Save K results response schema"""
    success: bool
    message: str
    updated_fields: Dict[str, Any]


class LoadAnalysisParams(BaseModel):
    """Load analysis parameters schema"""
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

