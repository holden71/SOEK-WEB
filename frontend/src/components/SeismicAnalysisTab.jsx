import React, { useState, useEffect } from 'react';
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
  saveStressInputs = () => {},
  calculateSigmaAlt = () => {},
  calculationResults = { pz: {}, mrz: {}, calculationAttempted: false },
  clearCalculationResults = () => {},
  fetchCalculationResults = () => {},
  kResults = {
    mrz: { k1: null, k2: null, kMin: null, canCalculate: false },
    pz: { k1: null, k2: null, kMin: null, canCalculate: false, seismicCategory: null, coefficients: null },
    calculated: false
  },
  setKResults = () => {},
  saveKResults = () => {},
  elementData = null
}) => {

  // Отслеживаем изменения в поле допустимых напряжений и пересчитываем k коэффициенты
  useEffect(() => {
    // Пересчитываем только если уже были рассчитаны k коэффициенты
    if (kResults.calculated) {
      // Инлайн расчет для МРЗ
      const calculateMRZK = () => {
        const result = { k1: null, k2: null, kMin: null, canCalculate: false };
        const sigmaDop = stressInputs.sigma_dop?.enabled && stressInputs.sigma_dop?.value && 
                         !isNaN(parseFloat(stressInputs.sigma_dop.value)) ? parseFloat(stressInputs.sigma_dop.value) : null;
        const sigmaAlt1 = calculationResults.mrz.sigma_alt_1;
        const sigmaAlt2 = calculationResults.mrz.sigma_alt_2;
        
        if (sigmaDop) {
          let calculatedValues = [];
          if (sigmaAlt1 !== undefined && sigmaAlt1 > 0) {
            result.k1 = (1.4 * sigmaDop) / sigmaAlt1;
            calculatedValues.push(result.k1);
          }
          if (sigmaAlt2 !== undefined && sigmaAlt2 > 0) {
            result.k2 = (1.8 * sigmaDop) / sigmaAlt2;
            calculatedValues.push(result.k2);
          }
          if (calculatedValues.length > 0) {
            result.canCalculate = true;
            result.kMin = Math.min(...calculatedValues);
          }
        }
        return result;
      };

      // Инлайн расчет для ПЗ
      const calculatePZK = () => {
        const result = { k1: null, k2: null, kMin: null, canCalculate: false, seismicCategory: null, coefficients: null };
        const seismoTxt = elementData?.SEISMO_TXT || elementData?.seismo_txt || '';
        let seismicCategory = null, coeff1 = null, coeff2 = null;
        
        if (seismoTxt.includes('II') || seismoTxt.includes('ІІ')) {
          seismicCategory = 'II'; coeff1 = 1.5; coeff2 = 1.9;
        } else if (seismoTxt.includes('I') || seismoTxt.includes('І')) {
          seismicCategory = 'I'; coeff1 = 1.2; coeff2 = 1.6;
        }
        
        const sigmaDop = stressInputs.sigma_dop?.enabled && stressInputs.sigma_dop?.value && 
                         !isNaN(parseFloat(stressInputs.sigma_dop.value)) ? parseFloat(stressInputs.sigma_dop.value) : null;
        const sigmaAlt1 = calculationResults.pz.sigma_alt_1;
        const sigmaAlt2 = calculationResults.pz.sigma_alt_2;
        
        result.seismicCategory = seismicCategory;
        if (coeff1 && coeff2) {
          result.coefficients = { coeff1, coeff2 };
        }
        
        if (sigmaDop && coeff1 && coeff2) {
          let calculatedValues = [];
          if (sigmaAlt1 !== undefined && sigmaAlt1 > 0) {
            result.k1 = (coeff1 * sigmaDop) / sigmaAlt1;
            calculatedValues.push(result.k1);
          }
          if (sigmaAlt2 !== undefined && sigmaAlt2 > 0) {
            result.k2 = (coeff2 * sigmaDop) / sigmaAlt2;
            calculatedValues.push(result.k2);
          }
          if (calculatedValues.length > 0) {
            result.canCalculate = true;
            result.kMin = Math.min(...calculatedValues);
          }
        }
        return result;
      };
      
      const mrzResult = calculateMRZK();
      const pzResult = calculatePZK();
      
      setKResults(prev => ({
        ...prev,
        mrz: mrzResult,
        pz: pzResult
      }));
    }
  }, [
    stressInputs.sigma_dop?.enabled, 
    stressInputs.sigma_dop?.value, 
    calculationResults.mrz.sigma_alt_1,
    calculationResults.mrz.sigma_alt_2,
    calculationResults.pz.sigma_alt_1,
    calculationResults.pz.sigma_alt_2,
    elementData?.SEISMO_TXT,
    elementData?.seismo_txt
  ]);
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

  // Функция для расчета коэффициента k для МРЗ
  const calculateKCoefficient = (sigmaData = null) => {
    const result = { k1: null, k2: null, kMin: null, canCalculate: false };
    
    // Проверяем наличие основных данных
    const sigmaDop = stressInputs.sigma_dop?.enabled && stressInputs.sigma_dop?.value && 
                     !isNaN(parseFloat(stressInputs.sigma_dop.value)) ? parseFloat(stressInputs.sigma_dop.value) : null;
    
    // Используем переданные данные или данные из состояния
    const sigmaAlt1 = sigmaData?.mrz?.sigma_alt_1 ?? calculationResults.mrz.sigma_alt_1;
    const sigmaAlt2 = sigmaData?.mrz?.sigma_alt_2 ?? calculationResults.mrz.sigma_alt_2;
    

    
    if (sigmaDop) {
      let calculatedValues = [];
      
      // Рассчитываем k₁ если есть sigmaAlt1
      if (sigmaAlt1 !== undefined && sigmaAlt1 > 0) {
        result.k1 = (1.4 * sigmaDop) / sigmaAlt1;
        calculatedValues.push(result.k1);
      }
      
      // Рассчитываем k₂ если есть sigmaAlt2
      if (sigmaAlt2 !== undefined && sigmaAlt2 > 0) {
        result.k2 = (1.8 * sigmaDop) / sigmaAlt2;
        calculatedValues.push(result.k2);
      }
      
      // Если есть хотя бы одно значение
      if (calculatedValues.length > 0) {
        result.canCalculate = true;
        // Если есть оба - берем минимальное, если одно - берем его
        result.kMin = Math.min(...calculatedValues);
      }
    }
    return result;
  };

  // Функция для определения категории сейсмостойкости
  const determineSeismicCategory = () => {
    const seismoTxt = elementData?.SEISMO_TXT || elementData?.seismo_txt || '';
    
    // Сначала проверяем II категорию, потом I
    if (seismoTxt.includes('II') || seismoTxt.includes('ІІ')) {
      return { category: 'II', coeff1: 1.5, coeff2: 1.9 };
    } else if (seismoTxt.includes('I') || seismoTxt.includes('І')) {
      return { category: 'I', coeff1: 1.2, coeff2: 1.6 };
    }
    
    return { category: null, coeff1: null, coeff2: null };
  };

  // Функция для расчета коэффициента k для ПЗ
  const calculateKCoefficientPZ = (sigmaData = null) => {
    const result = { k1: null, k2: null, kMin: null, canCalculate: false, seismicCategory: null, coefficients: null };
    
    // Определяем категорию сейсмостойкости
    const { category: seismicCategory, coeff1, coeff2 } = determineSeismicCategory();
    
    // Проверяем наличие основных данных
    const sigmaDop = stressInputs.sigma_dop?.enabled && stressInputs.sigma_dop?.value && 
                     !isNaN(parseFloat(stressInputs.sigma_dop.value)) ? parseFloat(stressInputs.sigma_dop.value) : null;
    
    // Используем переданные данные или данные из состояния
    const sigmaAlt1 = sigmaData?.pz?.sigma_alt_1 ?? calculationResults.pz.sigma_alt_1;
    const sigmaAlt2 = sigmaData?.pz?.sigma_alt_2 ?? calculationResults.pz.sigma_alt_2;
    

    
    // Всегда сохраняем информацию о категории
    result.seismicCategory = seismicCategory;
    if (coeff1 && coeff2) {
      result.coefficients = { coeff1, coeff2 };
    }
    
    if (sigmaDop && coeff1 && coeff2) {
      let calculatedValues = [];
      
      // Рассчитываем k₁ если есть sigmaAlt1
      if (sigmaAlt1 !== undefined && sigmaAlt1 > 0) {
        result.k1 = (coeff1 * sigmaDop) / sigmaAlt1;
        calculatedValues.push(result.k1);
      }
      
      // Рассчитываем k₂ если есть sigmaAlt2
      if (sigmaAlt2 !== undefined && sigmaAlt2 > 0) {
        result.k2 = (coeff2 * sigmaDop) / sigmaAlt2;
        calculatedValues.push(result.k2);
      }
      
      // Если есть хотя бы одно значение
      if (calculatedValues.length > 0) {
        result.canCalculate = true;
        // Если есть оба - берем минимальное, если одно - берем его
        result.kMin = Math.min(...calculatedValues);
      }
    }
    return result;
  };

  // Определяем категорию сейсмостойкости для информационных сообщений
  const seismicCategoryInfo = determineSeismicCategory();

  // Функция для расчета всех коэффициентов k
  const calculateAllKCoefficients = async (sigmaData = null) => {
    const mrzResult = calculateKCoefficient(sigmaData);
    const pzResult = calculateKCoefficientPZ(sigmaData);
    
    const newKResults = {
      mrz: mrzResult,
      pz: pzResult,
      calculated: true
    };
    
    setKResults(newKResults);
    
    // Сохраняем результаты K коэффициентов в базу данных
    try {
      await saveKResults(newKResults);
    } catch (error) {
      console.error('Error saving K results:', error);
    }
  };







  return (
    <div className="seismic-analysis-container">
      <div className="seismic-analysis-form">
        <h3 className="form-title">Аналіз зміни сейсмічних вимог</h3>
        
        <div className="form-content">
          {/* Доступність даних - первая секция */}
          <div className="spectrum-selection-container">
            <div className="parameter-group">
              <h4 className="section-title">Доступність даних</h4>
              
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

                {/* Допустимое напряжение и HCLPF */}
                <div className="stress-group">
                  <div className="stress-field">
                    <label className="stress-checkbox-container">
                      <input
                        type="checkbox"
                        checked={stressInputs.sigma_dop?.enabled || false}
                        onChange={() => handleStressToggle('sigma_dop')}
                      />
                      <span className="checkmark"></span>
                      <span className="stress-label">σ, мПа</span>
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

                {/* sigma_1, sigma_2 - общие характеристики */}
                <div className="stress-group">
                  <div className="stress-field">
                    <label className="stress-checkbox-container">
                      <input
                        type="checkbox"
                        checked={stressInputs.sigma_1?.enabled || false}
                        onChange={() => handleStressToggle('sigma_1')}
                      />
                      <span className="checkmark"></span>
                      <span className="stress-label">σ₁, мПа</span>
                    </label>
                    <input
                      type="text"
                      value={stressInputs.sigma_1?.value || ''}
                      onChange={(e) => handleStressValueChange('sigma_1', e.target.value)}
                      disabled={!stressInputs.sigma_1?.enabled}
                      placeholder="Значення"
                      className={`stress-input ${!stressInputs.sigma_1?.enabled ? 'disabled' : ''}`}
                    />
                  </div>
                  <div className="stress-field">
                    <label className="stress-checkbox-container">
                      <input
                        type="checkbox"
                        checked={stressInputs.sigma_2?.enabled || false}
                        onChange={() => handleStressToggle('sigma_2')}
                      />
                      <span className="checkmark"></span>
                      <span className="stress-label">σ₂, мПа</span>
                    </label>
                    <input
                      type="text"
                      value={stressInputs.sigma_2?.value || ''}
                      onChange={(e) => handleStressValueChange('sigma_2', e.target.value)}
                      disabled={!stressInputs.sigma_2?.enabled}
                      placeholder="Значення"
                      className={`stress-input ${!stressInputs.sigma_2?.enabled ? 'disabled' : ''}`}
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
                    <span className="stress-label">(σ₁)₁, мПа</span>
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
                    <span className="stress-label">(σ₁)₂, мПа</span>
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
                    <span className="stress-label">(σ₁)s₁, мПа</span>
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
                    <span className="stress-label">(σ₂)s₂, мПа</span>
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
                    <span className="stress-label">(σ₁)₁, мПа</span>
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
                    <span className="stress-label">(σ₁)₂, мПа</span>
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
                    <span className="stress-label">(σ₁)s₁, мПа</span>
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
                    <span className="stress-label">(σ₂)s₂, мПа</span>
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
            onClick={async () => {
              try {
                // Save stress inputs to database first
                await saveStressInputs(stressInputs);
                
                // Then calculate sigma alt values and k coefficients
                await calculateSigmaAlt(async (sigmaResults) => {
                  // Calculate k coefficients with the actual sigma results
                  await calculateAllKCoefficients(sigmaResults);
                });
                
              } catch (error) {
                console.error('Error in calculation process:', error);
              }
            }}
          >
            Розрахувати
          </button>
        </div>

        {/* Результаты расчетов - показываем всегда если был запущен расчет */}
        {calculationResults.calculationAttempted && (
          <div className="calculation-results-container">
            <h3 className="results-title">Результати розрахунків</h3>
            
            <div className="results-layout">
              {/* Результаты для ПЗ */}
              <div className="results-section">
                <h4 className="results-section-title">Результати для ПЗ</h4>
                <div className="results-grid">
                  <div className="result-item">
                    <span className="result-label">(σs)₁*:</span>
                    {calculationResults.pz.sigma_alt_1 !== undefined ? (
                      <span className="result-value">{calculationResults.pz.sigma_alt_1.toFixed(4)} мПа</span>
                    ) : (
                      <span className="no-data-message">
                        {calculationResults.missingData?.pz?.sigma_alt_1 && calculationResults.missingData.pz.sigma_alt_1.length > 0 ? 
                          `Відсутні дані: ${calculationResults.missingData.pz.sigma_alt_1.join(', ')}` : 
                          'Недостатньо даних'
                        }
                      </span>
                    )}
                  </div>
                  <div className="result-item">
                    <span className="result-label">(σs)₂*:</span>
                    {calculationResults.pz.sigma_alt_2 !== undefined ? (
                      <span className="result-value">{calculationResults.pz.sigma_alt_2.toFixed(4)} мПа</span>
                    ) : (
                      <span className="no-data-message">
                        {calculationResults.missingData?.pz?.sigma_alt_2 && calculationResults.missingData.pz.sigma_alt_2.length > 0 ? 
                          `Відсутні дані: ${calculationResults.missingData.pz.sigma_alt_2.join(', ')}` : 
                          'Недостатньо даних'
                        }
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Коэффициенты k для ПЗ */}
                <div className="k-coefficients-section">
                  <h5 className="k-section-title">
                    Коефіцієнти k
                    {kResults.calculated && kResults.pz.canCalculate && kResults.pz.seismicCategory && ` (${kResults.pz.seismicCategory} категорія)`}
                  </h5>
                  {kResults.calculated && kResults.pz.canCalculate ? (
                    <div className="k-results-grid">
                      {kResults.pz.k1 !== null && kResults.pz.coefficients && (
                        <div className="k-result-item">
                          <span className="k-result-formula">k₁ = {kResults.pz.coefficients.coeff1}[σ]/(σₛ)₁:</span>
                          <span className="k-result-value">
                            {kResults.pz.k1.toFixed(4)}
                          </span>
                        </div>
                      )}
                      {kResults.pz.k2 !== null && kResults.pz.coefficients && (
                        <div className="k-result-item">
                          <span className="k-result-formula">k₂ = {kResults.pz.coefficients.coeff2}[σ]/(σₛ)₂:</span>
                          <span className="k-result-value">
                            {kResults.pz.k2.toFixed(4)}
                          </span>
                        </div>
                      )}
                      {kResults.pz.kMin !== null && (
                        <div className="k-result-item k-min-result">
                          <span className="k-result-formula">k мінімальне:</span>
                          <span className="k-result-value k-min-value">
                            {kResults.pz.kMin.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="k-calculation-info">
                      <p className="k-info-message">
                        Для розрахунку коефіцієнтів k необхідно:
                      </p>
                      <ul className="k-requirements-list">
                        <li className={stressInputs.sigma_dop?.enabled && stressInputs.sigma_dop?.value ? 'requirement-met' : 'requirement-missing'}>
                          Ввести значення σ (допустиме напруження)
                        </li>
                        <li className={(calculationResults.pz.sigma_alt_1 !== undefined || calculationResults.pz.sigma_alt_2 !== undefined) ? 'requirement-met' : 'requirement-missing'}>
                          Розрахувати хоча б одне значення: (σₛ)₁* або (σₛ)₂* для ПЗ
                          {calculationResults.pz.sigma_alt_1 !== undefined && calculationResults.pz.sigma_alt_2 !== undefined ? 
                            ' (є обидва)' : 
                            calculationResults.pz.sigma_alt_1 !== undefined ? 
                              ' (є тільки σₛ₁*)' : 
                              calculationResults.pz.sigma_alt_2 !== undefined ? 
                                ' (є тільки σₛ₂*)' : 
                                ''
                          }
                        </li>
                        <li className={seismicCategoryInfo.category ? 'requirement-met' : 'requirement-missing'}>
                          Визначити категорію сейсмостійкості
                          {elementData?.SEISMO_TXT || elementData?.seismo_txt ? 
                            ` (${elementData.SEISMO_TXT || elementData.seismo_txt}${seismicCategoryInfo.category ? ` → ${seismicCategoryInfo.category} категорія` : ' → не розпізнано'})` : 
                            ' (не задано)'
                          }
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Результаты для МРЗ */}
              <div className="results-section">
                <h4 className="results-section-title">Результати для МРЗ</h4>
                <div className="results-grid">
                  <div className="result-item">
                    <span className="result-label">(σs)₁*:</span>
                    {calculationResults.mrz.sigma_alt_1 !== undefined ? (
                      <span className="result-value">{calculationResults.mrz.sigma_alt_1.toFixed(4)} мПа</span>
                    ) : (
                      <span className="no-data-message">
                        {calculationResults.missingData?.mrz?.sigma_alt_1 && calculationResults.missingData.mrz.sigma_alt_1.length > 0 ? 
                          `Відсутні дані: ${calculationResults.missingData.mrz.sigma_alt_1.join(', ')}` : 
                          'Недостатньо даних'
                        }
                      </span>
                    )}
                  </div>
                  <div className="result-item">
                    <span className="result-label">(σs)₂*:</span>
                    {calculationResults.mrz.sigma_alt_2 !== undefined ? (
                      <span className="result-value">{calculationResults.mrz.sigma_alt_2.toFixed(4)} мПа</span>
                    ) : (
                      <span className="no-data-message">
                        {calculationResults.missingData?.mrz?.sigma_alt_2 && calculationResults.missingData.mrz.sigma_alt_2.length > 0 ? 
                          `Відсутні дані: ${calculationResults.missingData.mrz.sigma_alt_2.join(', ')}` : 
                          'Недостатньо даних'
                        }
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Коэффициенты k для МРЗ */}
                <div className="k-coefficients-section">
                  <h5 className="k-section-title">Коефіцієнти k</h5>
                  {kResults.calculated && kResults.mrz.canCalculate ? (
                    <div className="k-results-grid">
                      {kResults.mrz.k1 !== null && (
                        <div className="k-result-item">
                          <span className="k-result-formula">k₁ = 1.4[σ]/(σₛ)₁:</span>
                          <span className="k-result-value">
                            {kResults.mrz.k1.toFixed(4)}
                          </span>
                        </div>
                      )}
                      {kResults.mrz.k2 !== null && (
                        <div className="k-result-item">
                          <span className="k-result-formula">k₂ = 1.8[σ]/(σₛ)₂:</span>
                          <span className="k-result-value">
                            {kResults.mrz.k2.toFixed(4)}
                          </span>
                        </div>
                      )}
                      {kResults.mrz.kMin !== null && (
                        <div className="k-result-item k-min-result">
                          <span className="k-result-formula">k мінімальне:</span>
                          <span className="k-result-value k-min-value">
                            {kResults.mrz.kMin.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="k-calculation-info">
                      <p className="k-info-message">
                        Для розрахунку коефіцієнтів k необхідно:
                      </p>
                      <ul className="k-requirements-list">
                        <li className={stressInputs.sigma_dop?.enabled && stressInputs.sigma_dop?.value ? 'requirement-met' : 'requirement-missing'}>
                          Ввести значення σ (допустиме напруження)
                        </li>
                        <li className={(calculationResults.mrz.sigma_alt_1 !== undefined || calculationResults.mrz.sigma_alt_2 !== undefined) ? 'requirement-met' : 'requirement-missing'}>
                          Розрахувати хоча б одне значення: (σₛ)₁* або (σₛ)₂* для МРЗ
                          {calculationResults.mrz.sigma_alt_1 !== undefined && calculationResults.mrz.sigma_alt_2 !== undefined ? 
                            ' (є обидва)' : 
                            calculationResults.mrz.sigma_alt_1 !== undefined ? 
                              ' (є тільки σₛ₁*)' : 
                              calculationResults.mrz.sigma_alt_2 !== undefined ? 
                                ' (є тільки σₛ₂*)' : 
                                ''
                          }
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeismicAnalysisTab; 