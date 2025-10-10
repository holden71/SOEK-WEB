import React, { useEffect } from 'react';
import '../styles/SpectraTab.css';

const SpectraTab = ({
  dampingFactor,
  dampingFactorsLoading,
  availableDampingFactors,
  handleDampingChange,
  loading,
  error,
  fetchAllSpectralData,
  requirementsData,
  spectralData,
  spectrumType,
  setSpectrumType,
  selectedAxis,
  setSelectedAxis,
  createPlotlyChart,
  naturalFrequencies,
  setNaturalFrequencies,
  elementData,
  saveNaturalFrequencies
}) => {
  const hasRequirements = requirementsData?.frequency?.length > 0;
  const hasCharacteristics = spectralData?.frequency?.length > 0;
  const hasData = hasRequirements || hasCharacteristics;

  // Get axis data for current spectrum type
  const getAxisData = (data, axis) => {
    if (!data) return null;
    const prefix = spectrumType === 'МРЗ' ? 'mrz' : 'pz';
    return data[`${prefix}_${axis}`];
  };

  const hasXData = getAxisData(spectralData, 'x')?.length > 0 || getAxisData(requirementsData, 'x')?.length > 0;
  const hasYData = getAxisData(spectralData, 'y')?.length > 0 || getAxisData(requirementsData, 'y')?.length > 0;
  const hasZData = getAxisData(spectralData, 'z')?.length > 0 || getAxisData(requirementsData, 'z')?.length > 0;

  // Handlers for natural frequency inputs
  const handleFrequencyToggle = (axis) => {
    setNaturalFrequencies(prev => ({
      ...prev,
      [axis]: {
        ...prev[axis],
        enabled: !prev[axis].enabled,
        value: !prev[axis].enabled ? prev[axis].value : ''
      }
    }));
  };

  const handleFrequencyChange = (axis, value) => {
    // Allow only numbers and decimal point
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setNaturalFrequencies(prev => ({
        ...prev,
        [axis]: {
          ...prev[axis],
          value: value
        }
      }));
    }
  };

  // Create chart when data changes
  useEffect(() => {
    // Don't create chart if damping factor is not set yet
    if (hasData && createPlotlyChart && dampingFactor !== null) {
      setTimeout(() => createPlotlyChart(), 100);
    }
  }, [spectralData, requirementsData, spectrumType, selectedAxis, createPlotlyChart, dampingFactor, naturalFrequencies]);

  // Show loading only when actually loading data
  if (loading || dampingFactorsLoading) {
    return (
      <div className="spectra-tab">
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  // Show error if any
  if (error) {
    return (
      <div className="spectra-tab">
        <div className="state-message error">
          <p>{error}</p>
          <button onClick={fetchAllSpectralData} className="retry-btn">
            Спробувати ще раз
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spectra-tab">
      {/* Damping Factor Selector */}
      <div className="damping-section">
        <label>Коефіцієнт демпфірування</label>
        <select value={dampingFactor || ''} onChange={handleDampingChange} disabled={dampingFactorsLoading || availableDampingFactors.length === 0}>
          {availableDampingFactors.length === 0 ? (
            <option value="">Вимоги не імпортовані</option>
          ) : (
            availableDampingFactors.map(factor => (
              <option key={factor} value={factor}>{factor}</option>
            ))
          )}
        </select>
      </div>

      {/* Natural Frequencies Section */}
      <div className="natural-frequencies-section">
        <h4 className="section-title">Власні частоти коливань, Гц</h4>
        <div className="frequency-inputs-grid">
          {['x', 'y', 'z'].map((axis) => (
            <div key={axis} className="frequency-field">
              <label className="frequency-checkbox-container">
                <input
                  type="checkbox"
                  checked={naturalFrequencies[axis]?.enabled || false}
                  onChange={() => handleFrequencyToggle(axis)}
                />
                <span className="frequency-checkmark"></span>
                <span className="frequency-label">{axis.toUpperCase()}</span>
              </label>
              <input
                type="text"
                value={naturalFrequencies[axis]?.value || ''}
                onChange={(e) => handleFrequencyChange(axis, e.target.value)}
                disabled={!naturalFrequencies[axis]?.enabled}
                placeholder="Частота"
                className={`frequency-input ${!naturalFrequencies[axis]?.enabled ? 'disabled' : ''}`}
              />
            </div>
          ))}
        </div>
        <button 
          className="save-frequencies-button"
          onClick={() => saveNaturalFrequencies()}
        >
          Зберегти частоти
        </button>
      </div>

      {!hasData ? (
        <div className="state-message empty">
          <p>Дані відсутні</p>
        </div>
      ) : (
        <>
          {/* Spectrum Type Buttons */}
          <div className="type-selector">
            <button 
              className={spectrumType === 'МРЗ' ? 'active' : ''}
              onClick={() => setSpectrumType('МРЗ')}
            >
              МРЗ
            </button>
            <button 
              className={spectrumType === 'ПЗ' ? 'active' : ''}
              onClick={() => setSpectrumType('ПЗ')}
            >
              ПЗ
            </button>
          </div>

          {/* Axis Buttons */}
          <div className="axis-selector">
            {hasXData && (
              <button 
                className={selectedAxis === 'x' ? 'active' : ''}
                onClick={() => setSelectedAxis('x')}
              >
                X
              </button>
            )}
            {hasYData && (
              <button 
                className={selectedAxis === 'y' ? 'active' : ''}
                onClick={() => setSelectedAxis('y')}
              >
                Y
              </button>
            )}
            {hasZData && (
              <button 
                className={selectedAxis === 'z' ? 'active' : ''}
                onClick={() => setSelectedAxis('z')}
              >
                Z
              </button>
            )}
          </div>

          {/* Data Status */}
          <div className="data-status">
            <span className={hasRequirements ? 'ok' : 'no'}>
              Вимоги: {hasRequirements ? 'Знайдено' : 'Не знайдено'}
            </span>
            <span className={hasCharacteristics ? 'ok' : 'no'}>
              Характеристики: {hasCharacteristics ? 'Знайдено' : 'Не знайдено'}
            </span>
          </div>

          {/* Chart */}
          <div className="chart-area">
            <div id="main-spectrum-chart"></div>
          </div>
        </>
      )}
    </div>
  );
};

export default SpectraTab;

