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
  allAnalysisResults = {},
  stressInputs = {},
  setStressInputs = () => {},
  saveStressInputs = () => {}
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

  // Функция для обработки изменения состояния чекбокса напряжения
  const handleStressToggle = (fieldName) => {
    setStressInputs(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        enabled: !prev[fieldName].enabled,
        value: !prev[fieldName].enabled ? prev[fieldName].value : '' // Clear value when disabling
      }
    }));
  };

  // Функция для обработки изменения значения поля напряжения
  const handleStressValueChange = (fieldName, value) => {
    // Allow only numbers, decimal point, and minus sign
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setStressInputs(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          value: value
        }
      }));
    }
  };

  return (
    <div className="seismic-analysis-container">
      <div className="seismic-analysis-form">
        <h3 className="form-title">Аналіз зміни сейсмічних вимог</h3>
        
        <div className="form-content">
          {/* Вибір спектрів для аналізу - первая секция */}
          <div className="spectrum-selection-container">
            <div className="parameter-group">
              <h4 className="section-title">Вибір спектрів для аналізу</h4>
              
              <div className="spectrum-layout">
                {/* Левая часть - доступность данных */}
                <div className="data-availability-section">
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

                {/* Правая часть - выбор спектров галочками */}
                <div className="spectrum-selection-section">
                  <div className="spectrum-checkboxes-grid">
                    <div className="spectrum-checkbox-item">
                      <label className="spectrum-checkbox-label">
                        <input
                          type="checkbox"
                          checked={spectrumSelection.xc_pz}
                          onChange={() => handleSpectrumToggle('xc_pz')}
                          disabled={!dataAvailability.pz}
                        />
                        <span className="checkmark"></span>
                        <span className="spectrum-text">ХС ПЗ</span>
                      </label>
                    </div>

                    <div className="spectrum-checkbox-item">
                      <label className="spectrum-checkbox-label">
                        <input
                          type="checkbox"
                          checked={spectrumSelection.vc_pz}
                          onChange={() => handleSpectrumToggle('vc_pz')}
                          disabled={!dataAvailability.pz}
                        />
                        <span className="checkmark"></span>
                        <span className="spectrum-text">ВС ПЗ</span>
                      </label>
                    </div>

                    <div className="spectrum-checkbox-item">
                      <label className="spectrum-checkbox-label">
                        <input
                          type="checkbox"
                          checked={spectrumSelection.xc_mrz}
                          onChange={() => handleSpectrumToggle('xc_mrz')}
                          disabled={!dataAvailability.mrz}
                        />
                        <span className="checkmark"></span>
                        <span className="spectrum-text">ХС МРЗ</span>
                      </label>
                    </div>

                    <div className="spectrum-checkbox-item">
                      <label className="spectrum-checkbox-label">
                        <input
                          type="checkbox"
                          checked={spectrumSelection.vc_mrz}
                          onChange={() => handleSpectrumToggle('vc_mrz')}
                          disabled={!dataAvailability.mrz}
                        />
                        <span className="checkmark"></span>
                        <span className="spectrum-text">ВС МРЗ</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Общие характеристики - вторая секция */}
          <div className="common-inputs-container">
            <div className="parameter-group">
              <div className="stress-inputs-section">
                <h4 className="section-title">Загальні характеристики</h4>
                
                {/* Власна частота */}
                <div className="stress-micro-group">
                  <div className="stress-field">
                    <label className="stress-checkbox-container">
                      <input
                        type="checkbox"
                        checked={isFrequencyEnabled}
                        onChange={handleFrequencyToggle}
                      />
                      <span className="checkmark"></span>
                      <span className="stress-label">Власна частота, Гц</span>
                    </label>
                    <input
                      type="text"
                      value={naturalFrequency}
                      onChange={handleFrequencyChange}
                      disabled={!isFrequencyEnabled}
                      placeholder="Введіть частоту"
                      className={`stress-input ${!isFrequencyEnabled ? 'disabled' : ''}`}
                    />
                  </div>
                </div>

                {/* HCLPF - общая характеристика */}
                <div className="stress-micro-group">
                  <div className="stress-field">
                    <label className="stress-checkbox-container">
                      <input
                        type="checkbox"
                        checked={stressInputs.hclpf?.enabled || false}
                        onChange={() => handleStressToggle('hclpf')}
                      />
                      <span className="checkmark"></span>
                      <span className="stress-label">HCLPF, g</span>
                    </label>
                    <input
                      type="text"
                      value={stressInputs.hclpf?.value || ''}
                      onChange={(e) => handleStressValueChange('hclpf', e.target.value)}
                      disabled={!stressInputs.hclpf?.enabled}
                      placeholder="Значення"
                      className={`stress-input ${!stressInputs.hclpf?.enabled ? 'disabled' : ''}`}
                    />
                  </div>
                </div>

                {/* Sigma dop - общая характеристика */}
                <div className="stress-micro-group">
                  <div className="stress-field">
                    <label className="stress-checkbox-container">
                      <input
                        type="checkbox"
                        checked={stressInputs.sigma_dop?.enabled || false}
                        onChange={() => handleStressToggle('sigma_dop')}
                      />
                      <span className="checkmark"></span>
                      <span className="stress-label">σ доп, мПа</span>
                    </label>
                    <input
                      type="text"
                      value={stressInputs.sigma_dop?.value || ''}
                      onChange={(e) => handleStressValueChange('sigma_dop', e.target.value)}
                      disabled={!stressInputs.sigma_dop?.enabled}
                      placeholder="Значення"
                      className={`stress-input ${!stressInputs.sigma_dop?.enabled ? 'disabled' : ''}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Анализ для ПЗ */}
        <div className="analysis-section-container">
          <div className="parameter-group">
            <div className="stress-inputs-section">
              <h4 className="section-title">Вхідні розрахункові напруження для ПЗ</h4>
              
              {/* sigma для ПЗ */}
              <div className="stress-micro-group">
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_pz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_pz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">σ (ПЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_pz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_pz', e.target.value)}
                    disabled={!stressInputs.sigma_pz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_pz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
              </div>

              {/* sigma_1, sigma_2 для ПЗ - группа */}
              <div className="stress-group">
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_1_pz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_1_pz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">σ₁ (ПЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_1_pz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_1_pz', e.target.value)}
                    disabled={!stressInputs.sigma_1_pz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_1_pz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_2_pz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_2_pz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">σ₂ (ПЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_2_pz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_2_pz', e.target.value)}
                    disabled={!stressInputs.sigma_2_pz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_2_pz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
              </div>

              {/* (sigma_1)_1, (sigma_1)_2 для ПЗ - группа */}
              <div className="stress-group">
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_1_1_pz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_1_1_pz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">(σ₁)₁ (ПЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_1_1_pz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_1_1_pz', e.target.value)}
                    disabled={!stressInputs.sigma_1_1_pz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_1_1_pz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_1_2_pz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_1_2_pz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">(σ₁)₂ (ПЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_1_2_pz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_1_2_pz', e.target.value)}
                    disabled={!stressInputs.sigma_1_2_pz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_1_2_pz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
              </div>

              {/* (sigma_1)_s1, (sigma_2)_s2 для ПЗ - группа */}
              <div className="stress-group">
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_1_s1_pz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_1_s1_pz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">(σ₁)s₁ (ПЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_1_s1_pz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_1_s1_pz', e.target.value)}
                    disabled={!stressInputs.sigma_1_s1_pz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_1_s1_pz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_2_s2_pz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_2_s2_pz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">(σ₂)s₂ (ПЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_2_s2_pz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_2_s2_pz', e.target.value)}
                    disabled={!stressInputs.sigma_2_s2_pz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_2_s2_pz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Анализ для МРЗ */}
        <div className="analysis-section-container">
          <div className="parameter-group">
            <div className="stress-inputs-section">
              <h4 className="section-title">Вхідні розрахункові напруження для МРЗ</h4>
              
              {/* sigma для МРЗ */}
              <div className="stress-micro-group">
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_mrz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_mrz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">σ (МРЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_mrz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_mrz', e.target.value)}
                    disabled={!stressInputs.sigma_mrz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_mrz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
              </div>

              {/* sigma_1, sigma_2 для МРЗ - группа */}
              <div className="stress-group">
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_1_mrz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_1_mrz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">σ₁ (МРЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_1_mrz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_1_mrz', e.target.value)}
                    disabled={!stressInputs.sigma_1_mrz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_1_mrz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_2_mrz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_2_mrz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">σ₂ (МРЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_2_mrz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_2_mrz', e.target.value)}
                    disabled={!stressInputs.sigma_2_mrz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_2_mrz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
              </div>

              {/* (sigma_1)_1, (sigma_1)_2 для МРЗ - группа */}
              <div className="stress-group">
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_1_1_mrz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_1_1_mrz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">(σ₁)₁ (МРЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_1_1_mrz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_1_1_mrz', e.target.value)}
                    disabled={!stressInputs.sigma_1_1_mrz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_1_1_mrz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_1_2_mrz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_1_2_mrz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">(σ₁)₂ (МРЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_1_2_mrz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_1_2_mrz', e.target.value)}
                    disabled={!stressInputs.sigma_1_2_mrz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_1_2_mrz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
              </div>

              {/* (sigma_1)_s1, (sigma_2)_s2 для МРЗ - группа */}
              <div className="stress-group">
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_1_s1_mrz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_1_s1_mrz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">(σ₁)s₁ (МРЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_1_s1_mrz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_1_s1_mrz', e.target.value)}
                    disabled={!stressInputs.sigma_1_s1_mrz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_1_s1_mrz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
                <div className="stress-field">
                  <label className="stress-checkbox-container">
                    <input
                      type="checkbox"
                      checked={stressInputs.sigma_2_s2_mrz?.enabled || false}
                      onChange={() => handleStressToggle('sigma_2_s2_mrz')}
                    />
                    <span className="checkmark"></span>
                    <span className="stress-label">(σ₂)s₂ (МРЗ), мПа</span>
                  </label>
                  <input
                    type="text"
                    value={stressInputs.sigma_2_s2_mrz?.value || ''}
                    onChange={(e) => handleStressValueChange('sigma_2_s2_mrz', e.target.value)}
                    disabled={!stressInputs.sigma_2_s2_mrz?.enabled}
                    placeholder="Значення"
                    className={`stress-input ${!stressInputs.sigma_2_s2_mrz?.enabled ? 'disabled' : ''}`}
                  />
                </div>
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
              // Save stress inputs to database
              saveStressInputs(stressInputs);
              
              // Placeholder for future calculation functionality
              console.log('Button clicked - stress inputs saved');
              console.log('Selected spectrums:', spectrumSelection);
              console.log('Stress inputs:', stressInputs);
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