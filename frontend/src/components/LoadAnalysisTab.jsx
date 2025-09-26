import React, { useState, useEffect } from 'react';
import '../styles/LoadAnalysisTab.css';

// Функция интерполяции данных (копия из AnalysisModal.jsx)
const interpolateData = (targetFrequencies, sourceFrequencies, sourceValues) => {
  if (!sourceFrequencies || !sourceValues || sourceFrequencies.length === 0 || sourceValues.length === 0) {
    return targetFrequencies.map(() => 0);
  }

  return targetFrequencies.map(targetFreq => {
    // Если точное совпадение
    const exactIndex = sourceFrequencies.findIndex(f => f === targetFreq);
    if (exactIndex !== -1) {
      return sourceValues[exactIndex];
    }

    // Линейная интерполяция
    let lowerIndex = -1;
    let upperIndex = -1;

    for (let i = 0; i < sourceFrequencies.length - 1; i++) {
      if (sourceFrequencies[i] <= targetFreq && targetFreq <= sourceFrequencies[i + 1]) {
        lowerIndex = i;
        upperIndex = i + 1;
        break;
      }
    }

    if (lowerIndex === -1) {
      // Экстраполяция за пределами диапазона
      if (targetFreq < sourceFrequencies[0]) {
        return sourceValues[0];
      } else {
        return sourceValues[sourceValues.length - 1];
      }
    }

    const freq1 = sourceFrequencies[lowerIndex];
    const freq2 = sourceFrequencies[upperIndex];
    const val1 = sourceValues[lowerIndex];
    const val2 = sourceValues[upperIndex];

    if (freq2 === freq1) {
      return val1;
    }

    const ratio = (targetFreq - freq1) / (freq2 - freq1);
    return val1 + ratio * (val2 - val1);
  });
};

