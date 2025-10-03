"""
Helpers - вспомогательные функции для бизнес-логики
"""
from typing import List, Tuple, Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session


def get_plot_data(db: Session, plot_id: int) -> Tuple[List[float], List[float]]:
    """Extract frequency and acceleration data from a plot"""
    if not plot_id:
        return [], []
    
    point_query = text(
        """
        SELECT FREQ, ACCEL
        FROM SRTN_ACCEL_POINT
        WHERE PLOT_ID = :plot_id
        ORDER BY FREQ
        """
    )
    point_result = db.execute(point_query, {"plot_id": plot_id})
    points = point_result.fetchall()
    
    frequencies = []
    accelerations = []
    for point in points:
        freq = float(point[0]) if point[0] is not None else 0.0
        accel = float(point[1]) if point[1] is not None else 0.0
        frequencies.append(freq)
        accelerations.append(accel)
    
    return frequencies, accelerations


def build_spectral_response(
    x_freq: List[float],
    y_freq: List[float],
    z_freq: List[float],
    x_accel: List[float],
    y_accel: List[float],
    z_accel: List[float],
    spectrum_type: str
) -> Dict[str, Any]:
    """Build spectral data response dict"""
    all_frequencies = [x_freq, y_freq, z_freq]
    base_freq = max(all_frequencies, key=len) if any(all_frequencies) else []
    
    response_data = {"frequency": base_freq}
    if spectrum_type == "МРЗ":
        response_data["mrz_x"] = x_accel if x_accel else None
        response_data["mrz_y"] = y_accel if y_accel else None
        response_data["mrz_z"] = z_accel if z_accel else None
    elif spectrum_type == "ПЗ":
        response_data["pz_x"] = x_accel if x_accel else None
        response_data["pz_y"] = y_accel if y_accel else None
        response_data["pz_z"] = z_accel if z_accel else None
    
    return response_data

