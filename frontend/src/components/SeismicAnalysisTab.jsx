import React from 'react';
import '../styles/SeismicAnalysisTab.css';

const SeismicAnalysisTab = ({ 
  isFrequencyEnabled, 
  setIsFrequencyEnabled, 
  naturalFrequency, 
  setNaturalFrequency,
  allSpectralData,
  allRequirementsData
}) => {
  const handleFrequencyToggle = () => {
    setIsFrequencyEnabled(!isFrequencyEnabled);
    if (!isFrequencyEnabled) {
      setNaturalFrequency(''); // Clear value when disabling
    }
  };

  const handleFrequencyChange = (e) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setNaturalFrequency(value);
    }
  };

  // Check if data exists for PZ and MRZ
  const checkDataAvailability = () => {
    const availability = {
      pz: false,
      mrz: false
    };

    // Check ПЗ data availability across all spectrum types
    const pzSpectralData = allSpectralData?.['ПЗ'];
    const pzRequirementsData = allRequirementsData?.['ПЗ'];
    
    if (pzSpectralData && pzRequirementsData) {
      const hasPzSpectral = (pzSpectralData.pz_x && pzSpectralData.pz_x.length > 0) ||
                           (pzSpectralData.pz_y && pzSpectralData.pz_y.length > 0) ||
                           (pzSpectralData.pz_z && pzSpectralData.pz_z.length > 0);
      
      const hasPzRequirements = (pzRequirementsData.pz_x && pzRequirementsData.pz_x.length > 0) ||
                               (pzRequirementsData.pz_y && pzRequirementsData.pz_y.length > 0) ||
                               (pzRequirementsData.pz_z && pzRequirementsData.pz_z.length > 0);
      
      availability.pz = hasPzSpectral && hasPzRequirements;
    }

    // Check МРЗ data availability across all spectrum types
    const mrzSpectralData = allSpectralData?.['МРЗ'];
    const mrzRequirementsData = allRequirementsData?.['МРЗ'];
    
    if (mrzSpectralData && mrzRequirementsData) {
      const hasMrzSpectral = (mrzSpectralData.mrz_x && mrzSpectralData.mrz_x.length > 0) ||
                            (mrzSpectralData.mrz_y && mrzSpectralData.mrz_y.length > 0) ||
                            (mrzSpectralData.mrz_z && mrzSpectralData.mrz_z.length > 0);
      
      const hasMrzRequirements = (mrzRequirementsData.mrz_x && mrzRequirementsData.mrz_x.length > 0) ||
                                (mrzRequirementsData.mrz_y && mrzRequirementsData.mrz_y.length > 0) ||
                                (mrzRequirementsData.mrz_z && mrzRequirementsData.mrz_z.length > 0);
      
      availability.mrz = hasMrzSpectral && hasMrzRequirements;
    }

    return availability;
  };

  const dataAvailability = checkDataAvailability();



  return (
    <div className="seismic-analysis-container">
      <div className="seismic-analysis-form">
        <h3 className="form-title">Аналіз зміни сейсмічних вимог</h3>
        
        <div className="form-content">
          <div className="parameter-group">
            <div className="parameter-header">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={isFrequencyEnabled}
                  onChange={handleFrequencyToggle}
                />
                <span className="checkmark"></span>
                <span className="parameter-label">Власна частота, Гц</span>
              </label>
            </div>
            
            <div className="parameter-input">
              <input
                type="text"
                value={naturalFrequency}
                onChange={handleFrequencyChange}
                disabled={!isFrequencyEnabled}
                placeholder="Введіть частоту"
                className={`frequency-input ${!isFrequencyEnabled ? 'disabled' : ''}`}
              />
            </div>
          </div>

          <div className="parameter-group">
            <div className="data-availability-section">
              <h4 className="section-title">Доступність даних</h4>
              
              <div className="availability-item">
                <div className="availability-label">
                  <span className="parameter-label">Попередній розрахунок ПЗ</span>
                </div>
                <div className="availability-status">
                  <span className={`status-text ${dataAvailability.pz ? 'available' : 'unavailable'}`}>
                    {dataAvailability.pz ? 'Доступно' : 'Недоступно'}
                  </span>
                </div>
              </div>

              <div className="availability-item">
                <div className="availability-label">
                  <span className="parameter-label">Попередній розрахунок МРЗ</span>
                </div>
                <div className="availability-status">
                  <span className={`status-text ${dataAvailability.mrz ? 'available' : 'unavailable'}`}>
                    {dataAvailability.mrz ? 'Доступно' : 'Недоступно'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="calculate-button"
            onClick={() => {
              // Placeholder for future functionality
              console.log('Button clicked - functionality to be added');
            }}
          >
            Розрахувати
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeismicAnalysisTab; 