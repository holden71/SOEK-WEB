"""
Acceleration service - бизнес-логика для работы с акселерограммами
"""
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text

from repositories import AccelSetRepository, AccelPlotRepository, AccelPointRepository, SeismicRepository


class AccelerationService:
    """Acceleration service"""
    
    def __init__(self):
        self.accel_set_repo = AccelSetRepository()
        self.accel_plot_repo = AccelPlotRepository()
        self.accel_point_repo = AccelPointRepository()
        self.seismic_repo = SeismicRepository()
    
    def get_available_damping_factors(
        self, 
        db: Session, 
        ek_id: int, 
        spectr_earthq_type: str, 
        calc_type: str
    ) -> List[float]:
        """Get available damping factors for element"""
        try:
            query = text("""
                SELECT DISTINCT DEMPF 
                FROM SRTN_ACCEL_SET 
                WHERE PLANT_ID = (SELECT PLANT_ID FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id)
                AND UNIT_ID = (SELECT UNIT_ID FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id)
                AND BUILDING = (SELECT BUILDING FROM SRTN_EK_SEISM_DATA WHERE EK_ID = :ek_id)
                AND SPECTR_EARTHQ_TYPE = :spectr_earthq_type
                AND CALC_TYPE = :calc_type
                AND DEMPF IS NOT NULL
                ORDER BY DEMPF
            """)
            
            result = db.execute(query, {
                "ek_id": ek_id,
                "spectr_earthq_type": spectr_earthq_type,
                "calc_type": calc_type
            })
            
            return [row[0] for row in result.fetchall()]
        except Exception as e:
            print(f"Error getting damping factors: {e}")
            return []
    
    def get_spectral_data(
        self, 
        db: Session, 
        ek_id: int, 
        spectrum_type: str
    ) -> Dict[str, Any]:
        """Get spectral characteristics data"""
        try:
            # Get element data
            ek_data = self.seismic_repo.get_by_ek_id(db, ek_id)
            if not ek_data:
                return {"frequency": []}
            
            # Get natural frequency
            natural_frequency = ek_data.F_MU
            if not natural_frequency:
                return {"frequency": []}
            
            # Get acceleration set ID
            accel_set_id = None
            if spectrum_type == 'МРЗ':
                accel_set_id = ek_data.ACCEL_SET_ID_MRZ
            elif spectrum_type == 'ПЗ':
                accel_set_id = ek_data.ACCEL_SET_ID_PZ
            
            if not accel_set_id:
                return {"frequency": []}
            
            # Get acceleration set
            accel_set = self.accel_set_repo.get_by_id(db, accel_set_id)
            if not accel_set:
                return {"frequency": []}
            
            # Get spectral values for each axis
            def get_spectral_value(plot_id: int, freq: float) -> Optional[float]:
                if not plot_id:
                    return None
                point_query = text("""
                    SELECT ACCEL FROM SRTN_ACCEL_POINT 
                    WHERE PLOT_ID = :plot_id AND FREQ = :freq
                """)
                result = db.execute(point_query, {"plot_id": plot_id, "freq": freq})
                row = result.fetchone()
                return float(row[0]) if row else None
            
            frequency = [natural_frequency]
            prefix = 'mrz' if spectrum_type == 'МРЗ' else 'pz'
            
            return {
                "frequency": frequency,
                f"{prefix}_x": [get_spectral_value(accel_set.X_PLOT_ID, natural_frequency)] if accel_set.X_PLOT_ID else None,
                f"{prefix}_y": [get_spectral_value(accel_set.Y_PLOT_ID, natural_frequency)] if accel_set.Y_PLOT_ID else None,
                f"{prefix}_z": [get_spectral_value(accel_set.Z_PLOT_ID, natural_frequency)] if accel_set.Z_PLOT_ID else None,
            }
        except Exception as e:
            print(f"Error getting spectral data: {e}")
            return {"frequency": []}
    
    def get_seism_requirements(
        self,
        db: Session,
        ek_id: int,
        dempf: float,
        spectr_earthq_type: str,
        calc_type: str
    ) -> Dict[str, Any]:
        """Get seismic requirements for element"""
        try:
            # Get element data
            ek_data = self.seismic_repo.get_by_ek_id(db, ek_id)
            if not ek_data:
                return {"frequency": []}
            
            # Find acceleration set
            query = text("""
                SELECT ACCEL_SET_ID, X_PLOT_ID, Y_PLOT_ID, Z_PLOT_ID, PGA
                FROM SRTN_ACCEL_SET
                WHERE PLANT_ID = :plant_id
                AND UNIT_ID = :unit_id  
                AND BUILDING = :building
                AND ((:room IS NULL AND ROOM IS NULL) OR ROOM = :room)
                AND DEMPF = :dempf
                AND SPECTR_EARTHQ_TYPE = :spectr_earthq_type
                AND CALC_TYPE = :calc_type
                AND SET_TYPE = 'ВИМОГИ'
                AND ROWNUM = 1
            """)
            
            result = db.execute(query, {
                "plant_id": ek_data.PLANT_ID,
                "unit_id": ek_data.UNIT_ID,
                "building": ek_data.BUILDING,
                "room": ek_data.ROOM,
                "dempf": dempf,
                "spectr_earthq_type": spectr_earthq_type,
                "calc_type": calc_type
            })
            set_data = result.fetchone()
            
            if not set_data:
                return {"frequency": []}
            
            set_id, x_plot_id, y_plot_id, z_plot_id, pga = set_data
            
            # Get plot data
            def get_plot_data(plot_id: int) -> Tuple[List[float], List[float]]:
                if not plot_id:
                    return [], []
                points = self.accel_point_repo.get_by_plot_id(db, plot_id)
                frequencies = [float(p.FREQ) for p in points]
                accelerations = [float(p.ACCEL) for p in points]
                return frequencies, accelerations
            
            x_freq, x_accel = get_plot_data(x_plot_id)
            y_freq, y_accel = get_plot_data(y_plot_id)
            z_freq, z_accel = get_plot_data(z_plot_id)
            
            base_freq = max([x_freq, y_freq, z_freq], key=len) if any([x_freq, y_freq, z_freq]) else []
            prefix = 'mrz' if spectr_earthq_type == 'МРЗ' else 'pz'
            
            return {
                "frequency": base_freq,
                f"{prefix}_x": x_accel if x_accel else None,
                f"{prefix}_y": y_accel if y_accel else None,
                f"{prefix}_z": z_accel if z_accel else None,
                "pga": float(pga) if pga else None
            }
        except Exception as e:
            print(f"Error getting seism requirements: {e}")
            return {"frequency": []}
    
    def find_req_accel_set(
        self,
        db: Session,
        plant_id: int,
        unit_id: int,
        building: str,
        room: Optional[str],
        calc_type: str,
        set_type: str
    ) -> Dict[str, Any]:
        """Find required acceleration set"""
        try:
            query = text("""
                SELECT ACCEL_SET_ID 
                FROM SRTN_ACCEL_SET
                WHERE PLANT_ID = :plant_id
                AND UNIT_ID = :unit_id
                AND BUILDING = :building
                AND ((:room IS NULL AND ROOM IS NULL) OR ROOM = :room)
                AND CALC_TYPE = :calc_type
                AND SET_TYPE = :set_type
                AND ROWNUM = 1
            """)
            
            result = db.execute(query, {
                "plant_id": plant_id,
                "unit_id": unit_id,
                "building": building,
                "room": room,
                "calc_type": calc_type,
                "set_type": set_type
            })
            
            row = result.fetchone()
            set_id = row[0] if row else None
            
            # Count EK elements
            count_query = text("""
                SELECT COUNT(*) 
                FROM SRTN_EK_SEISM_DATA
                WHERE PLANT_ID = :plant_id
                AND UNIT_ID = :unit_id
                AND BUILDING = :building
            """)
            
            count_result = db.execute(count_query, {
                "plant_id": plant_id,
                "unit_id": unit_id,
                "building": building
            })
            
            found_ek = count_result.scalar() or 0
            
            return {"set_id": set_id, "found_ek": found_ek}
        except Exception as e:
            print(f"Error finding acceleration set: {e}")
            raise
    
    def clear_accel_set(self, db: Session, set_id: int) -> str:
        """Clear acceleration set arrays"""
        try:
            update_query = text("""
                UPDATE SRTN_ACCEL_SET 
                SET X_PLOT_ID = NULL, Y_PLOT_ID = NULL, Z_PLOT_ID = NULL
                WHERE ACCEL_SET_ID = :set_id
            """)
            
            db.execute(update_query, {"set_id": set_id})
            return "success"
        except Exception as e:
            print(f"Error clearing acceleration set: {e}")
            raise

