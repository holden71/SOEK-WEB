"""
Seismic Analysis service - сейсмический анализ (M1, M2, K-коэффициенты, SIGMA, HCLPF)
"""
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from repositories import SeismicRepository


class SeismicAnalysisService:
    """Seismic analysis service - анализ изменения сейсмических требований"""
    
    def __init__(self):
        self.seismic_repo = SeismicRepository()
    
    def save_analysis_result(
        self,
        db: Session,
        ek_id: int,
        spectrum_type: str,
        m1: Optional[float] = None,
        m2: Optional[float] = None
    ) -> Dict[str, Any]:
        """Save analysis result (M1, M2 values)"""
        update_data = {}
        
        if spectrum_type == "МРЗ":
            if m1 is not None:
                update_data["M1_MRZ"] = m1
            if m2 is not None:
                update_data["M2_MRZ"] = m2
        elif spectrum_type == "ПЗ":
            if m1 is not None:
                update_data["M1_PZ"] = m1
            if m2 is not None:
                update_data["M2_PZ"] = m2
        
        if update_data:
            self.seismic_repo.update_fields(db, ek_id, **update_data)
        
        return {
            "success": bool(update_data),
            "message": f"Analysis results saved for {spectrum_type}" if update_data else "No data to update",
            "updated_fields": update_data
        }
    
    def save_stress_inputs(
        self,
        db: Session,
        ek_id: int,
        **kwargs
    ) -> Dict[str, Any]:
        """Save stress inputs"""
        field_mapping = {
            "first_nat_freq_x": "FIRST_NAT_FREQ_X",
            "first_nat_freq_y": "FIRST_NAT_FREQ_Y",
            "first_nat_freq_z": "FIRST_NAT_FREQ_Z",
            "sigma_dop": "SIGMA_DOP",
            "hclpf": "HCLPF",
            "sigma_1": "SIGMA_1",
            "sigma_2": "SIGMA_2",
            "sigma_1_1_pz": "SIGMA_S_1_PZ",
            "sigma_1_2_pz": "SIGMA_S_2_PZ",
            "sigma_1_s1_pz": "SIGMA_S_S1_PZ",
            "sigma_2_s2_pz": "SIGMA_S_S2_PZ",
            "sigma_1_1_mrz": "SIGMA_S_1_MRZ",
            "sigma_1_2_mrz": "SIGMA_S_2_MRZ",
            "sigma_1_s1_mrz": "SIGMA_S_S1_MRZ",
            "sigma_2_s2_mrz": "SIGMA_S_S2_MRZ",
        }
        
        update_data = {}
        for param_name, db_field in field_mapping.items():
            if param_name in kwargs:
                # Allow None values to clear fields in database
                update_data[db_field] = kwargs[param_name]
        
        if update_data:
            self.seismic_repo.update_fields(db, ek_id, **update_data)
        
        return {
            "success": bool(update_data),
            "message": "Stress inputs saved successfully" if update_data else "No data to update",
            "updated_fields": update_data
        }
    
    def save_k_results(
        self,
        db: Session,
        ek_id: int,
        **kwargs
    ) -> Dict[str, Any]:
        """Save K calculation results"""
        field_mapping = {
            "k1_pz": "K1_PZ",
            "k1_mrz": "K1_MRZ",
            "k3_pz": "K3_PZ",
            "k3_mrz": "K3_MRZ",
            "k2_value": "K2_",
            "n_pz": "N_PZ",
            "n_mrz": "N_MRZ",
        }
        
        update_data = {}
        for param_name, db_field in field_mapping.items():
            if param_name in kwargs and kwargs[param_name] is not None:
                update_data[db_field] = kwargs[param_name]
        
        if update_data:
            self.seismic_repo.update_fields(db, ek_id, **update_data)
        
        return {
            "success": bool(update_data),
            "message": "K results saved successfully" if update_data else "No data to update",
            "updated_fields": update_data
        }
    
    def get_k_results(self, db: Session, ek_id: int) -> Dict[str, Optional[float]]:
        """Get K calculation results"""
        # TODO: Даже если k уже были рассчитаны когда-то, то их значения не подтягиваются назад из базы
        # Проверить: возвращаются ли данные корректно, возможно нужно добавить SEISMIC_CATEGORY_PZ
        query = text("""
            SELECT K1_PZ, K1_MRZ, K3_PZ, K3_MRZ, K2_, N_PZ, N_MRZ
            FROM SRTN_EK_SEISM_DATA
            WHERE EK_ID = :ek_id
        """)
        
        result = db.execute(query, {"ek_id": ek_id})
        row = result.fetchone()
        
        if not row:
            raise ValueError("Element not found")
        
        return {
            "k1_pz": float(row[0]) if row[0] is not None else None,
            "k1_mrz": float(row[1]) if row[1] is not None else None,
            "k3_pz": float(row[2]) if row[2] is not None else None,
            "k3_mrz": float(row[3]) if row[3] is not None else None,
            "k2_value": float(row[4]) if row[4] is not None else None,
            "n_pz": float(row[5]) if row[5] is not None else None,
            "n_mrz": float(row[6]) if row[6] is not None else None,
        }
    
    def get_calculation_results(self, db: Session, ek_id: int) -> Dict[str, Any]:
        """Get all calculation results including sigma_alt values"""
        query = text("""
            SELECT M1_MRZ, M2_MRZ, M1_PZ, M2_PZ,
                   SIGMA_S_ALT_1_PZ, SIGMA_S_ALT_2_PZ,
                   SIGMA_S_ALT_1_MRZ, SIGMA_S_ALT_2_MRZ
            FROM SRTN_EK_SEISM_DATA
            WHERE EK_ID = :ek_id
        """)
        
        result = db.execute(query, {"ek_id": ek_id})
        row = result.fetchone()
        
        if not row:
            raise ValueError("Element not found")
        
        # Build calculated_values dict with only non-null sigma_alt values
        calculated_values = {}
        if row[4] is not None:
            calculated_values["SIGMA_S_ALT_1_PZ"] = float(row[4])
        if row[5] is not None:
            calculated_values["SIGMA_S_ALT_2_PZ"] = float(row[5])
        if row[6] is not None:
            calculated_values["SIGMA_S_ALT_1_MRZ"] = float(row[6])
        if row[7] is not None:
            calculated_values["SIGMA_S_ALT_2_MRZ"] = float(row[7])
        
        return {
            "m1_mrz": float(row[0]) if row[0] is not None else None,
            "m2_mrz": float(row[1]) if row[1] is not None else None,
            "m1_pz": float(row[2]) if row[2] is not None else None,
            "m2_pz": float(row[3]) if row[3] is not None else None,
            "calculated_values": calculated_values
        }
    
    def get_stress_inputs(self, db: Session, ek_id: int) -> Dict[str, Optional[float]]:
        """Get stress inputs"""
        query = text("""
            SELECT FIRST_NAT_FREQ_X, FIRST_NAT_FREQ_Y, FIRST_NAT_FREQ_Z,
                   SIGMA_DOP, HCLPF, SIGMA_1, SIGMA_2,
                   SIGMA_S_1_PZ, SIGMA_S_2_PZ, SIGMA_S_S1_PZ, SIGMA_S_S2_PZ,
                   SIGMA_S_1_MRZ, SIGMA_S_2_MRZ, SIGMA_S_S1_MRZ, SIGMA_S_S2_MRZ
            FROM SRTN_EK_SEISM_DATA
            WHERE EK_ID = :ek_id
        """)
        
        result = db.execute(query, {"ek_id": ek_id})
        row = result.fetchone()
        
        if not row:
            raise ValueError("Element not found")
        
        return {
            "first_nat_freq_x": float(row[0]) if row[0] is not None else None,
            "first_nat_freq_y": float(row[1]) if row[1] is not None else None,
            "first_nat_freq_z": float(row[2]) if row[2] is not None else None,
            "sigma_dop": float(row[3]) if row[3] is not None else None,
            "hclpf": float(row[4]) if row[4] is not None else None,
            "sigma_1": float(row[5]) if row[5] is not None else None,
            "sigma_2": float(row[6]) if row[6] is not None else None,
            # Return keys matching database column names in lowercase
            "sigma_s_1_pz": float(row[7]) if row[7] is not None else None,
            "sigma_s_2_pz": float(row[8]) if row[8] is not None else None,
            "sigma_s_s1_pz": float(row[9]) if row[9] is not None else None,
            "sigma_s_s2_pz": float(row[10]) if row[10] is not None else None,
            "sigma_s_1_mrz": float(row[11]) if row[11] is not None else None,
            "sigma_s_2_mrz": float(row[12]) if row[12] is not None else None,
            "sigma_s_s1_mrz": float(row[13]) if row[13] is not None else None,
            "sigma_s_s2_mrz": float(row[14]) if row[14] is not None else None,
        }
    
    def check_calculation_requirements(self, db: Session, ek_id: int) -> Dict[str, Any]:
        """Check if calculation requirements are met for sigma_alt calculations"""
        query = text("""
            SELECT 
                SIGMA_S_1_PZ, SIGMA_S_S1_PZ, M1_PZ,
                SIGMA_S_2_PZ, SIGMA_S_S2_PZ,
                SIGMA_S_1_MRZ, SIGMA_S_S1_MRZ, M1_MRZ,
                SIGMA_S_2_MRZ, SIGMA_S_S2_MRZ
            FROM SRTN_EK_SEISM_DATA
            WHERE EK_ID = :ek_id
        """)
        
        result = db.execute(query, {"ek_id": ek_id})
        row = result.fetchone()
        
        if not row:
            raise ValueError("Element not found")
        
        (
            sigma_s_1_pz, sigma_s_s1_pz, m1_pz,
            sigma_s_2_pz, sigma_s_s2_pz,
            sigma_s_1_mrz, sigma_s_s1_mrz, m1_mrz,
            sigma_s_2_mrz, sigma_s_s2_mrz
        ) = row
        
        # Check requirements for PZ sigma_alt_1
        pz_sigma_alt_1_missing = []
        if sigma_s_1_pz is None:
            pz_sigma_alt_1_missing.append("(σ₁)₁")
        if sigma_s_s1_pz is None:
            pz_sigma_alt_1_missing.append("(σ₁)s₁")
        if m1_pz is None:
            pz_sigma_alt_1_missing.append("m₁")
        
        # Check requirements for PZ sigma_alt_2
        pz_sigma_alt_2_missing = []
        if sigma_s_2_pz is None:
            pz_sigma_alt_2_missing.append("(σ₁)₂")
        if sigma_s_s2_pz is None:
            pz_sigma_alt_2_missing.append("(σ₂)s₂")
        if m1_pz is None:
            pz_sigma_alt_2_missing.append("m₁")
        
        # Check requirements for MRZ sigma_alt_1
        mrz_sigma_alt_1_missing = []
        if sigma_s_1_mrz is None:
            mrz_sigma_alt_1_missing.append("(σ₁)₁")
        if sigma_s_s1_mrz is None:
            mrz_sigma_alt_1_missing.append("(σ₁)s₁")
        if m1_mrz is None:
            mrz_sigma_alt_1_missing.append("m₁")
        
        # Check requirements for MRZ sigma_alt_2
        mrz_sigma_alt_2_missing = []
        if sigma_s_2_mrz is None:
            mrz_sigma_alt_2_missing.append("(σ₁)₂")
        if sigma_s_s2_mrz is None:
            mrz_sigma_alt_2_missing.append("(σ₂)s₂")
        if m1_mrz is None:
            mrz_sigma_alt_2_missing.append("m₁")
        
        return {
            "success": True,
            "requirements": {
                "pz": {
                    "sigma_alt_1": {
                        "can_calculate": len(pz_sigma_alt_1_missing) == 0,
                        "missing_fields": pz_sigma_alt_1_missing
                    },
                    "sigma_alt_2": {
                        "can_calculate": len(pz_sigma_alt_2_missing) == 0,
                        "missing_fields": pz_sigma_alt_2_missing
                    }
                },
                "mrz": {
                    "sigma_alt_1": {
                        "can_calculate": len(mrz_sigma_alt_1_missing) == 0,
                        "missing_fields": mrz_sigma_alt_1_missing
                    },
                    "sigma_alt_2": {
                        "can_calculate": len(mrz_sigma_alt_2_missing) == 0,
                        "missing_fields": mrz_sigma_alt_2_missing
                    }
                }
            }
        }

