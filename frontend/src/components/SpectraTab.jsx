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
  createPlotlyChart
}) => {
  const hasRequirements = requirementsData?.frequency?.length > 0;
  const hasCharacteristics = spectralData?.frequency?.length > 0;
  const hasAnyData = hasRequirements || hasCharacteristics;

  // Helper to get axis data
  const getAxisData = (data, axis) => {
    if (!data) return null;
    const prefix = spectrumType.toLowerCase() === 'мрз' ? 'mrz' : 'pz';
    return data[`${prefix}_${axis}`] || data[`${prefix.toLowerCase()}_${axis}`];
  };

  const hasXData = getAxisData(spectralData, 'x')?.length > 0 || getAxisData(requirementsData, 'x')?.length > 0;
  const hasYData = getAxisData(spectralData, 'y')?.length > 0 || getAxisData(requirementsData, 'y')?.length > 0;
  const hasZData = getAxisData(spectralData, 'z')?.length > 0 || getAxisData(requirementsData, 'z')?.length > 0;

  // Debug logging
  console.log('🔍 Spectra Debug:', {
    spectrumType,
    hasRequirements,
    hasCharacteristics,
    spectralDataKeys: spectralData ? Object.keys(spectralData) : 'no data',
    requirementsDataKeys: requirementsData ? Object.keys(requirementsData) : 'no data',
    hasXData,
    hasYData,
    hasZData
  });

  // Create chart when data changes
  useEffect(() => {
    if (hasAnyData && createPlotlyChart) {
      // Small delay to ensure DOM element is rendered
      setTimeout(() => {
        createPlotlyChart();
      }, 100);
    }
  }, [spectralData, requirementsData, spectrumType, selectedAxis, hasAnyData, createPlotlyChart]);

  return (
    <div className="spectra-tab">
      {/* 1. Damping Factor - FIRST */}
      <div className="damping-section">
        <label>Коефіцієнт демпфірування</label>
        <select
          value={dampingFactor}
          onChange={handleDampingChange}
          disabled={dampingFactorsLoading || availableDampingFactors.length === 0}
        >
          {dampingFactorsLoading ? (
            <option>Завантаження...</option>
          ) : availableDampingFactors.length === 0 ? (
            <option>Вимоги не імпортовані</option>
          ) : (
            availableDampingFactors.map(factor => (
              <option key={factor} value={factor}>{factor}</option>
            ))
          )}
        </select>
        {availableDampingFactors.length > 0 && (
          <span className="available-hint">
            Доступно: {availableDampingFactors.join(', ')}
          </span>
        )}
      </div>

      {/* 2. Loading/Error States */}
      {loading ? (
        <div className="state-message">
          <div className="spinner"></div>
          <p>Завантаження...</p>
        </div>
      ) : error ? (
        <div className="state-message error">
          <p>{error}</p>
          <button onClick={fetchAllSpectralData} className="retry-btn">
            Спробувати ще раз
          </button>
        </div>
      ) : !hasAnyData ? (
        <div className="state-message empty">
          <p>Дані відсутні</p>
        </div>
      ) : (
        <>
          {/* 3. Spectrum Type Selector */}
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

          {/* 4. Axis Selector */}
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

          {/* 5. Chart Area */}
          <div className="chart-area">
            <div id="main-spectrum-chart"></div>
          </div>

          {/* 6. Data Status */}
          <div className="data-status">
            <span className={hasRequirements ? 'ok' : 'no'}>
              {hasRequirements ? '✓' : '✗'} Вимоги
            </span>
            <span className={hasCharacteristics ? 'ok' : 'no'}>
              {hasCharacteristics ? '✓' : '✗'} Характеристики
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default SpectraTab;

