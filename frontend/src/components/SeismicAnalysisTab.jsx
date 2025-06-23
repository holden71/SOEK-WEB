import React from 'react';
import '../styles/SeismicAnalysisTab.css';

const SeismicAnalysisTab = ({ 
  isFrequencyEnabled, 
  setIsFrequencyEnabled, 
  naturalFrequency, 
  setNaturalFrequency,
  allSpectralData,
  allRequirementsData,
  spectrumSelection = {
    xc_pz: false,
    xc_mrz: false,
    vc_pz: false,
    vc_mrz: false
  },
  setSpectrumSelection = () => {},
  allAnalysisResults = {}
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

  // Функция для обработки изменения выбора спектров
  const handleSpectrumToggle = (spectrumType) => {
    setSpectrumSelection(prev => ({
      ...prev,
      [spectrumType]: !prev[spectrumType]
    }));
  };

  // Функция для форматирования значений m1 и m2
  const formatValue = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '—';
    }
    if (value === Infinity) {
      return '∞';
    }
    return value.toFixed(4);
  };

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
                  {dataAvailability.pz && allAnalysisResults['ПЗ'] && (
                    <div className="analysis-values">
                      <span className="value-small">m₁: {formatValue(allAnalysisResults['ПЗ'].m1)}</span>
                      <span className="value-small">m₂: {formatValue(allAnalysisResults['ПЗ'].m2)}</span>
                    </div>
                  )}
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
                  {dataAvailability.mrz && allAnalysisResults['МРЗ'] && (
                    <div className="analysis-values">
                      <span className="value-small">m₁: {formatValue(allAnalysisResults['МРЗ'].m1)}</span>
                      <span className="value-small">m₂: {formatValue(allAnalysisResults['МРЗ'].m2)}</span>
                    </div>
                  )}
                </div>
                <div className="availability-status">
                  <span className={`status-text ${dataAvailability.mrz ? 'available' : 'unavailable'}`}>
                    {dataAvailability.mrz ? 'Доступно' : 'Недоступно'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="parameter-group">
            <div className="spectrum-selection-section">
              <h4 className="section-title">Вибір спектрів для аналізу</h4>
              
              <div className="spectrum-grid">
                <div className="spectrum-item">
                  <label className={`spectrum-checkbox-container ${!dataAvailability.pz ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={spectrumSelection.xc_pz}
                      onChange={() => handleSpectrumToggle('xc_pz')}
                      disabled={!dataAvailability.pz}
                    />
                    <span className="checkmark"></span>
                    <span className="spectrum-label">Спектр ХС ПЗ</span>
                  </label>
                </div>

                <div className="spectrum-item">
                  <label className={`spectrum-checkbox-container ${!dataAvailability.mrz ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={spectrumSelection.xc_mrz}
                      onChange={() => handleSpectrumToggle('xc_mrz')}
                      disabled={!dataAvailability.mrz}
                    />
                    <span className="checkmark"></span>
                    <span className="spectrum-label">Спектр ХС МРЗ</span>
                  </label>
                </div>

                <div className="spectrum-item">
                  <label className={`spectrum-checkbox-container ${!dataAvailability.pz ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={spectrumSelection.vc_pz}
                      onChange={() => handleSpectrumToggle('vc_pz')}
                      disabled={!dataAvailability.pz}
                    />
                    <span className="checkmark"></span>
                    <span className="spectrum-label">Спектр ВС ПЗ</span>
                  </label>
                </div>

                <div className="spectrum-item">
                  <label className={`spectrum-checkbox-container ${!dataAvailability.mrz ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={spectrumSelection.vc_mrz}
                      onChange={() => handleSpectrumToggle('vc_mrz')}
                      disabled={!dataAvailability.mrz}
                    />
                    <span className="checkmark"></span>
                    <span className="spectrum-label">Спектр ВС МРЗ</span>
                  </label>
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
              console.log('Selected spectrums:', spectrumSelection);
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