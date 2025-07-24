import React, { useState, useEffect } from 'react';
import '../styles/LoadAnalysisTab.css';

const LoadAnalysisTab = ({ 
  isFrequencyEnabled, 
  setIsFrequencyEnabled, 
  naturalFrequency, 
  setNaturalFrequency,
  allSpectralData,
  allRequirementsData,
  allAnalysisResults = {},
  calculationResults = { pz: {}, mrz: {}, calculationAttempted: false },
  elementData = null
}) => {
  // Состояние для входных параметров анализа нагрузки
  const [loadInputs, setLoadInputs] = useState({
    // Общие характеристики
    sigma_dop: { enabled: false, value: '' },
    hclpf: { enabled: false, value: '' },
    f_mu: { enabled: false, value: '1.0' }, // По умолчанию 1.0
    ratio_e_pz: { enabled: false, value: '1.069' }, // По умолчанию 1.069
    
    // Параметры для МРЗ
    temp1_mrz: { enabled: false, value: '' },
    temp2_mrz: { enabled: false, value: '' },
    p1_mrz: { enabled: false, value: '' },
    p2_mrz: { enabled: false, value: '' },
    sigma_dop_a_mrz: { enabled: false, value: '' },
    
    // Параметры для ПЗ
    temp1_pz: { enabled: false, value: '' },
    temp2_pz: { enabled: false, value: '' },
    p1_pz: { enabled: false, value: '' },
    p2_pz: { enabled: false, value: '' },
    sigma_dop_a_pz: { enabled: false, value: '' }
  });

  // Состояние для результатов расчета
  const [loadResults, setLoadResults] = useState({
    mrz: { 
      delta_t: null,
      ratio_p: null,
      ratio_e: null,
      first_freq_alt: null,
      m1_alt: null,
      ratio_m1: null,
      ratio_sigma_dop: null,
      hclpf_alt: null,
      k1_alt: null,
      canCalculate: false 
    },
    pz: { 
      delta_t: null,
      ratio_p: null,
      ratio_e: null,
      first_freq_alt: null,
      m1_alt: null,
      ratio_m1: null,
      ratio_sigma_dop: null,
      hclpf_alt: null,
      k1_alt: null,
      canCalculate: false 
    },
    calculated: false,
    analysisMethod: 'calculation' // 'calculation' или 'gip'
  });

  const handleFrequencyToggle = () => {
    setIsFrequencyEnabled(!isFrequencyEnabled);
    if (!isFrequencyEnabled) {
      setNaturalFrequency('');
    }
  };

  const handleFrequencyChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setNaturalFrequency(value);
    }
  };

  // Проверка доступности данных для ПЗ и МРЗ
  const checkDataAvailability = () => {
    const availability = {
      pz: false,
      mrz: false
    };

    // Проверяем данные ПЗ
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

    // Проверяем данные МРЗ
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

  const formatValue = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'Н/Д';
    }
    return parseFloat(value).toFixed(4);
  };

  // Обработчики для переключения полей
  const handleInputToggle = (fieldName) => {
    setLoadInputs(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        enabled: !prev[fieldName].enabled
      }
    }));
  };

  const handleInputValueChange = (fieldName, value) => {
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setLoadInputs(prev => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          value: value
        }
      }));
    }
  };

  // Функция расчета для метода анализа
  const calculateAnalysisMethod = () => {
    const results = {
      mrz: { ...loadResults.mrz },
      pz: { ...loadResults.pz },
      calculated: true,
      analysisMethod: 'calculation'
    };

    // Расчеты для МРЗ
    if (dataAvailability.mrz) {
      const mrzData = results.mrz;
      
      // DELTA_T_MRZ = TEMP2 - TEMP1
      if (loadInputs.temp1_mrz.enabled && loadInputs.temp2_mrz.enabled && 
          loadInputs.temp1_mrz.value && loadInputs.temp2_mrz.value) {
        const temp1 = parseFloat(loadInputs.temp1_mrz.value);
        const temp2 = parseFloat(loadInputs.temp2_mrz.value);
        mrzData.delta_t = temp2 - temp1;
      }

      // RATIO_P_MRZ = P2/P1
      if (loadInputs.p1_mrz.enabled && loadInputs.p2_mrz.enabled && 
          loadInputs.p1_mrz.value && loadInputs.p2_mrz.value) {
        const p1 = parseFloat(loadInputs.p1_mrz.value);
        const p2 = parseFloat(loadInputs.p2_mrz.value);
        if (p1 !== 0) {
          mrzData.ratio_p = p2 / p1;
        }
      }

      // RATIO_E_MRZ (используем общий RATIO_E_PZ)
      if (loadInputs.ratio_e_pz.enabled && loadInputs.ratio_e_pz.value) {
        mrzData.ratio_e = parseFloat(loadInputs.ratio_e_pz.value);
      }

      // FIRST_FREQ_ALT_MRZ = FIRST_NAT_FREQ / sqrt(RATIO_E_MRZ)
      if (naturalFrequency && isFrequencyEnabled && mrzData.ratio_e) {
        const firstFreq = parseFloat(naturalFrequency);
        mrzData.first_freq_alt = firstFreq / Math.sqrt(mrzData.ratio_e);
      }

      // RATIO_M1_MRZ = m1/m1* (требует пересчета спектров)
      if (allAnalysisResults['МРЗ']?.m1 && mrzData.first_freq_alt) {
        // Здесь нужно будет интегрироваться с пересчетом спектров
        // Пока используем приближение
        mrzData.ratio_m1 = 1.0; // Заглушка
      }

      // RATION_SIGMA_DOP_MRZ = [sigma] / [sigma]*
      if (loadInputs.sigma_dop.enabled && loadInputs.sigma_dop_a_mrz.enabled &&
          loadInputs.sigma_dop.value && loadInputs.sigma_dop_a_mrz.value) {
        const sigmaDop = parseFloat(loadInputs.sigma_dop.value);
        const sigmaDopA = parseFloat(loadInputs.sigma_dop_a_mrz.value);
        if (sigmaDopA !== 0) {
          mrzData.ratio_sigma_dop = sigmaDop / sigmaDopA;
        }
      }

      // HCLPF_ALT_MRZ = HCLPF * RATIO_P * RATIO_M1 * RATIO_SIGMA_DOP
      if (loadInputs.hclpf.enabled && loadInputs.hclpf.value &&
          mrzData.ratio_p && mrzData.ratio_m1 && mrzData.ratio_sigma_dop) {
        const hclpf = parseFloat(loadInputs.hclpf.value);
        mrzData.hclpf_alt = hclpf * mrzData.ratio_p * mrzData.ratio_m1 * mrzData.ratio_sigma_dop;
      }

      // Проверяем, можно ли выполнить расчет
      mrzData.canCalculate = !!(mrzData.ratio_p && mrzData.ratio_sigma_dop);
    }

    // Аналогичные расчеты для ПЗ
    if (dataAvailability.pz) {
      const pzData = results.pz;
      
      if (loadInputs.temp1_pz.enabled && loadInputs.temp2_pz.enabled && 
          loadInputs.temp1_pz.value && loadInputs.temp2_pz.value) {
        const temp1 = parseFloat(loadInputs.temp1_pz.value);
        const temp2 = parseFloat(loadInputs.temp2_pz.value);
        pzData.delta_t = temp2 - temp1;
      }

      if (loadInputs.p1_pz.enabled && loadInputs.p2_pz.enabled && 
          loadInputs.p1_pz.value && loadInputs.p2_pz.value) {
        const p1 = parseFloat(loadInputs.p1_pz.value);
        const p2 = parseFloat(loadInputs.p2_pz.value);
        if (p1 !== 0) {
          pzData.ratio_p = p2 / p1;
        }
      }

      if (loadInputs.ratio_e_pz.enabled && loadInputs.ratio_e_pz.value) {
        pzData.ratio_e = parseFloat(loadInputs.ratio_e_pz.value);
      }

      if (naturalFrequency && isFrequencyEnabled && pzData.ratio_e) {
        const firstFreq = parseFloat(naturalFrequency);
        pzData.first_freq_alt = firstFreq / Math.sqrt(pzData.ratio_e);
      }

      if (allAnalysisResults['ПЗ']?.m1 && pzData.first_freq_alt) {
        pzData.ratio_m1 = 1.0; // Заглушка
      }

      if (loadInputs.sigma_dop.enabled && loadInputs.sigma_dop_a_pz.enabled &&
          loadInputs.sigma_dop.value && loadInputs.sigma_dop_a_pz.value) {
        const sigmaDop = parseFloat(loadInputs.sigma_dop.value);
        const sigmaDopA = parseFloat(loadInputs.sigma_dop_a_pz.value);
        if (sigmaDopA !== 0) {
          pzData.ratio_sigma_dop = sigmaDop / sigmaDopA;
        }
      }

      if (loadInputs.hclpf.enabled && loadInputs.hclpf.value &&
          pzData.ratio_p && pzData.ratio_m1 && pzData.ratio_sigma_dop) {
        const hclpf = parseFloat(loadInputs.hclpf.value);
        pzData.hclpf_alt = hclpf * pzData.ratio_p * pzData.ratio_m1 * pzData.ratio_sigma_dop;
      }

      pzData.canCalculate = !!(pzData.ratio_p && pzData.ratio_sigma_dop);
    }

    setLoadResults(results);
  };

  return (
    <div className="load-analysis-main-container">
      <div className="load-analysis-main-form">
        <h3 className="load-analysis-main-title">Аналіз зміни навантаження</h3>
        
        <div className="load-analysis-main-content">
          {/* Доступность данных */}
          <div className="load-analysis-availability-container">
            <div className="load-analysis-group">
              <h4 className="load-analysis-section-title">Доступність даних для аналізу</h4>
              
              <div className="load-analysis-availability-layout">
                <div className="load-analysis-availability-section">
                  <div className="load-analysis-availability-item">
                    <div className="load-analysis-availability-label">
                      <span className="load-analysis-parameter-label">Попередній розрахунок ПЗ</span>
                      {dataAvailability.pz && allAnalysisResults['ПЗ'] && (
                        <div className="load-analysis-values">
                          <span className="load-analysis-value-small">m₁: {formatValue(allAnalysisResults['ПЗ'].m1)}</span>
                          <span className="load-analysis-value-small">m₂: {formatValue(allAnalysisResults['ПЗ'].m2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="load-analysis-availability-status">
                      <span className={`load-analysis-status-text ${dataAvailability.pz ? 'available' : 'unavailable'}`}>
                        {dataAvailability.pz ? 'Доступно' : 'Недоступно'}
                      </span>
                    </div>
                  </div>

                  <div className="load-analysis-availability-item">
                    <div className="load-analysis-availability-label">
                      <span className="load-analysis-parameter-label">Попередній розрахунок МРЗ</span>
                      {dataAvailability.mrz && allAnalysisResults['МРЗ'] && (
                        <div className="load-analysis-values">
                          <span className="load-analysis-value-small">m₁: {formatValue(allAnalysisResults['МРЗ'].m1)}</span>
                          <span className="load-analysis-value-small">m₂: {formatValue(allAnalysisResults['МРЗ'].m2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="load-analysis-availability-status">
                      <span className={`load-analysis-status-text ${dataAvailability.mrz ? 'available' : 'unavailable'}`}>
                        {dataAvailability.mrz ? 'Доступно' : 'Недоступно'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Общие входные данные */}
          <div className="load-analysis-common-container">
            <div className="load-analysis-group">
              <div className="load-analysis-inputs-section">
                <h4 className="load-analysis-section-title">Загальні характеристики</h4>
                
                {/* Собственная частота */}
                <div className="load-analysis-input-micro-group">
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={isFrequencyEnabled}
                        onChange={handleFrequencyToggle}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">Власна частота, Гц</span>
                    </label>
                    <input
                      type="text"
                      value={naturalFrequency}
                      onChange={handleFrequencyChange}
                      disabled={!isFrequencyEnabled}
                      placeholder="Введіть частоту"
                      className={`load-analysis-input-control ${!isFrequencyEnabled ? 'disabled' : ''}`}
                    />
                  </div>
                </div>

                {/* Допустимое напряжение */}
                <div className="load-analysis-input-group">
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.sigma_dop?.enabled || false}
                        onChange={() => handleInputToggle('sigma_dop')}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">[σ], МПа</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.sigma_dop?.value || ''}
                      onChange={(e) => handleInputValueChange('sigma_dop', e.target.value)}
                      disabled={!loadInputs.sigma_dop?.enabled}
                      placeholder="Значення"
                      className={`load-analysis-input-control ${!loadInputs.sigma_dop?.enabled ? 'disabled' : ''}`}
                    />
                  </div>
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.hclpf?.enabled || false}
                        onChange={() => handleInputToggle('hclpf')}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">HCLPF, g</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.hclpf?.value || ''}
                      onChange={(e) => handleInputValueChange('hclpf', e.target.value)}
                      disabled={!loadInputs.hclpf?.enabled}
                      placeholder="Значення"
                      className={`load-analysis-input-control ${!loadInputs.hclpf?.enabled ? 'disabled' : ''}`}
                    />
                  </div>
                </div>

                {/* Коэффициенты */}
                <div className="load-analysis-input-group">
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.f_mu?.enabled || false}
                        onChange={() => handleInputToggle('f_mu')}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">F_μ</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.f_mu?.value || ''}
                      onChange={(e) => handleInputValueChange('f_mu', e.target.value)}
                      disabled={!loadInputs.f_mu?.enabled}
                      placeholder="1.0"
                      className={`load-analysis-input-control ${!loadInputs.f_mu?.enabled ? 'disabled' : ''}`}
                    />
                  </div>
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.ratio_e_pz?.enabled || false}
                        onChange={() => handleInputToggle('ratio_e_pz')}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">RATIO_E</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.ratio_e_pz?.value || ''}
                      onChange={(e) => handleInputValueChange('ratio_e_pz', e.target.value)}
                      disabled={!loadInputs.ratio_e_pz?.enabled}
                      placeholder="1.069"
                      className={`load-analysis-input-control ${!loadInputs.ratio_e_pz?.enabled ? 'disabled' : ''}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Входные данные для ПЗ */}
          {dataAvailability.pz && (
            <div className="load-analysis-section-container">
              <div className="load-analysis-group">
                <div className="load-analysis-inputs-section">
                  <h4 className="load-analysis-section-title">Вхідні параметри для ПЗ</h4>
                  
                  {/* Температуры */}
                  <div className="load-analysis-input-group">
                    <div className="load-analysis-input-field">
                      <label className="load-analysis-checkbox-container">
                        <input
                          type="checkbox"
                          checked={loadInputs.temp1_pz?.enabled || false}
                          onChange={() => handleInputToggle('temp1_pz')}
                        />
                        <span className="load-analysis-checkmark"></span>
                        <span className="load-analysis-input-label">T₁, °C</span>
                      </label>
                      <input
                        type="text"
                        value={loadInputs.temp1_pz?.value || ''}
                        onChange={(e) => handleInputValueChange('temp1_pz', e.target.value)}
                        disabled={!loadInputs.temp1_pz?.enabled}
                        placeholder="Початкова температура"
                        className={`load-analysis-input-control ${!loadInputs.temp1_pz?.enabled ? 'disabled' : ''}`}
                      />
                    </div>
                    <div className="load-analysis-input-field">
                      <label className="load-analysis-checkbox-container">
                        <input
                          type="checkbox"
                          checked={loadInputs.temp2_pz?.enabled || false}
                          onChange={() => handleInputToggle('temp2_pz')}
                        />
                        <span className="load-analysis-checkmark"></span>
                        <span className="load-analysis-input-label">T₂, °C</span>
                      </label>
                      <input
                        type="text"
                        value={loadInputs.temp2_pz?.value || ''}
                        onChange={(e) => handleInputValueChange('temp2_pz', e.target.value)}
                        disabled={!loadInputs.temp2_pz?.enabled}
                        placeholder="Нова температура"
                        className={`load-analysis-input-control ${!loadInputs.temp2_pz?.enabled ? 'disabled' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Давления */}
                  <div className="load-analysis-input-group">
                    <div className="load-analysis-input-field">
                      <label className="load-analysis-checkbox-container">
                        <input
                          type="checkbox"
                          checked={loadInputs.p1_pz?.enabled || false}
                          onChange={() => handleInputToggle('p1_pz')}
                        />
                        <span className="load-analysis-checkmark"></span>
                        <span className="load-analysis-input-label">P₁, МПа</span>
                      </label>
                      <input
                        type="text"
                        value={loadInputs.p1_pz?.value || ''}
                        onChange={(e) => handleInputValueChange('p1_pz', e.target.value)}
                        disabled={!loadInputs.p1_pz?.enabled}
                        placeholder="Початковий тиск"
                        className={`load-analysis-input-control ${!loadInputs.p1_pz?.enabled ? 'disabled' : ''}`}
                      />
                    </div>
                    <div className="load-analysis-input-field">
                      <label className="load-analysis-checkbox-container">
                        <input
                          type="checkbox"
                          checked={loadInputs.p2_pz?.enabled || false}
                          onChange={() => handleInputToggle('p2_pz')}
                        />
                        <span className="load-analysis-checkmark"></span>
                        <span className="load-analysis-input-label">P₂, МПа</span>
                      </label>
                      <input
                        type="text"
                        value={loadInputs.p2_pz?.value || ''}
                        onChange={(e) => handleInputValueChange('p2_pz', e.target.value)}
                        disabled={!loadInputs.p2_pz?.enabled}
                        placeholder="Новий тиск"
                        className={`load-analysis-input-control ${!loadInputs.p2_pz?.enabled ? 'disabled' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Допустимое напряжение для температуры */}
                  <div className="load-analysis-input-micro-group">
                    <div className="load-analysis-input-field">
                      <label className="load-analysis-checkbox-container">
                        <input
                          type="checkbox"
                          checked={loadInputs.sigma_dop_a_pz?.enabled || false}
                          onChange={() => handleInputToggle('sigma_dop_a_pz')}
                        />
                        <span className="load-analysis-checkmark"></span>
                        <span className="load-analysis-input-label">[σ]*, МПа</span>
                      </label>
                      <input
                        type="text"
                        value={loadInputs.sigma_dop_a_pz?.value || ''}
                        onChange={(e) => handleInputValueChange('sigma_dop_a_pz', e.target.value)}
                        disabled={!loadInputs.sigma_dop_a_pz?.enabled}
                        placeholder="Допустиме напруження при новій температурі"
                        className={`load-analysis-input-control ${!loadInputs.sigma_dop_a_pz?.enabled ? 'disabled' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Входные данные для МРЗ */}
          {dataAvailability.mrz && (
            <div className="load-analysis-section-container">
              <div className="load-analysis-group">
                <div className="load-analysis-inputs-section">
                  <h4 className="load-analysis-section-title">Вхідні параметри для МРЗ</h4>
                  
                  {/* Температуры */}
                  <div className="load-analysis-input-group">
                    <div className="load-analysis-input-field">
                      <label className="load-analysis-checkbox-container">
                        <input
                          type="checkbox"
                          checked={loadInputs.temp1_mrz?.enabled || false}
                          onChange={() => handleInputToggle('temp1_mrz')}
                        />
                        <span className="load-analysis-checkmark"></span>
                        <span className="load-analysis-input-label">T₁, °C</span>
                      </label>
                      <input
                        type="text"
                        value={loadInputs.temp1_mrz?.value || ''}
                        onChange={(e) => handleInputValueChange('temp1_mrz', e.target.value)}
                        disabled={!loadInputs.temp1_mrz?.enabled}
                        placeholder="Початкова температура"
                        className={`load-analysis-input-control ${!loadInputs.temp1_mrz?.enabled ? 'disabled' : ''}`}
                      />
                    </div>
                    <div className="load-analysis-input-field">
                      <label className="load-analysis-checkbox-container">
                        <input
                          type="checkbox"
                          checked={loadInputs.temp2_mrz?.enabled || false}
                          onChange={() => handleInputToggle('temp2_mrz')}
                        />
                        <span className="load-analysis-checkmark"></span>
                        <span className="load-analysis-input-label">T₂, °C</span>
                      </label>
                      <input
                        type="text"
                        value={loadInputs.temp2_mrz?.value || ''}
                        onChange={(e) => handleInputValueChange('temp2_mrz', e.target.value)}
                        disabled={!loadInputs.temp2_mrz?.enabled}
                        placeholder="Нова температура"
                        className={`load-analysis-input-control ${!loadInputs.temp2_mrz?.enabled ? 'disabled' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Давления */}
                  <div className="load-analysis-input-group">
                    <div className="load-analysis-input-field">
                      <label className="load-analysis-checkbox-container">
                        <input
                          type="checkbox"
                          checked={loadInputs.p1_mrz?.enabled || false}
                          onChange={() => handleInputToggle('p1_mrz')}
                        />
                        <span className="load-analysis-checkmark"></span>
                        <span className="load-analysis-input-label">P₁, МПа</span>
                      </label>
                      <input
                        type="text"
                        value={loadInputs.p1_mrz?.value || ''}
                        onChange={(e) => handleInputValueChange('p1_mrz', e.target.value)}
                        disabled={!loadInputs.p1_mrz?.enabled}
                        placeholder="Початковий тиск"
                        className={`load-analysis-input-control ${!loadInputs.p1_mrz?.enabled ? 'disabled' : ''}`}
                      />
                    </div>
                    <div className="load-analysis-input-field">
                      <label className="load-analysis-checkbox-container">
                        <input
                          type="checkbox"
                          checked={loadInputs.p2_mrz?.enabled || false}
                          onChange={() => handleInputToggle('p2_mrz')}
                        />
                        <span className="load-analysis-checkmark"></span>
                        <span className="load-analysis-input-label">P₂, МПа</span>
                      </label>
                      <input
                        type="text"
                        value={loadInputs.p2_mrz?.value || ''}
                        onChange={(e) => handleInputValueChange('p2_mrz', e.target.value)}
                        disabled={!loadInputs.p2_mrz?.enabled}
                        placeholder="Новий тиск"
                        className={`load-analysis-input-control ${!loadInputs.p2_mrz?.enabled ? 'disabled' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Допустимое напряжение для температуры */}
                  <div className="load-analysis-input-micro-group">
                    <div className="load-analysis-input-field">
                      <label className="load-analysis-checkbox-container">
                        <input
                          type="checkbox"
                          checked={loadInputs.sigma_dop_a_mrz?.enabled || false}
                          onChange={() => handleInputToggle('sigma_dop_a_mrz')}
                        />
                        <span className="load-analysis-checkmark"></span>
                        <span className="load-analysis-input-label">[σ]*, МПа</span>
                      </label>
                      <input
                        type="text"
                        value={loadInputs.sigma_dop_a_mrz?.value || ''}
                        onChange={(e) => handleInputValueChange('sigma_dop_a_mrz', e.target.value)}
                        disabled={!loadInputs.sigma_dop_a_mrz?.enabled}
                        placeholder="Допустиме напруження при новій температурі"
                        className={`load-analysis-input-control ${!loadInputs.sigma_dop_a_mrz?.enabled ? 'disabled' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="load-analysis-form-actions">
          <button 
            type="button" 
            className="load-analysis-calculate-button"
            onClick={calculateAnalysisMethod}
          >
            Розрахувати
          </button>
        </div>

        {/* Результаты расчетов */}
        {loadResults.calculated && (
          <div className="load-analysis-results-container">
            <h3 className="load-analysis-results-title">Результати розрахунків</h3>
            
            <div className="load-analysis-results-layout">
              {/* Результаты для ПЗ */}
              {dataAvailability.pz && (
                <div className="load-analysis-results-section">
                  <h4 className="load-analysis-results-section-title">Результати для ПЗ</h4>
                  <div className="load-analysis-results-grid">
                    <div className="load-analysis-result-item">
                      <span className="load-analysis-result-label">ΔT:</span>
                      <span className="load-analysis-result-value">
                        {loadResults.pz.delta_t !== null ? `${loadResults.pz.delta_t.toFixed(2)} °C` : 'Н/Д'}
                      </span>
                    </div>
                    <div className="load-analysis-result-item">
                      <span className="load-analysis-result-label">Δp (P₂/P₁):</span>
                      <span className="load-analysis-result-value">
                        {loadResults.pz.ratio_p !== null ? loadResults.pz.ratio_p.toFixed(4) : 'Н/Д'}
                      </span>
                    </div>
                    <div className="load-analysis-result-item">
                      <span className="load-analysis-result-label">f₁*:</span>
                      <span className="load-analysis-result-value">
                        {loadResults.pz.first_freq_alt !== null ? `${loadResults.pz.first_freq_alt.toFixed(4)} Гц` : 'Н/Д'}
                      </span>
                    </div>
                    <div className="load-analysis-result-item">
                      <span className="load-analysis-result-label">Δσ:</span>
                      <span className="load-analysis-result-value">
                        {loadResults.pz.ratio_sigma_dop !== null ? loadResults.pz.ratio_sigma_dop.toFixed(4) : 'Н/Д'}
                      </span>
                    </div>
                    <div className="load-analysis-result-item">
                      <span className="load-analysis-result-label">HCLPF*:</span>
                      <span className="load-analysis-result-value">
                        {loadResults.pz.hclpf_alt !== null ? `${loadResults.pz.hclpf_alt.toFixed(4)} g` : 'Н/Д'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Результаты для МРЗ */}
              {dataAvailability.mrz && (
                <div className="load-analysis-results-section">
                  <h4 className="load-analysis-results-section-title">Результати для МРЗ</h4>
                  <div className="load-analysis-results-grid">
                    <div className="load-analysis-result-item">
                      <span className="load-analysis-result-label">ΔT:</span>
                      <span className="load-analysis-result-value">
                        {loadResults.mrz.delta_t !== null ? `${loadResults.mrz.delta_t.toFixed(2)} °C` : 'Н/Д'}
                      </span>
                    </div>
                    <div className="load-analysis-result-item">
                      <span className="load-analysis-result-label">Δp (P₂/P₁):</span>
                      <span className="load-analysis-result-value">
                        {loadResults.mrz.ratio_p !== null ? loadResults.mrz.ratio_p.toFixed(4) : 'Н/Д'}
                      </span>
                    </div>
                    <div className="load-analysis-result-item">
                      <span className="load-analysis-result-label">f₁*:</span>
                      <span className="load-analysis-result-value">
                        {loadResults.mrz.first_freq_alt !== null ? `${loadResults.mrz.first_freq_alt.toFixed(4)} Гц` : 'Н/Д'}
                      </span>
                    </div>
                    <div className="load-analysis-result-item">
                      <span className="load-analysis-result-label">Δσ:</span>
                      <span className="load-analysis-result-value">
                        {loadResults.mrz.ratio_sigma_dop !== null ? loadResults.mrz.ratio_sigma_dop.toFixed(4) : 'Н/Д'}
                      </span>
                    </div>
                    <div className="load-analysis-result-item">
                      <span className="load-analysis-result-label">HCLPF*:</span>
                      <span className="load-analysis-result-value">
                        {loadResults.mrz.hclpf_alt !== null ? `${loadResults.mrz.hclpf_alt.toFixed(4)} g` : 'Н/Д'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Информация о расчете */}
            <div className="load-analysis-calculation-info">
              <h4 className="load-analysis-info-title">Інформація про розрахунок</h4>
              <div className="load-analysis-info-content">
                <p><strong>Метод розрахунку:</strong> Метод аналізу (на основі розрахункової оцінки)</p>
                <p><strong>Формули:</strong></p>
                <ul>
                  <li>ΔT = T₂ - T₁</li>
                  <li>Δp = P₂/P₁</li>
                  <li>f₁* = f₁ / √(RATIO_E)</li>
                  <li>Δσ = [σ] / [σ]*</li>
                  <li>HCLPF* = HCLPF × Δp × Δm × Δσ</li>
                </ul>
                <p className="load-analysis-note">
                  <strong>Примітка:</strong> Для повного розрахунку необхідно інтегрувати з процедурою порівняння спектрів 
                  для визначення коефіцієнта Δm на основі зміненої власної частоти.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadAnalysisTab; 