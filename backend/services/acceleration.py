"""
Acceleration service - бизнес-логика для работы с акселерограммами
"""
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text, Integer
import oracledb

from repositories import AccelSetRepository, AccelPlotRepository, AccelPointRepository, SeismicRepository
from repositories.plant import PlantRepository


class AccelerationService:
    """Acceleration service"""

    def __init__(self):
        self.accel_set_repo = AccelSetRepository()
        self.accel_plot_repo = AccelPlotRepository()
        self.accel_point_repo = AccelPointRepository()
        self.seismic_repo = SeismicRepository()
        self.plant_repo = PlantRepository()
    
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

            # Check if this is characteristics or requirements
            is_characteristics = accel_set.SET_TYPE == "ХАРАКТЕРИСТИКИ"

            prefix = 'mrz' if spectrum_type == 'МРЗ' else 'pz'

            if is_characteristics:
                # For characteristics: return ALL points from the plot
                def get_all_plot_points(plot_id: int) -> Tuple[List[float], List[float]]:
                    if not plot_id:
                        return [], []
                    points = self.accel_point_repo.get_by_plot_id(db, plot_id)
                    frequencies = [float(p.FREQ) for p in points]
                    accelerations = [float(p.ACCEL) for p in points]
                    return frequencies, accelerations

                x_freq, x_accel = get_all_plot_points(accel_set.X_PLOT_ID)
                y_freq, y_accel = get_all_plot_points(accel_set.Y_PLOT_ID)
                z_freq, z_accel = get_all_plot_points(accel_set.Z_PLOT_ID)

                # Use the longest frequency array as base
                base_freq = max([x_freq, y_freq, z_freq], key=len) if any([x_freq, y_freq, z_freq]) else []

                return {
                    "frequency": base_freq,
                    f"{prefix}_x": x_accel if x_accel else None,
                    f"{prefix}_y": y_accel if y_accel else None,
                    f"{prefix}_z": z_accel if z_accel else None,
                }
            else:
                # For requirements: return single point at natural frequency
                natural_frequency = ek_data.F_MU
                if not natural_frequency:
                    return {"frequency": []}

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
                SELECT ACCEL_SET_ID, X_PLOT_ID, Y_PLOT_ID, Z_PLOT_ID, PGA_
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

    def save_accel_data(
        self,
        db: Session,
        plant_id: int,
        unit_id: int,
        building: str,
        room: Optional[str],
        lev: Optional[float],
        lev1: Optional[float],
        lev2: Optional[float],
        pga: Optional[float],
        calc_type: str,
        set_type: str,
        sheets: Dict[str, Dict],
        ek_id: int,
        can_overwrite: int
    ) -> Dict[str, Any]:
        """
        Save acceleration data from Excel import

        Args:
            db: Database session
            plant_id: Plant ID
            unit_id: Unit ID
            building: Building name
            room: Room name (optional)
            lev: Level (optional)
            lev1: Level from (optional)
            lev2: Level to (optional)
            pga: Peak ground acceleration (optional)
            calc_type: Calculation type
            set_type: Set type (ВІМОГИ or ХАРАКТЕРИСТИКИ)
            sheets: Dictionary of sheet data

        Returns:
            Dictionary with created set IDs
        """
        try:
            # Get plant and unit names
            plant = self.plant_repo.get_by_id(db, plant_id)
            plant_name = plant.NAME if plant else None

            unit_query = text("SELECT NAME FROM UNS_UNITS WHERE UNIT_ID = :unit_id")
            unit_result = db.execute(unit_query, {"unit_id": unit_id})
            unit_row = unit_result.fetchone()
            unit_name = unit_row[0] if unit_row else None

            # Check if we can apply sets BEFORE creating them
            can_apply, current_mrz, current_pz = self.check_can_apply_sets(db, ek_id, can_overwrite)
            if not can_apply:
                raise ValueError(
                    f"Елемент вже має характеристики (МРЗ={current_mrz}, ПЗ={current_pz}). "
                    f"Для перезапису встановіть галочку 'Перезаписати існуючі'"
                )

            # Process each sheet
            mrz_set_id = None
            pz_set_id = None

            for sheet_name, sheet_info in sheets.items():
                dempf = sheet_info.dempf  # For ВІМОГИ
                data = sheet_info.data

                # Determine SPECTR_EARTHQ_TYPE based on set_type
                if set_type == "ХАРАКТЕРИСТИКИ":
                    # For characteristics, we create two sets: МРЗ and ПЗ
                    # Extract frequency data
                    frequency_data = None
                    frequency_col_name = None

                    # Search for frequency column (case-insensitive, with various formats)
                    for key in data.keys():
                        key_lower = key.lower().replace(' ', '').replace(',', '').replace('.', '')
                        if any(x in key_lower for x in ['частота', 'frequency', 'freq', 'hz', 'гц']):
                            frequency_data = data[key]
                            frequency_col_name = key
                            break

                    if not frequency_data:
                        # Log available columns for debugging
                        available_cols = ', '.join(data.keys())
                        raise ValueError(f"Frequency column not found in data. Available columns: {available_cols}")

                    # Auto-fill missing columns
                    filled_data = self._auto_fill_spectrum_data(data)

                    # Validate that we have at least some МРЗ or ПЗ data
                    has_mrz = any(key.startswith('МРЗ_') for key in filled_data.keys())
                    has_pz = any(key.startswith('ПЗ_') for key in filled_data.keys())

                    if not has_mrz and not has_pz:
                        available_cols = ', '.join(data.keys())
                        raise ValueError(
                            f"No МРЗ or ПЗ spectrum columns found in data. "
                            f"Expected columns like 'МРЗ_X', 'МРЗ_Y', 'МРЗ_Z', 'ПЗ_X', 'ПЗ_Y', 'ПЗ_Z'. "
                            f"Available columns: {available_cols}"
                        )

                    # Create МРЗ set
                    mrz_set_id = self._create_accel_set_with_plots(
                        db=db,
                        plant_id=plant_id,
                        plant_name=plant_name,
                        unit_id=unit_id,
                        unit_name=unit_name,
                        building=building,
                        room=room,
                        lev=lev,
                        lev1=lev1,
                        lev2=lev2,
                        pga=pga,
                        calc_type=calc_type,
                        set_type=set_type,
                        spectr_earthq_type="МРЗ",
                        dempf=None,
                        frequency_data=frequency_data,
                        x_data=filled_data.get("МРЗ_X", []),
                        y_data=filled_data.get("МРЗ_Y", []),
                        z_data=filled_data.get("МРЗ_Z", [])
                    )

                    # Create ПЗ set
                    pz_set_id = self._create_accel_set_with_plots(
                        db=db,
                        plant_id=plant_id,
                        plant_name=plant_name,
                        unit_id=unit_id,
                        unit_name=unit_name,
                        building=building,
                        room=room,
                        lev=lev,
                        lev1=lev1,
                        lev2=lev2,
                        pga=pga,
                        calc_type=calc_type,
                        set_type=set_type,
                        spectr_earthq_type="ПЗ",
                        dempf=None,
                        frequency_data=frequency_data,
                        x_data=filled_data.get("ПЗ_X", []),
                        y_data=filled_data.get("ПЗ_Y", []),
                        z_data=filled_data.get("ПЗ_Z", [])
                    )
                else:
                    # For ВІМОГИ, create sets based on DEMPF and earthquake type
                    # This is the old logic for requirements
                    raise NotImplementedError("ВІМОГИ import not yet implemented in new architecture")

            db.flush()

            return {
                "mrz_set_id": mrz_set_id,
                "pz_set_id": pz_set_id,
                "message": "Data saved successfully"
            }

        except Exception as e:
            print(f"Error saving acceleration data: {e}")
            raise

    def _auto_fill_spectrum_data(self, data: Dict[str, List]) -> Dict[str, List]:
        """
        Auto-fill missing spectrum columns according to rules:
        - If only MRZ_X exists, copy to MRZ_Y and MRZ_Z
        - If MRZ_X and MRZ_Y exist but not MRZ_Z, copy MRZ_Y to MRZ_Z
        - Same logic for PZ columns
        - If PZ columns missing, copy from MRZ
        """
        result = {}

        # Normalize column names to uppercase with underscores
        normalized_data = {}
        for key, value in data.items():
            # Skip frequency columns (remove spaces, commas, dots for comparison)
            key_clean = key.lower().replace(' ', '').replace(',', '').replace('.', '')
            if any(x in key_clean for x in ['частота', 'frequency', 'freq', 'hz', 'гц']):
                continue

            # Normalize column name: replace spaces and separators with underscores
            key_upper = key.upper().replace(' ', '_').replace(',', '').replace('.', '')
            # Handle МРЗ/ПЗ variations
            for old, new in [('MRZ', 'МРЗ'), ('PZ', 'ПЗ'), ('MRS', 'МРЗ'), ('PS', 'ПЗ')]:
                if old in key_upper:
                    key_upper = key_upper.replace(old, new)
            normalized_data[key_upper] = value

        # Define expected columns
        mrz_cols = ['МРЗ_X', 'МРЗ_Y', 'МРЗ_Z']
        pz_cols = ['ПЗ_X', 'ПЗ_Y', 'ПЗ_Z']

        # Find what we have for МРЗ
        mrz_available = {col: normalized_data.get(col) for col in mrz_cols if col in normalized_data}

        # Find what we have for ПЗ
        pz_available = {col: normalized_data.get(col) for col in pz_cols if col in normalized_data}

        # Auto-fill МРЗ
        if mrz_available:
            # Get first available MRZ column
            first_mrz = next(iter(mrz_available.values()))

            result['МРЗ_X'] = mrz_available.get('МРЗ_X', first_mrz)
            result['МРЗ_Y'] = mrz_available.get('МРЗ_Y', result['МРЗ_X'])
            result['МРЗ_Z'] = mrz_available.get('МРЗ_Z', result['МРЗ_Y'])
        elif pz_available:
            # If no MRZ data, copy from PZ
            first_pz = next(iter(pz_available.values()))
            result['МРЗ_X'] = pz_available.get('ПЗ_X', first_pz)
            result['МРЗ_Y'] = pz_available.get('ПЗ_Y', result['МРЗ_X'])
            result['МРЗ_Z'] = pz_available.get('ПЗ_Z', result['МРЗ_Y'])

        # Auto-fill ПЗ
        if pz_available:
            # Get first available PZ column
            first_pz = next(iter(pz_available.values()))

            result['ПЗ_X'] = pz_available.get('ПЗ_X', first_pz)
            result['ПЗ_Y'] = pz_available.get('ПЗ_Y', result['ПЗ_X'])
            result['ПЗ_Z'] = pz_available.get('ПЗ_Z', result['ПЗ_Y'])
        elif mrz_available:
            # If no PZ data, copy from MRZ
            result['ПЗ_X'] = result['МРЗ_X']
            result['ПЗ_Y'] = result['МРЗ_Y']
            result['ПЗ_Z'] = result['МРЗ_Z']

        return result

    def _create_accel_set_with_plots(
        self,
        db: Session,
        plant_id: int,
        plant_name: Optional[str],
        unit_id: int,
        unit_name: Optional[str],
        building: str,
        room: Optional[str],
        lev: Optional[float],
        lev1: Optional[float],
        lev2: Optional[float],
        pga: Optional[float],
        calc_type: str,
        set_type: str,
        spectr_earthq_type: str,
        dempf: Optional[float],
        frequency_data: List[float],
        x_data: List[float],
        y_data: List[float],
        z_data: List[float]
    ) -> int:
        """Create acceleration set with plots and points"""

        # Create plots for each axis
        x_plot_id = None
        y_plot_id = None
        z_plot_id = None

        if x_data:
            x_plot_id = self.accel_plot_repo.create_plot(
                db, axis="X", name=f"{set_type}_{spectr_earthq_type}_X"
            )
            for freq, accel in zip(frequency_data, x_data):
                if freq is not None and accel is not None:
                    self.accel_point_repo.create_point(db, freq, accel, x_plot_id)

        if y_data:
            y_plot_id = self.accel_plot_repo.create_plot(
                db, axis="Y", name=f"{set_type}_{spectr_earthq_type}_Y"
            )
            for freq, accel in zip(frequency_data, y_data):
                if freq is not None and accel is not None:
                    self.accel_point_repo.create_point(db, freq, accel, y_plot_id)

        if z_data:
            z_plot_id = self.accel_plot_repo.create_plot(
                db, axis="Z", name=f"{set_type}_{spectr_earthq_type}_Z"
            )
            for freq, accel in zip(frequency_data, z_data):
                if freq is not None and accel is not None:
                    self.accel_point_repo.create_point(db, freq, accel, z_plot_id)

        # Create acceleration set
        set_id = self.accel_set_repo.create_set(
            db,
            SET_TYPE=set_type,
            X_PLOT_ID=x_plot_id,
            Y_PLOT_ID=y_plot_id,
            Z_PLOT_ID=z_plot_id,
            BUILDING=building,
            ROOM=room,
            LEV=lev,
            LEV1=lev1,
            LEV2=lev2,
            DEMPF=dempf,
            PLANT_ID=plant_id,
            PLANT_NAME=plant_name,
            UNIT_ID=unit_id,
            UNIT_NAME=unit_name,
            PGA_=pga,
            SPECTR_EARTHQ_TYPE=spectr_earthq_type,
            CALC_TYPE=calc_type
        )

        return set_id

    def execute_set_all_ek_accel_set(
        self,
        db: Session,
        ek_id: int,
        set_mrz: int,
        set_pz: int,
        can_overwrite: int,
        do_for_all: int,
        clear_sets: int
    ) -> Dict[str, Any]:
        """
        Set acceleration sets for EK elements using stored procedure

        Args:
            db: Database session
            ek_id: Element ID
            set_mrz: МРЗ set ID
            set_pz: ПЗ set ID
            can_overwrite: Allow overwriting existing sets (1=yes, 0=no)
            do_for_all: Apply to all elements of same type (1=yes, 0=no)
            clear_sets: Clear sets if data is empty (1=yes, 0=no)

        Returns:
            Dictionary with processing results
        """
        try:
            # Call stored procedure - it handles all logic including cleanup
            result = self._call_set_all_ek_accel_set(
                db=db,
                ek_id=ek_id,
                set_mrz=set_mrz,
                set_pz=set_pz,
                can_overwrite=can_overwrite,
                do_for_all=do_for_all,
                clear_sets=clear_sets
            )

            return result

        except Exception as e:
            print(f"Error executing set_all_ek_accel_set: {e}")
            raise

    def check_can_apply_sets(
        self,
        db: Session,
        ek_id: int,
        can_overwrite: int
    ) -> Tuple[bool, Optional[int], Optional[int]]:
        """
        Check if acceleration sets can be applied to element

        Returns:
            (can_apply, current_mrz_id, current_pz_id)
        """
        try:
            # Get current sets for element
            ek_data = self.seismic_repo.get_by_ek_id(db, ek_id)
            if not ek_data:
                raise ValueError(f"Element with EK_ID={ek_id} not found")

            current_mrz_id = ek_data.ACCEL_SET_ID_MRZ
            current_pz_id = ek_data.ACCEL_SET_ID_PZ

            # If no existing sets, we can apply
            if current_mrz_id is None and current_pz_id is None:
                return True, None, None

            # If has existing sets and can't overwrite
            if can_overwrite == 0:
                return False, current_mrz_id, current_pz_id

            # Can overwrite
            return True, current_mrz_id, current_pz_id

        except Exception as e:
            print(f"Error checking if can apply sets: {e}")
            raise

    def _call_set_ek_accel_set(
        self,
        db: Session,
        ek_id: int,
        set_mrz: Optional[int],
        set_pz: Optional[int],
        can_overwrite: int,
        clear_sets: int
    ) -> Dict[str, int]:
        """
        Call SET_EK_ACCEL_SET stored procedure

        Returns:
            dict with is_done_mrz and is_done_pz
        """
        try:
            # Get native Oracle connection
            raw_conn = db.connection().connection.driver_connection

            # Create cursor first
            cursor = raw_conn.cursor()
            
            # Create OUT parameters using cursor.var()
            is_done_mrz = cursor.var(oracledb.NUMBER)
            is_done_pz = cursor.var(oracledb.NUMBER)
            cursor.callproc('SET_EK_ACCEL_SET', [
                ek_id,
                set_mrz,
                set_pz,
                can_overwrite,
                clear_sets,
                is_done_mrz,
                is_done_pz
            ])

            result = {
                'is_done_mrz': int(is_done_mrz.getvalue() or 0),
                'is_done_pz': int(is_done_pz.getvalue() or 0)
            }

            cursor.close()

            return result
        except Exception as e:
            print(f"Error calling SET_EK_ACCEL_SET: {e}")
            raise

    def _call_clear_accel_set_arrays(
        self,
        db: Session,
        set_id: int
    ) -> str:
        """
        Call CLEAR_ACCEL_CET_ARRAYS stored procedure

        Returns:
            clear_result string
        """
        try:
            # Get native Oracle connection
            raw_conn = db.connection().connection.driver_connection

            # Create cursor first
            cursor = raw_conn.cursor()
            
            # Create OUT parameter using cursor.var()
            clear_result = cursor.var(oracledb.STRING)
            cursor.callproc('CLEAR_ACCEL_CET_ARRAYS', [set_id, clear_result])

            return str(clear_result.getvalue() or '')
        except Exception as e:
            print(f"Error calling CLEAR_ACCEL_CET_ARRAYS: {e}")
            raise

    def _call_set_all_ek_accel_set(
        self,
        db: Session,
        ek_id: int,
        set_mrz: int,
        set_pz: int,
        can_overwrite: int,
        do_for_all: int,
        clear_sets: int
    ) -> Dict[str, Any]:
        """
        Call SET_ALL_EK_ACCEL_SET stored procedure

        Returns:
            dict with all OUT parameters
        """
        try:
            # Get native Oracle connection
            raw_conn = db.connection().connection.driver_connection

            # Create cursor first
            cursor = raw_conn.cursor()
            
            # Create OUT parameters using cursor.var()
            done_for_id_mrz = cursor.var(oracledb.NUMBER)
            done_for_id_pz = cursor.var(oracledb.NUMBER)
            done_for_all_mrz = cursor.var(oracledb.NUMBER)
            done_for_all_pz = cursor.var(oracledb.NUMBER)
            total_ek = cursor.var(oracledb.NUMBER)
            processed_mrz = cursor.var(oracledb.NUMBER)
            processed_pz = cursor.var(oracledb.NUMBER)
            cursor.callproc('SET_ALL_EK_ACCEL_SET', [
                ek_id,
                set_mrz,
                set_pz,
                can_overwrite,
                do_for_all,
                clear_sets,
                done_for_id_mrz,
                done_for_id_pz,
                done_for_all_mrz,
                done_for_all_pz,
                total_ek,
                processed_mrz,
                processed_pz
            ])

            # Get values from OUT parameters
            result = {
                'done_for_id_mrz': int(done_for_id_mrz.getvalue() or 0),
                'done_for_id_pz': int(done_for_id_pz.getvalue() or 0),
                'done_for_all_mrz': int(done_for_all_mrz.getvalue() or 0) if done_for_all_mrz.getvalue() is not None else None,
                'done_for_all_pz': int(done_for_all_pz.getvalue() or 0) if done_for_all_pz.getvalue() is not None else None,
                'total_ek': int(total_ek.getvalue() or 0),
                'processed_mrz': int(processed_mrz.getvalue() or 0),
                'processed_pz': int(processed_pz.getvalue() or 0)
            }

            # Close cursor but keep connection for SQLAlchemy
            cursor.close()

            return result
        except Exception as e:
            print(f"Error calling SET_ALL_EK_ACCEL_SET: {e}")
            raise

