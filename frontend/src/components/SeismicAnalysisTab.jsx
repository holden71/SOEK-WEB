import React from 'react';
import '../styles/SeismicAnalysisTab.css';

const SeismicAnalysisTab = ({ 
  isFrequencyEnabled, 
  setIsFrequencyEnabled, 
  naturalFrequency, 
  setNaturalFrequency
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