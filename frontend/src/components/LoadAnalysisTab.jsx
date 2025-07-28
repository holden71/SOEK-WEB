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
  kResults = {
    mrz: { k1: null, k2: null, kMin: null, canCalculate: false },
    pz: { k1: null, k2: null, kMin: null, canCalculate: false, seismicCategory: null, coefficients: null },
    calculated: false
  },
  elementData = null
}) => {
  // Состояние for input parameters
  const [loadInputs, setLoadInputs] = useState({
    // Общие параметры (заглушки пока)
    material: { enabled: true, value: '' },
    doc_code_analytics: { enabled: true, value: '' },
    doc_code_operation: { enabled: true, value: '' },
    
    // Параметры для ПЗ
    p1_pz: { enabled: true, value: '' },
    temp1_pz: { enabled: true, value: '' },
    p2_pz: { enabled: true, value: '' },
    temp2_pz: { enabled: true, value: '' },
    sigma_dop_a_pz: { enabled: true, value: '' },
    ratio_e_pz: { enabled: true, value: '' },
    
    // Параметры для МРЗ
    p1_mrz: { enabled: true, value: '' },
    temp1_mrz: { enabled: true, value: '' },
    p2_mrz: { enabled: true, value: '' },
    temp2_mrz: { enabled: true, value: '' },
    sigma_dop_a_mrz: { enabled: true, value: '' },
    ratio_e_mrz: { enabled: true, value: '' }
  });

  // Проверка доступности M1 и K1 для расчетов
  const checkDataAvailability = () => {
    const availability = {
      pz: false,
      mrz: false,
      m1_available: false,
      k1_available: false
    };

    // Проверяем наличие M1 для ПЗ и МРЗ
    const pzM1 = allAnalysisResults?.['ПЗ']?.m1;
    const mrzM1 = allAnalysisResults?.['МРЗ']?.m1;
    availability.pz = pzM1 !== null && pzM1 !== undefined && !isNaN(pzM1);
    availability.mrz = mrzM1 !== null && mrzM1 !== undefined && !isNaN(mrzM1);
    availability.m1_available = availability.pz || availability.mrz;

    // Проверяем наличие K1 для ПЗ и МРЗ
    const pzK1 = kResults?.pz?.k1;
    const mrzK1 = kResults?.mrz?.k1;
    const pzK1Available = pzK1 !== null && pzK1 !== undefined && !isNaN(pzK1);
    const mrzK1Available = mrzK1 !== null && mrzK1 !== undefined && !isNaN(mrzK1);
    availability.k1_available = (pzK1Available || mrzK1Available) && kResults?.calculated;

    return availability;
  };

  const dataAvailability = checkDataAvailability();
  // Временно отключаем проверку доступности данных для тестирования
  const isFormEnabled = true; // dataAvailability.m1_available && dataAvailability.k1_available;
  
  // Отладочная информация
  console.log('Data availability:', dataAvailability);
  console.log('isFormEnabled:', isFormEnabled);
  console.log('elementData keys:', elementData ? Object.keys(elementData) : 'No elementData');
  console.log('elementData full:', elementData);

  // Загрузка сохраненных параметров при монтировании компонента
  useEffect(() => {
    const loadSavedParameters = async () => {
      const elementId = elementData?.EK_ID || elementData?.ek_id || elementData?.id || elementData?.ID;
      if (!elementId) return;
      
              try {
          const response = await fetch(`http://localhost:8000/api/get-load-analysis-params/${elementId}`);
        if (response.ok) {
          const data = await response.json();
          const savedParams = data.load_params;
          
          // Обновляем состояние с сохраненными значениями
          setLoadInputs(prev => ({
            ...prev,
            material: { 
              enabled: true, 
              value: savedParams.material || '' 
            },
            doc_code_analytics: { 
              enabled: true, 
              value: savedParams.doc_code_analytics || '' 
            },
            doc_code_operation: { 
              enabled: true, 
              value: savedParams.doc_code_operation || '' 
            },
            p1_pz: { 
              enabled: true, 
              value: savedParams.p1_pz ? savedParams.p1_pz.toString() : '' 
            },
            temp1_pz: { 
              enabled: true, 
              value: savedParams.temp1_pz ? savedParams.temp1_pz.toString() : '' 
            },
            p2_pz: { 
              enabled: true, 
              value: savedParams.p2_pz ? savedParams.p2_pz.toString() : '' 
            },
            temp2_pz: { 
              enabled: true, 
              value: savedParams.temp2_pz ? savedParams.temp2_pz.toString() : '' 
            },
            sigma_dop_a_pz: { 
              enabled: true, 
              value: savedParams.sigma_dop_a_pz ? savedParams.sigma_dop_a_pz.toString() : '' 
            },
            ratio_e_pz: { 
              enabled: true, 
              value: savedParams.ratio_e_pz ? savedParams.ratio_e_pz.toString() : '' 
            },
            p1_mrz: { 
              enabled: true, 
              value: savedParams.p1_mrz ? savedParams.p1_mrz.toString() : '' 
            },
            temp1_mrz: { 
              enabled: true, 
              value: savedParams.temp1_mrz ? savedParams.temp1_mrz.toString() : '' 
            },
            p2_mrz: { 
              enabled: true, 
              value: savedParams.p2_mrz ? savedParams.p2_mrz.toString() : '' 
            },
            temp2_mrz: { 
              enabled: true, 
              value: savedParams.temp2_mrz ? savedParams.temp2_mrz.toString() : '' 
            },
            sigma_dop_a_mrz: { 
              enabled: true, 
              value: savedParams.sigma_dop_a_mrz ? savedParams.sigma_dop_a_mrz.toString() : '' 
            },
            ratio_e_mrz: { 
              enabled: true, 
              value: savedParams.ratio_e_mrz ? savedParams.ratio_e_mrz.toString() : '' 
            }
          }));
        }
      } catch (error) {
        console.error('Ошибка загрузки сохраненных параметров:', error);
      }
    };

    loadSavedParameters();
  }, [elementData?.id]);

  const formatValue = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'Н/Д';
    }
    return parseFloat(value).toFixed(4);
  };

  // Обработчики для переключения полей
  const handleInputToggle = (fieldName) => {
    if (!isFormEnabled) return; // Блокируем изменения если форма неактивна
    
    setLoadInputs(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        enabled: !prev[fieldName].enabled,
        value: !prev[fieldName].enabled ? prev[fieldName].value : ''
      }
    }));
  };

  const handleInputValueChange = (fieldName, value) => {
    if (!isFormEnabled) return; // Блокируем изменения если форма неактивна
    
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

  // Функция сохранения параметров в базу данных
  const handleSaveParameters = async () => {
    console.log('Попытка сохранения параметров');
    console.log('isFormEnabled:', isFormEnabled);
    console.log('elementData:', elementData);
    
    if (!isFormEnabled) {
      console.log('Форма заблокирована, сохранение невозможно');
      return;
    }

    try {
      // Ищем ID элемента в разных возможных полях
      const elementId = elementData?.EK_ID || elementData?.ek_id || elementData?.id || elementData?.ID;
      
      if (!elementId) {
        console.log('Нет elementId, сохранение невозможно');
        console.log('elementData fields:', elementData ? Object.keys(elementData) : 'No elementData');
        return;
      }
      
      // Подготавливаем данные для отправки
      const dataToSave = {
        element_id: elementId,
        // Общие параметры (заглушки)
        material: loadInputs.material.enabled ? loadInputs.material.value : null,
        doc_code_analytics: loadInputs.doc_code_analytics.enabled ? loadInputs.doc_code_analytics.value : null,
        doc_code_operation: loadInputs.doc_code_operation.enabled ? loadInputs.doc_code_operation.value : null,
        
        // Параметры ПЗ
        p1_pz: loadInputs.p1_pz.enabled ? parseFloat(loadInputs.p1_pz.value) || null : null,
        temp1_pz: loadInputs.temp1_pz.enabled ? parseFloat(loadInputs.temp1_pz.value) || null : null,
        p2_pz: loadInputs.p2_pz.enabled ? parseFloat(loadInputs.p2_pz.value) || null : null,
        temp2_pz: loadInputs.temp2_pz.enabled ? parseFloat(loadInputs.temp2_pz.value) || null : null,
        sigma_dop_a_pz: loadInputs.sigma_dop_a_pz.enabled ? parseFloat(loadInputs.sigma_dop_a_pz.value) || null : null,
        ratio_e_pz: loadInputs.ratio_e_pz.enabled ? parseFloat(loadInputs.ratio_e_pz.value) || null : null,
        
        // Параметры МРЗ
        p1_mrz: loadInputs.p1_mrz.enabled ? parseFloat(loadInputs.p1_mrz.value) || null : null,
        temp1_mrz: loadInputs.temp1_mrz.enabled ? parseFloat(loadInputs.temp1_mrz.value) || null : null,
        p2_mrz: loadInputs.p2_mrz.enabled ? parseFloat(loadInputs.p2_mrz.value) || null : null,
        temp2_mrz: loadInputs.temp2_mrz.enabled ? parseFloat(loadInputs.temp2_mrz.value) || null : null,
        sigma_dop_a_mrz: loadInputs.sigma_dop_a_mrz.enabled ? parseFloat(loadInputs.sigma_dop_a_mrz.value) || null : null,
        ratio_e_mrz: loadInputs.ratio_e_mrz.enabled ? parseFloat(loadInputs.ratio_e_mrz.value) || null : null
      };

      console.log('Сохраняем параметры анализа навантаження:', dataToSave);
      
      // Проверяем, что хотя бы одно поле заполнено
      const hasData = Object.values(dataToSave).some(value => value !== null && value !== '');
      if (!hasData) {
        console.log('Нет данных для сохранения');
        return;
      }
      
      // Отправляем данные на сервер для сохранения
      const response = await fetch('http://localhost:8000/api/save-load-analysis-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Ответ сервера:', result);
    } catch (error) {
      console.error('Ошибка сохранения параметров:', error);
    }
  };

  return (
    <div className="load-analysis-main-container">
      <div className="load-analysis-main-form">
        <h3 className="load-analysis-main-title">Аналіз зміни навантаження</h3>
        
        <div className="load-analysis-main-content">
          {/* Статус доступности данных M1 и K1 */}
          <div className="load-analysis-availability-container">
            <div className="load-analysis-group">
              <h4 className="load-analysis-section-title">Доступність даних</h4>
              
              <div className="load-analysis-availability-layout">
                <div className="load-analysis-availability-section">
                  <div className="load-analysis-availability-item">
                    <div className="load-analysis-availability-label">
                      <span className="load-analysis-parameter-label">Значення M1 з попереднього розрахунку</span>
                      <div className="load-analysis-values">
                        {dataAvailability.pz && allAnalysisResults['ПЗ'] && (
                          <span className="load-analysis-value-small">ПЗ: {formatValue(allAnalysisResults['ПЗ'].m1)}</span>
                        )}
                        {dataAvailability.mrz && allAnalysisResults['МРЗ'] && (
                          <span className="load-analysis-value-small">МРЗ: {formatValue(allAnalysisResults['МРЗ'].m1)}</span>
                        )}
                      </div>
                    </div>
                    <div className="load-analysis-availability-status">
                      <span className={`load-analysis-status-text ${dataAvailability.m1_available ? 'available' : 'unavailable'}`}>
                        {dataAvailability.m1_available ? 'Доступно' : 'Недоступно'}
                      </span>
                    </div>
                  </div>

                  <div className="load-analysis-availability-item">
                    <div className="load-analysis-availability-label">
                      <span className="load-analysis-parameter-label">Значення K1 з попереднього розрахунку</span>
                      <div className="load-analysis-values">
                        {kResults?.pz?.k1 !== null && kResults?.pz?.k1 !== undefined && (
                          <span className="load-analysis-value-small">ПЗ: {formatValue(kResults.pz.k1)}</span>
                        )}
                        {kResults?.mrz?.k1 !== null && kResults?.mrz?.k1 !== undefined && (
                          <span className="load-analysis-value-small">МРЗ: {formatValue(kResults.mrz.k1)}</span>
                        )}
                      </div>
                    </div>
                    <div className="load-analysis-availability-status">
                      <span className={`load-analysis-status-text ${dataAvailability.k1_available ? 'available' : 'unavailable'}`}>
                        {dataAvailability.k1_available ? 'Доступно' : 'Недоступно'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Сообщение о недоступности формы */}
          {!isFormEnabled && (
            <div className="load-analysis-disabled-message">
              <div className="load-analysis-group">
                <div className="load-analysis-warning">
                  <h4 className="load-analysis-warning-title">Форма недоступна</h4>
                  <p className="load-analysis-warning-text">
                    Для виконання аналізу зміни навантаження необхідно спочатку розрахувати значення M1 та K1 
                    у формі "Аналіз зміни сейсмічних вимог".
                  </p>
                  <ul className="load-analysis-requirements-list">
                    <li className={dataAvailability.m1_available ? 'requirement-met' : 'requirement-missing'}>
                      Наявність розрахованих значень M1
                    </li>
                    <li className={dataAvailability.k1_available ? 'requirement-met' : 'requirement-missing'}>
                      Наявність розрахованих значень K1
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Общие параметры */}
          <div className={`load-analysis-common-container ${!isFormEnabled ? 'disabled-section' : ''}`}>
            <div className="load-analysis-group">
              <div className="load-analysis-inputs-section">
                <h4 className="load-analysis-section-title">Загальні параметри</h4>
                
                <div className="load-analysis-input-group">
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.material?.enabled || false}
                        onChange={() => handleInputToggle('material')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">Ввід матеріалу</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.material?.value || ''}
                      onChange={(e) => handleInputValueChange('material', e.target.value)}
                      disabled={!loadInputs.material?.enabled || !isFormEnabled}
                      placeholder="Матеріал"
                      className={`load-analysis-input-control ${(!loadInputs.material?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.doc_code_analytics?.enabled || false}
                        onChange={() => handleInputToggle('doc_code_analytics')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">Шифр документа (аналітика)</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.doc_code_analytics?.value || ''}
                      onChange={(e) => handleInputValueChange('doc_code_analytics', e.target.value)}
                      disabled={!loadInputs.doc_code_analytics?.enabled || !isFormEnabled}
                      placeholder="Шифр документа"
                      className={`load-analysis-input-control ${(!loadInputs.doc_code_analytics?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                </div>

                <div className="load-analysis-input-micro-group">
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.doc_code_operation?.enabled || false}
                        onChange={() => handleInputToggle('doc_code_operation')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">Шифр документа (експлуатація)</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.doc_code_operation?.value || ''}
                      onChange={(e) => handleInputValueChange('doc_code_operation', e.target.value)}
                      disabled={!loadInputs.doc_code_operation?.enabled || !isFormEnabled}
                      placeholder="Шифр документа"
                      className={`load-analysis-input-control ${(!loadInputs.doc_code_operation?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Параметры для ПЗ */}
          <div className={`load-analysis-section-container ${!isFormEnabled ? 'disabled-section' : ''}`}>
            <div className="load-analysis-group">
              <div className="load-analysis-inputs-section">
                <h4 className="load-analysis-section-title">Індивідуальні параметри для ПЗ</h4>
                
                {/* P аналітичне та T аналітичне */}
                <div className="load-analysis-input-group">
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.p1_pz?.enabled || false}
                        onChange={() => handleInputToggle('p1_pz')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">P аналітичне, МПа</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.p1_pz?.value || ''}
                      onChange={(e) => handleInputValueChange('p1_pz', e.target.value)}
                      disabled={!loadInputs.p1_pz?.enabled || !isFormEnabled}
                      placeholder="P1_PZ"
                      className={`load-analysis-input-control ${(!loadInputs.p1_pz?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.temp1_pz?.enabled || false}
                        onChange={() => handleInputToggle('temp1_pz')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">T аналітичне, °C</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.temp1_pz?.value || ''}
                      onChange={(e) => handleInputValueChange('temp1_pz', e.target.value)}
                      disabled={!loadInputs.temp1_pz?.enabled || !isFormEnabled}
                      placeholder="TEMP1_PZ"
                      className={`load-analysis-input-control ${(!loadInputs.temp1_pz?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                </div>

                {/* P експлуатація та T експлуатація */}
                <div className="load-analysis-input-group">
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.p2_pz?.enabled || false}
                        onChange={() => handleInputToggle('p2_pz')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">P експлуатація, МПа</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.p2_pz?.value || ''}
                      onChange={(e) => handleInputValueChange('p2_pz', e.target.value)}
                      disabled={!loadInputs.p2_pz?.enabled || !isFormEnabled}
                      placeholder="P2_PZ"
                      className={`load-analysis-input-control ${(!loadInputs.p2_pz?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.temp2_pz?.enabled || false}
                        onChange={() => handleInputToggle('temp2_pz')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">T експлуатація, °C</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.temp2_pz?.value || ''}
                      onChange={(e) => handleInputValueChange('temp2_pz', e.target.value)}
                      disabled={!loadInputs.temp2_pz?.enabled || !isFormEnabled}
                      placeholder="TEMP2_PZ"
                      className={`load-analysis-input-control ${(!loadInputs.temp2_pz?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                </div>

                {/* SIGMA* та DELTA E */}
                <div className="load-analysis-input-group">
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.sigma_dop_a_pz?.enabled || false}
                        onChange={() => handleInputToggle('sigma_dop_a_pz')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">σ*, МПа</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.sigma_dop_a_pz?.value || ''}
                      onChange={(e) => handleInputValueChange('sigma_dop_a_pz', e.target.value)}
                      disabled={!loadInputs.sigma_dop_a_pz?.enabled || !isFormEnabled}
                      placeholder="SIGMA_DOP_A_PZ"
                      className={`load-analysis-input-control ${(!loadInputs.sigma_dop_a_pz?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.ratio_e_pz?.enabled || false}
                        onChange={() => handleInputToggle('ratio_e_pz')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">ΔE</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.ratio_e_pz?.value || ''}
                      onChange={(e) => handleInputValueChange('ratio_e_pz', e.target.value)}
                      disabled={!loadInputs.ratio_e_pz?.enabled || !isFormEnabled}
                      placeholder="RATIO_E_PZ"
                      className={`load-analysis-input-control ${(!loadInputs.ratio_e_pz?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Параметры для МРЗ */}
          <div className={`load-analysis-section-container ${!isFormEnabled ? 'disabled-section' : ''}`}>
            <div className="load-analysis-group">
              <div className="load-analysis-inputs-section">
                <h4 className="load-analysis-section-title">Індивідуальні параметри для МРЗ</h4>
                
                {/* P аналітичне та T аналітичне */}
                <div className="load-analysis-input-group">
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.p1_mrz?.enabled || false}
                        onChange={() => handleInputToggle('p1_mrz')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">P аналітичне, МПа</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.p1_mrz?.value || ''}
                      onChange={(e) => handleInputValueChange('p1_mrz', e.target.value)}
                      disabled={!loadInputs.p1_mrz?.enabled || !isFormEnabled}
                      placeholder="P1_MRZ"
                      className={`load-analysis-input-control ${(!loadInputs.p1_mrz?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.temp1_mrz?.enabled || false}
                        onChange={() => handleInputToggle('temp1_mrz')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">T аналітичне, °C</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.temp1_mrz?.value || ''}
                      onChange={(e) => handleInputValueChange('temp1_mrz', e.target.value)}
                      disabled={!loadInputs.temp1_mrz?.enabled || !isFormEnabled}
                      placeholder="TEMP1_MRZ"
                      className={`load-analysis-input-control ${(!loadInputs.temp1_mrz?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                </div>

                {/* P експлуатація та T експлуатація */}
                <div className="load-analysis-input-group">
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.p2_mrz?.enabled || false}
                        onChange={() => handleInputToggle('p2_mrz')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">P експлуатація, МПа</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.p2_mrz?.value || ''}
                      onChange={(e) => handleInputValueChange('p2_mrz', e.target.value)}
                      disabled={!loadInputs.p2_mrz?.enabled || !isFormEnabled}
                      placeholder="P2_MRZ"
                      className={`load-analysis-input-control ${(!loadInputs.p2_mrz?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.temp2_mrz?.enabled || false}
                        onChange={() => handleInputToggle('temp2_mrz')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">T експлуатація, °C</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.temp2_mrz?.value || ''}
                      onChange={(e) => handleInputValueChange('temp2_mrz', e.target.value)}
                      disabled={!loadInputs.temp2_mrz?.enabled || !isFormEnabled}
                      placeholder="TEMP2_MRZ"
                      className={`load-analysis-input-control ${(!loadInputs.temp2_mrz?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                </div>

                {/* SIGMA* та DELTA E */}
                <div className="load-analysis-input-group">
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.sigma_dop_a_mrz?.enabled || false}
                        onChange={() => handleInputToggle('sigma_dop_a_mrz')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">σ*, МПа</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.sigma_dop_a_mrz?.value || ''}
                      onChange={(e) => handleInputValueChange('sigma_dop_a_mrz', e.target.value)}
                      disabled={!loadInputs.sigma_dop_a_mrz?.enabled || !isFormEnabled}
                      placeholder="SIGMA_DOP_A_MRZ"
                      className={`load-analysis-input-control ${(!loadInputs.sigma_dop_a_mrz?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.ratio_e_mrz?.enabled || false}
                        onChange={() => handleInputToggle('ratio_e_mrz')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">ΔE</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.ratio_e_mrz?.value || ''}
                      onChange={(e) => handleInputValueChange('ratio_e_mrz', e.target.value)}
                      disabled={!loadInputs.ratio_e_mrz?.enabled || !isFormEnabled}
                      placeholder="RATIO_E_MRZ"
                      className={`load-analysis-input-control ${(!loadInputs.ratio_e_mrz?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="load-analysis-form-actions">
          <button 
            type="button" 
            className={`load-analysis-calculate-button ${!isFormEnabled ? 'disabled' : ''}`}
            onClick={handleSaveParameters}
            disabled={!isFormEnabled}
          >
            Зберегти параметри
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadAnalysisTab; 