// Функция расчета анализа с заданной собственной частотой (упрощенная версия)
const calculateAnalysisWithNaturalFrequency = (requirements, characteristics, naturalFreq = null) => {
  // Если собственная частота не задана, используем обычный расчет
  if (!naturalFreq || isNaN(naturalFreq) || naturalFreq <= 0) {
    return null;
  }

  if (!requirements || !characteristics || !requirements.frequency || !characteristics.frequency ||
      requirements.frequency.length === 0 || characteristics.frequency.length === 0) {
    return null;
  }

  const result = {};

  for (const axis of ['x', 'y', 'z']) {
    // Handle both MRZ and PZ field naming patterns
    const getFieldValue = (data, prefix, axis) => {
      return data[`${prefix}_${axis}`] || data[`${prefix.toLowerCase()}_${axis}`];
    };

    const reqV = getFieldValue(requirements, 'mrz', axis) || getFieldValue(requirements, 'pz', axis);
    const charV = getFieldValue(characteristics, 'mrz', axis) || getFieldValue(characteristics, 'pz', axis);

    if (!reqV || !charV || reqV.length === 0 || charV.length === 0) {
      result[`m_${axis}_max`] = 0;
      continue;
    }

    // Создаем общий массив частот, но только >= naturalFreq
    const allFrequencies = [...new Set([...requirements.frequency, ...characteristics.frequency])]
      .filter(f => f >= naturalFreq)
      .sort((a, b) => a - b);

    if (allFrequencies.length === 0) {
      result[`m_${axis}_max`] = 0;
      continue;
    }

    // Интерполируем данные на отфильтрованные частоты
    const interpolatedReqV = interpolateData(allFrequencies, requirements.frequency, reqV);
    const interpolatedCharV = interpolateData(allFrequencies, characteristics.frequency, charV);

    // Вычисляем отношения
    const ratios = interpolatedReqV.map((reqValue, i) => {
      const charValue = interpolatedCharV[i];
      if (charValue === 0) {
        return reqValue > 0 ? Infinity : 0;
      }
      return reqValue / charValue;
    });

    const maxRatio = Math.max(...ratios.filter(r => isFinite(r)));
    result[`m_${axis}_max`] = isFinite(maxRatio) ? maxRatio : 0;
    if (ratios.includes(Infinity)) {
      result[`m_${axis}_max`] = Infinity;
    }
  }

  const { m_x_max, m_y_max, m_z_max } = result;
  result.m1 = Math.max(m_x_max, m_y_max, m_z_max);

  return result;
};

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
  elementData = null,
  stressInputs = {}
}) => {
  console.log('LoadAnalysisTab rendering with elementData:', elementData);
  console.log('naturalFrequency prop:', naturalFrequency);
  console.log('elementData.SIGMA_DOP:', elementData?.SIGMA_DOP);
  console.log('elementData.sigma_dop:', elementData?.sigma_dop);
  
  // Состояние для результатов расчета
  const [loadCalculationResults, setLoadCalculationResults] = useState({
    pz: { deltaT: null, deltaP: null, firstFreqAlt: null, deltaSigma: null, m1Alt: null, k1Alt: null },
    mrz: { deltaT: null, deltaP: null, firstFreqAlt: null, deltaSigma: null, m1Alt: null, k1Alt: null },
    calculationAttempted: false,
    missingData: { pz: [], mrz: [] }
  });
  
  // Состояние for input parameters
  const [loadInputs, setLoadInputs] = useState({
    // Общие параметры (заглушки пока)
    material: { enabled: true, value: '' },
    doc_code_analytics: { enabled: true, value: '' },
    doc_code_operation: { enabled: true, value: '' },
    sigma_alt_dop: { enabled: true, value: '' },
    
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
        const response = await fetch(`/api/get-load-analysis-params/${elementId}`);
        if (response.ok) {
          const data = await response.json();
          const savedParams = data.load_params;

          console.log('Загруженные данные из базы:', savedParams);
          console.log('first_freq_alt_pz из базы:', savedParams.first_freq_alt_pz);
          console.log('first_freq_alt_mrz из базы:', savedParams.first_freq_alt_mrz);
          console.log('ration_sigma_dop_pz из базы:', savedParams.ration_sigma_dop_pz);
          console.log('ration_sigma_dop_mrz из базы:', savedParams.ration_sigma_dop_mrz);
          console.log('sigma_alt_dop из базы:', savedParams.sigma_alt_dop);

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
            sigma_alt_dop: {
              enabled: true,
              value: savedParams.sigma_alt_dop ? savedParams.sigma_alt_dop.toString() : ''
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

          // Загружаем сохраненные результаты расчетов
          console.log('Проверяем условие для загрузки результатов:');
          console.log('delta_t_pz:', savedParams.delta_t_pz);
          console.log('ratio_p_pz:', savedParams.ratio_p_pz);
          console.log('delta_t_mrz:', savedParams.delta_t_mrz);
          console.log('ratio_p_mrz:', savedParams.ratio_p_mrz);
          console.log('first_freq_alt_pz:', savedParams.first_freq_alt_pz);
          console.log('first_freq_alt_mrz:', savedParams.first_freq_alt_mrz);
          console.log('m1_alt_pz:', savedParams.m1_alt_pz);
          console.log('m1_alt_mrz:', savedParams.m1_alt_mrz);

          if (savedParams.delta_t_pz !== null || savedParams.ratio_p_pz !== null ||
              savedParams.delta_t_mrz !== null || savedParams.ratio_p_mrz !== null ||
              savedParams.first_freq_alt_pz !== null || savedParams.first_freq_alt_mrz !== null ||
              savedParams.ration_sigma_dop_pz !== null || savedParams.ration_sigma_dop_mrz !== null ||
              savedParams.m1_alt_pz !== null || savedParams.m1_alt_mrz !== null ||
              savedParams.k1_alt_pz !== null || savedParams.k1_alt_mrz !== null) {
            console.log('Устанавливаем сохраненные результаты расчетов:');
            console.log('first_freq_alt_pz:', savedParams.first_freq_alt_pz);
            console.log('first_freq_alt_mrz:', savedParams.first_freq_alt_mrz);
            console.log('ration_sigma_dop_pz:', savedParams.ration_sigma_dop_pz);
            console.log('ration_sigma_dop_mrz:', savedParams.ration_sigma_dop_mrz);
            console.log('m1_alt_pz:', savedParams.m1_alt_pz);
            console.log('m1_alt_mrz:', savedParams.m1_alt_mrz);
            console.log('k1_alt_pz:', savedParams.k1_alt_pz);
            console.log('k1_alt_mrz:', savedParams.k1_alt_mrz);

            setLoadCalculationResults({
              pz: {
                deltaT: savedParams.delta_t_pz,
                deltaP: savedParams.ratio_p_pz,
                firstFreqAlt: savedParams.first_freq_alt_pz,
                deltaSigma: savedParams.ration_sigma_dop_pz !== null && savedParams.ration_sigma_dop_pz !== undefined ?
                           savedParams.ration_sigma_dop_pz : null,
                m1Alt: savedParams.m1_alt_pz,
                k1Alt: savedParams.k1_alt_pz
              },
              mrz: {
                deltaT: savedParams.delta_t_mrz,
                deltaP: savedParams.ratio_p_mrz,
                firstFreqAlt: savedParams.first_freq_alt_mrz,
                deltaSigma: savedParams.ration_sigma_dop_mrz !== null && savedParams.ration_sigma_dop_mrz !== undefined ?
                           savedParams.ration_sigma_dop_mrz : null,
                m1Alt: savedParams.m1_alt_mrz,
                k1Alt: savedParams.k1_alt_mrz
              },
              calculationAttempted: true,
              missingData: { pz: [], mrz: [] }
            });
          }
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

  // Функция для расчета delta T и delta P
  const performLoadCalculation = () => {
    const results = {
      pz: { deltaT: null, deltaP: null, firstFreqAlt: null, deltaSigma: null },
      mrz: { deltaT: null, deltaP: null, firstFreqAlt: null, deltaSigma: null },
      calculationAttempted: true,
      missingData: { pz: [], mrz: [] }
    };

    // Расчет для ПЗ
    const pzMissingData = [];
    
    // Проверяем наличие данных для delta T (T2 - T1)
    const temp1Pz = loadInputs.temp1_pz?.enabled && loadInputs.temp1_pz?.value ? parseFloat(loadInputs.temp1_pz.value) : null;
    const temp2Pz = loadInputs.temp2_pz?.enabled && loadInputs.temp2_pz?.value ? parseFloat(loadInputs.temp2_pz.value) : null;
    
    if (temp1Pz !== null && temp2Pz !== null) {
      results.pz.deltaT = temp2Pz - temp1Pz;
    } else {
      if (!loadInputs.temp1_pz?.enabled || temp1Pz === null) pzMissingData.push('T1_PZ');
      if (!loadInputs.temp2_pz?.enabled || temp2Pz === null) pzMissingData.push('T2_PZ');
    }

    // Проверяем наличие данных для delta P (P2 / P1)
    const p1Pz = loadInputs.p1_pz?.enabled && loadInputs.p1_pz?.value ? parseFloat(loadInputs.p1_pz.value) : null;
    const p2Pz = loadInputs.p2_pz?.enabled && loadInputs.p2_pz?.value ? parseFloat(loadInputs.p2_pz.value) : null;
    
    if (p1Pz !== null && p2Pz !== null && p1Pz !== 0) {
      results.pz.deltaP = p2Pz / p1Pz;
    } else {
      if (!loadInputs.p1_pz?.enabled || p1Pz === null) pzMissingData.push('P1_PZ');
      if (!loadInputs.p2_pz?.enabled || p2Pz === null) pzMissingData.push('P2_PZ');
      if (p1Pz === 0) pzMissingData.push('P1_PZ (нульове значення)');
    }

    results.missingData.pz = pzMissingData;

    // Расчет для МРЗ
    const mrzMissingData = [];
    
    // Проверяем наличие данных для delta T (T2 - T1)
    const temp1Mrz = loadInputs.temp1_mrz?.enabled && loadInputs.temp1_mrz?.value ? parseFloat(loadInputs.temp1_mrz.value) : null;
    const temp2Mrz = loadInputs.temp2_mrz?.enabled && loadInputs.temp2_mrz?.value ? parseFloat(loadInputs.temp2_mrz.value) : null;
    
    if (temp1Mrz !== null && temp2Mrz !== null) {
      results.mrz.deltaT = temp2Mrz - temp1Mrz;
    } else {
      if (!loadInputs.temp1_mrz?.enabled || temp1Mrz === null) mrzMissingData.push('T1_MRZ');
      if (!loadInputs.temp2_mrz?.enabled || temp2Mrz === null) mrzMissingData.push('T2_MRZ');
    }

    // Проверяем наличие данных для delta P (P2 / P1)
    const p1Mrz = loadInputs.p1_mrz?.enabled && loadInputs.p1_mrz?.value ? parseFloat(loadInputs.p1_mrz.value) : null;
    const p2Mrz = loadInputs.p2_mrz?.enabled && loadInputs.p2_mrz?.value ? parseFloat(loadInputs.p2_mrz.value) : null;
    
    if (p1Mrz !== null && p2Mrz !== null && p1Mrz !== 0) {
      results.mrz.deltaP = p2Mrz / p1Mrz;
    } else {
      if (!loadInputs.p1_mrz?.enabled || p1Mrz === null) mrzMissingData.push('P1_MRZ');
      if (!loadInputs.p2_mrz?.enabled || p2Mrz === null) mrzMissingData.push('P2_MRZ');
      if (p1Mrz === 0) mrzMissingData.push('P1_MRZ (нульове значення)');
    }

    results.missingData.mrz = mrzMissingData;

    // Расчет deltaSigma
    console.log('Расчет deltaSigma:');
    console.log('loadInputs.sigma_alt_dop:', loadInputs.sigma_alt_dop);
    console.log('elementData:', elementData);

    let deltaSigma = null;
    if (loadInputs.sigma_alt_dop?.enabled && loadInputs.sigma_alt_dop?.value) {
      const sigmaAltDop = parseFloat(loadInputs.sigma_alt_dop.value);
      console.log('sigmaAltDop parsed:', sigmaAltDop);

      if (sigmaAltDop > 0) {
        // Получаем SIGMA_DOP из таблицы базы данных (elementData)
        const sigmaDop = elementData?.SIGMA_DOP ?? elementData?.sigma_dop ?? null;
        console.log('sigmaDop from elementData:', sigmaDop);

        if (sigmaDop !== null && sigmaDop !== undefined && !isNaN(sigmaDop) && sigmaDop > 0) {
          deltaSigma = sigmaDop / sigmaAltDop;
          console.log('deltaSigma рассчитан:', deltaSigma, '= sigmaDop', sigmaDop, '/ sigmaAltDop', sigmaAltDop);
        } else {
          console.log('SIGMA_DOP из базы данных не доступен или <= 0');
          // Если sigma_alt_dop введено, но sigma_dop недоступен, показываем специальное сообщение
          deltaSigma = 'sigma_dop_not_available';
        }
      } else {
        console.log('sigma_alt_dop <= 0 или не число');
      }
    } else {
      console.log('sigma_alt_dop не заполнен или отключен');
    }

    results.pz.deltaSigma = deltaSigma;
    results.mrz.deltaSigma = deltaSigma; // Одно и то же значение для обоих
    console.log('Final deltaSigma in results:', deltaSigma);

    // Расчет новых собственных частот
    console.log('Расчет новых частот:');
    console.log('naturalFrequency:', naturalFrequency);
    console.log('loadInputs.ratio_e_pz:', loadInputs.ratio_e_pz);
    console.log('loadInputs.ratio_e_mrz:', loadInputs.ratio_e_mrz);

    if (naturalFrequency !== null && naturalFrequency !== undefined && !isNaN(naturalFrequency)) {
      // Расчет для ПЗ
      const ratioEPz = loadInputs.ratio_e_pz?.enabled && loadInputs.ratio_e_pz?.value ?
        parseFloat(loadInputs.ratio_e_pz.value) : null;
      console.log('ratioEPz:', ratioEPz);

      if (ratioEPz !== null && ratioEPz > 0) {
        results.pz.firstFreqAlt = naturalFrequency / Math.sqrt(ratioEPz);
        console.log('results.pz.firstFreqAlt:', results.pz.firstFreqAlt);
      } else {
        console.log('Не рассчитываем firstFreqAlt для ПЗ: ratioEPz null или <= 0');
      }

      // Расчет для МРЗ
      const ratioEMrz = loadInputs.ratio_e_mrz?.enabled && loadInputs.ratio_e_mrz?.value ?
        parseFloat(loadInputs.ratio_e_mrz.value) : null;
      console.log('ratioEMrz:', ratioEMrz);

      if (ratioEMrz !== null && ratioEMrz > 0) {
        results.mrz.firstFreqAlt = naturalFrequency / Math.sqrt(ratioEMrz);
        console.log('results.mrz.firstFreqAlt:', results.mrz.firstFreqAlt);
      } else {
        console.log('Не рассчитываем firstFreqAlt для МРЗ: ratioEMrz null или <= 0');
      }
    } else {
      console.log('Не рассчитываем частоты: naturalFrequency null/undefined/NaN');
    }

    // Расчет M1_ALT для ПЗ и МРЗ с новыми собственными частотами
    console.log('Расчет M1_ALT:');
    console.log('allSpectralData:', allSpectralData);
    console.log('allRequirementsData:', allRequirementsData);
    console.log('first_freq_alt_pz:', results.pz.firstFreqAlt);
    console.log('first_freq_alt_mrz:', results.mrz.firstFreqAlt);

    // Расчет для ПЗ
    if (allSpectralData?.['ПЗ'] && allRequirementsData?.['ПЗ'] && results.pz.firstFreqAlt) {
      const pzAnalysis = calculateAnalysisWithNaturalFrequency(
        allRequirementsData['ПЗ'],
        allSpectralData['ПЗ'],
        results.pz.firstFreqAlt
      );
      if (pzAnalysis) {
        results.pz.m1Alt = pzAnalysis.m1;
        console.log('M1_ALT для ПЗ рассчитан:', results.pz.m1Alt);
      }
    }

    // Расчет для МРЗ
    if (allSpectralData?.['МРЗ'] && allRequirementsData?.['МРЗ'] && results.mrz.firstFreqAlt) {
      const mrzAnalysis = calculateAnalysisWithNaturalFrequency(
        allRequirementsData['МРЗ'],
        allSpectralData['МРЗ'],
        results.mrz.firstFreqAlt
      );
      if (mrzAnalysis) {
        results.mrz.m1Alt = mrzAnalysis.m1;
        console.log('M1_ALT для МРЗ рассчитан:', results.mrz.m1Alt);
      }
    }

    // Расчет K1_ALT для ПЗ и МРЗ
    console.log('Расчет K1_ALT:');
    console.log('kResults:', kResults);
    console.log('loadCalculationResults:', results);

    // Расчет для ПЗ: K1* = K1 / (ratioP * ratioM * ratioSigma_alt)
    if (kResults?.pz?.k1 && results.pz.deltaP && results.pz.deltaSigma) {
      const ratioEPz = loadInputs.ratio_e_pz?.enabled && loadInputs.ratio_e_pz?.value ?
        parseFloat(loadInputs.ratio_e_pz.value) : null;

      if (ratioEPz && ratioEPz > 0) {
        const k1AltPz = kResults.pz.k1 / (results.pz.deltaP * ratioEPz * results.pz.deltaSigma);
        results.pz.k1Alt = k1AltPz;
        console.log('K1_ALT для ПЗ рассчитан:', results.pz.k1Alt);
        console.log('Формула: K1_ALT =', kResults.pz.k1, '/', results.pz.deltaP, '*', ratioEPz, '*', results.pz.deltaSigma);
      }
    }

    // Расчет для МРЗ: K1* = K1 / (ratioP * ratioM * ratioSigma_alt)
    if (kResults?.mrz?.k1 && results.mrz.deltaP && results.mrz.deltaSigma) {
      const ratioEMrz = loadInputs.ratio_e_mrz?.enabled && loadInputs.ratio_e_mrz?.value ?
        parseFloat(loadInputs.ratio_e_mrz.value) : null;

      if (ratioEMrz && ratioEMrz > 0) {
        const k1AltMrz = kResults.mrz.k1 / (results.mrz.deltaP * ratioEMrz * results.mrz.deltaSigma);
        results.mrz.k1Alt = k1AltMrz;
        console.log('K1_ALT для МРЗ рассчитан:', results.mrz.k1Alt);
        console.log('Формула: K1_ALT =', kResults.mrz.k1, '/', results.mrz.deltaP, '*', ratioEMrz, '*', results.mrz.deltaSigma);
      }
    }

    setLoadCalculationResults(results);
    return results; // Возвращаем результаты для использования в handleCalculate
  };

  // Обработчики для переключения полей
  const handleInputToggle = (fieldName) => {
    if (!isFormEnabled) return;
    
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
    if (!isFormEnabled) return;
    
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

  // Функция расчета и сохранения параметров
  const handleCalculate = async () => {
    console.log('Попытка расчета и сохранения параметров');
    console.log('isFormEnabled:', isFormEnabled);
    console.log('elementData:', elementData);
    
    if (!isFormEnabled) {
      console.log('Форма заблокирована, расчет невозможен');
      return;
    }

    // Сначала выполняем расчет и получаем результаты
    const calculationResults = performLoadCalculation();
    console.log('Результаты расчета:', calculationResults);

    try {
      const elementId = elementData?.EK_ID || elementData?.ek_id || elementData?.id || elementData?.ID;
      
      if (!elementId) {
        console.log('Нет elementId, сохранение невозможно');
        console.log('elementData fields:', elementData ? Object.keys(elementData) : 'No elementData');
        return;
      }
      
      // Подготавливаем данные для отправки
      const dataToSave = {
        element_id: elementId,
        // Общие параметры
        material: loadInputs.material.enabled ? loadInputs.material.value : null,
        doc_code_analytics: loadInputs.doc_code_analytics.enabled ? loadInputs.doc_code_analytics.value : null,
        doc_code_operation: loadInputs.doc_code_operation.enabled ? loadInputs.doc_code_operation.value : null,
        sigma_alt_dop: loadInputs.sigma_alt_dop.enabled ? parseFloat(loadInputs.sigma_alt_dop.value) || null : null,
        
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
        ratio_e_mrz: loadInputs.ratio_e_mrz.enabled ? parseFloat(loadInputs.ratio_e_mrz.value) || null : null,
        
        // Результаты расчетов ПЗ
        delta_t_pz: calculationResults.pz.deltaT,
        ratio_p_pz: calculationResults.pz.deltaP,
        first_freq_alt_pz: calculationResults.pz.firstFreqAlt,
        ration_sigma_dop_pz: calculationResults.pz.deltaSigma,
        m1_alt_pz: calculationResults.pz.m1Alt,
        k1_alt_pz: calculationResults.pz.k1Alt,

        // Результаты расчетов МРЗ
        delta_t_mrz: calculationResults.mrz.deltaT,
        ratio_p_mrz: calculationResults.mrz.deltaP,
        first_freq_alt_mrz: calculationResults.mrz.firstFreqAlt,
        ration_sigma_dop_mrz: calculationResults.mrz.deltaSigma,
        m1_alt_mrz: calculationResults.mrz.m1Alt,
        k1_alt_mrz: calculationResults.mrz.k1Alt
      };

      console.log('Сохраняем параметры анализа навантаження:', dataToSave);
      console.log('first_freq_alt_pz:', dataToSave.first_freq_alt_pz);
      console.log('first_freq_alt_mrz:', dataToSave.first_freq_alt_mrz);
      console.log('ration_sigma_dop_pz:', dataToSave.ration_sigma_dop_pz);
      console.log('ration_sigma_dop_mrz:', dataToSave.ration_sigma_dop_mrz);
      console.log('sigma_alt_dop:', dataToSave.sigma_alt_dop);
      
      // Проверяем, что хотя бы одно поле заполнено
      const hasData = Object.values(dataToSave).some(value => value !== null && value !== '');
      if (!hasData) {
        console.log('Нет данных для сохранения');
        return;
      }
      
      // Отправляем данные на сервер для сохранения
      console.log('Отправляем запрос на сервер...');
      const response = await fetch('/api/save-load-analysis-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Ответ сервера:', result);
    } catch (error) {
      console.error('Ошибка сохранения параметров:', error);
    }
  };

  // Простая проверка для отладки
  if (!elementData) {
    console.log('LoadAnalysisTab: elementData is null or undefined');
    return (
      <div className="load-analysis-main-container">
        <div className="load-analysis-main-form">
          <h3 className="load-analysis-main-title">Аналіз зміни навантаження</h3>
          <p>Завантаження даних...</p>
        </div>
      </div>
    );
  }

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
                          <span className="load-analysis-value-small">ПЗ: <span className="bold-value">{formatValue(kResults.pz.k1)}</span></span>
                        )}
                        {kResults?.mrz?.k1 !== null && kResults?.mrz?.k1 !== undefined && (
                          <span className="load-analysis-value-small">МРЗ: <span className="bold-value">{formatValue(kResults.mrz.k1)}</span></span>
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
                  <div className="load-analysis-input-field">
                    <label className="load-analysis-checkbox-container">
                      <input
                        type="checkbox"
                        checked={loadInputs.sigma_alt_dop?.enabled || false}
                        onChange={() => handleInputToggle('sigma_alt_dop')}
                        disabled={!isFormEnabled}
                      />
                      <span className="load-analysis-checkmark"></span>
                      <span className="load-analysis-input-label">σ*, мПа</span>
                    </label>
                    <input
                      type="text"
                      value={loadInputs.sigma_alt_dop?.value || ''}
                      onChange={(e) => handleInputValueChange('sigma_alt_dop', e.target.value)}
                      disabled={!loadInputs.sigma_alt_dop?.enabled || !isFormEnabled}
                      placeholder="SIGMA_ALT_DOP"
                      className={`load-analysis-input-control ${(!loadInputs.sigma_alt_dop?.enabled || !isFormEnabled) ? 'disabled' : ''}`}
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
            onClick={handleCalculate}
            disabled={!isFormEnabled}
          >
            Розрахувати
          </button>
        </div>

        {/* Результаты расчетов - показываем всегда если был запущен расчет */}
        {loadCalculationResults.calculationAttempted && (
          <div className="calculation-results-container">
            <h3 className="results-title">Результати розрахунків</h3>
            
            <div className="results-layout">
              {/* Результаты для ПЗ */}
              <div className="results-section">
                <h4 className="results-section-title">Результати для ПЗ</h4>
                <div className="results-grid">
                  <div className="result-item">
                    <span className="result-label">ΔT (T₂ - T₁):</span>
                    {loadCalculationResults.pz?.deltaT !== null ? (
                      <span className="result-value">{loadCalculationResults.pz.deltaT.toFixed(4)} °C</span>
                    ) : (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          loadCalculationResults.missingData?.pz?.filter(item => item.includes('T')).length > 0 ?
                            `Відсутні дані: ${loadCalculationResults.missingData.pz.filter(item => item.includes('T')).join(', ')}` :
                            'Недостатньо даних'
                        }
                      </span>
                    )}
                  </div>
                  <div className="result-item">
                    <span className="result-label">ΔP (P₂ / P₁):</span>
                    {loadCalculationResults.pz?.deltaP !== null ? (
                      <span className="result-value">{loadCalculationResults.pz.deltaP.toFixed(4)}</span>
                    ) : (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          loadCalculationResults.missingData?.pz?.filter(item => item.includes('P')).length > 0 ?
                            `Відсутні дані: ${loadCalculationResults.missingData.pz.filter(item => item.includes('P')).join(', ')}` :
                            'Недостатньо даних'
                        }
                      </span>
                    )}
                  </div>
                  <div className="result-item">
                    <span className="result-label">Власна частота*:</span>
                    {loadCalculationResults.pz?.firstFreqAlt !== null && loadCalculationResults.pz?.firstFreqAlt !== undefined ? (
                      <span className="result-value">{loadCalculationResults.pz.firstFreqAlt.toFixed(4)} Гц</span>
                    ) : (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          naturalFrequency === null || naturalFrequency === undefined || isNaN(naturalFrequency) ?
                            'Відсутня базова частота' :
                            'Відсутнє значення ΔE'
                        }
                      </span>
                    )}
                  </div>
                  <div className="result-item">
                    <span className="result-label">Δσ:</span>
                    {loadCalculationResults.pz?.deltaSigma !== null &&
                     loadCalculationResults.pz?.deltaSigma !== undefined &&
                     loadCalculationResults.pz?.deltaSigma !== 'sigma_dop_not_available' ? (
                      <span className="result-value">{loadCalculationResults.pz.deltaSigma.toFixed(4)}</span>
                    ) : loadCalculationResults.pz?.deltaSigma === 'sigma_dop_not_available' ? (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          'Відсутнє значення SIGMA_DOP в таблиці бази даних'
                        }
                      </span>
                    ) : (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          'Відсутнє значення σ*'
                        }
                      </span>
                    )}
                  </div>
                  <div className="result-item">
                    <span className="result-label">m₁*:</span>
                    {loadCalculationResults.pz?.m1Alt !== null &&
                     loadCalculationResults.pz?.m1Alt !== undefined &&
                     !isNaN(loadCalculationResults.pz.m1Alt) ? (
                      <span className="result-value">{loadCalculationResults.pz.m1Alt.toFixed(4)}</span>
                    ) : (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          loadCalculationResults.pz?.firstFreqAlt === null || loadCalculationResults.pz?.firstFreqAlt === undefined ?
                            'Відсутня власна частота*' :
                            'Недостатньо даних для розрахунку'
                        }
                      </span>
                    )}
                  </div>
                  <div className="result-item">
                    <span className="result-label">K₁*:</span>
                    {loadCalculationResults.pz?.k1Alt !== null &&
                     loadCalculationResults.pz?.k1Alt !== undefined &&
                     !isNaN(loadCalculationResults.pz.k1Alt) ? (
                      <span className="result-value"><span className="bold-value">{loadCalculationResults.pz.k1Alt.toFixed(4)}</span></span>
                    ) : (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          kResults?.pz?.k1 === null || kResults?.pz?.k1 === undefined ?
                            'Відсутнє значення K₁' :
                            loadCalculationResults.pz?.deltaP === null ?
                              'Відсутнє значення ΔP' :
                              loadCalculationResults.pz?.deltaSigma === null ?
                                'Відсутнє значення Δσ' :
                                'Відсутнє значення ΔE'
                        }
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Информация о недостающих данных для ПЗ */}
                {loadCalculationResults.missingData?.pz?.length > 0 && (
                  <div className="k-calculation-info">
                    <p className="k-info-message">
                      Для розрахунку необхідно:
                    </p>
                    <ul className="k-requirements-list">
                      <li className={loadCalculationResults.pz?.deltaT !== null ? 'requirement-met' : 'requirement-missing'}>
                        Ввести значення T₁ та T₂ для розрахунку ΔT
                      </li>
                      <li className={loadCalculationResults.pz?.deltaP !== null ? 'requirement-met' : 'requirement-missing'}>
                        Ввести значення P₁ та P₂ (P₁ ≠ 0) для розрахунку ΔP
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Результаты для МРЗ */}
              <div className="results-section">
                <h4 className="results-section-title">Результати для МРЗ</h4>
                <div className="results-grid">
                  <div className="result-item">
                    <span className="result-label">ΔT (T₂ - T₁):</span>
                    {loadCalculationResults.mrz?.deltaT !== null ? (
                      <span className="result-value">{loadCalculationResults.mrz.deltaT.toFixed(4)} °C</span>
                    ) : (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          loadCalculationResults.missingData?.mrz?.filter(item => item.includes('T')).length > 0 ?
                            `Відсутні дані: ${loadCalculationResults.missingData.mrz.filter(item => item.includes('T')).join(', ')}` :
                            'Недостатньо даних'
                        }
                      </span>
                    )}
                  </div>
                  <div className="result-item">
                    <span className="result-label">ΔP (P₂ / P₁):</span>
                    {loadCalculationResults.mrz?.deltaP !== null ? (
                      <span className="result-value">{loadCalculationResults.mrz.deltaP.toFixed(4)}</span>
                    ) : (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          loadCalculationResults.missingData?.mrz?.filter(item => item.includes('P')).length > 0 ?
                            `Відсутні дані: ${loadCalculationResults.missingData.mrz.filter(item => item.includes('P')).join(', ')}` :
                            'Недостатньо даних'
                        }
                      </span>
                    )}
                  </div>
                  <div className="result-item">
                    <span className="result-label">Власна частота*:</span>
                    {loadCalculationResults.mrz?.firstFreqAlt !== null && loadCalculationResults.mrz?.firstFreqAlt !== undefined ? (
                      <span className="result-value">{loadCalculationResults.mrz.firstFreqAlt.toFixed(4)} Гц</span>
                    ) : (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          naturalFrequency === null || naturalFrequency === undefined || isNaN(naturalFrequency) ?
                            'Відсутня базова частота' :
                            'Відсутнє значення ΔE'
                        }
                      </span>
                    )}
                  </div>
                  <div className="result-item">
                    <span className="result-label">Δσ:</span>
                    {loadCalculationResults.mrz?.deltaSigma !== null &&
                     loadCalculationResults.mrz?.deltaSigma !== undefined &&
                     loadCalculationResults.mrz?.deltaSigma !== 'sigma_dop_not_available' ? (
                      <span className="result-value">{loadCalculationResults.mrz.deltaSigma.toFixed(4)}</span>
                    ) : loadCalculationResults.mrz?.deltaSigma === 'sigma_dop_not_available' ? (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          'Відсутнє значення SIGMA_DOP в таблиці бази даних'
                        }
                      </span>
                    ) : (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          'Відсутнє значення σ*'
                        }
                      </span>
                    )}
                  </div>
                  <div className="result-item">
                    <span className="result-label">m₁*:</span>
                    {loadCalculationResults.mrz?.m1Alt !== null &&
                     loadCalculationResults.mrz?.m1Alt !== undefined &&
                     !isNaN(loadCalculationResults.mrz.m1Alt) ? (
                      <span className="result-value">{loadCalculationResults.mrz.m1Alt.toFixed(4)}</span>
                    ) : (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          loadCalculationResults.mrz?.firstFreqAlt === null || loadCalculationResults.mrz?.firstFreqAlt === undefined ?
                            'Відсутня власна частота*' :
                            'Недостатньо даних для розрахунку'
                        }
                      </span>
                    )}
                  </div>
                  <div className="result-item">
                    <span className="result-label">K₁*:</span>
                    {loadCalculationResults.mrz?.k1Alt !== null &&
                     loadCalculationResults.mrz?.k1Alt !== undefined &&
                     !isNaN(loadCalculationResults.mrz.k1Alt) ? (
                      <span className="result-value"><span className="bold-value">{loadCalculationResults.mrz.k1Alt.toFixed(4)}</span></span>
                    ) : (
                      <span className="no-data-message">
                        {!loadCalculationResults.calculationAttempted ?
                          'Натисніть кнопку Розрахувати' :
                          kResults?.mrz?.k1 === null || kResults?.mrz?.k1 === undefined ?
                            'Відсутнє значення K₁' :
                            loadCalculationResults.mrz?.deltaP === null ?
                              'Відсутнє значення ΔP' :
                              loadCalculationResults.mrz?.deltaSigma === null ?
                                'Відсутнє значення Δσ' :
                                'Відсутнє значення ΔE'
                        }
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Информация о недостающих данных для МРЗ */}
                {loadCalculationResults.missingData?.mrz?.length > 0 && (
                  <div className="k-calculation-info">
                    <p className="k-info-message">
                      Для розрахунку необхідно:
                    </p>
                    <ul className="k-requirements-list">
                      <li className={loadCalculationResults.mrz?.deltaT !== null ? 'requirement-met' : 'requirement-missing'}>
                        Ввести значення T₁ та T₂ для розрахунку ΔT
                      </li>
                      <li className={loadCalculationResults.mrz?.deltaP !== null ? 'requirement-met' : 'requirement-missing'}>
                        Ввести значення P₁ та P₂ (P₁ ≠ 0) для розрахунку ΔP
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadAnalysisTab; 