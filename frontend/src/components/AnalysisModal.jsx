import React, { useState, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import CalculationAnalysisTab from './CalculationAnalysisTab';
import SeismicAnalysisTab from './SeismicAnalysisTab';
import LoadAnalysisTab from './LoadAnalysisTab';
import '../styles/AnalysisModal.css';

const linearInterpolate = (x, x0, y0, x1, y1) => {
  if (x1 === x0) {
    return y0;
  }
  return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
};

const interpolateData = (targetFrequencies, sourceFrequencies, sourceValues) => {
  if (!sourceFrequencies || sourceFrequencies.length === 0) {
    return targetFrequencies.map(() => 0);
  }

  // Ensure sourceFrequencies are sorted
  const sortedSource = [...sourceFrequencies]
    .map((freq, i) => ({ freq, val: sourceValues[i] }))
    .sort((a, b) => a.freq - b.freq);
    
  const sF = sortedSource.map(d => d.freq);
  const sV = sortedSource.map(d => d.val);

  if (sF.length === 1) {
    return targetFrequencies.map(() => sV[0]);
  }

  const minFreq = sF[0];
  const maxFreq = sF[sF.length - 1];
  const minVal = sV[0];
  const maxVal = sV[sV.length - 1];

  return targetFrequencies.map(freq => {
    // Plateau for points outside the source range
    if (freq < minFreq) {
      return minVal;
    }
    if (freq > maxFreq) {
      return maxVal;
    }

    // Find an exact match or an interval for interpolation
    const upperIndex = sF.findIndex(f => f >= freq);

    // Exact match
    if (sF[upperIndex] === freq) {
      return sV[upperIndex];
    }
    
    // Interpolation for internal points
    const lowerIndex = upperIndex - 1;
    const x0 = sF[lowerIndex];
    const y0 = sV[lowerIndex];
    const x1 = sF[upperIndex];
    const y1 = sV[upperIndex];

    return linearInterpolate(freq, x0, y0, x1, y1);
  });
};

const calculateAnalysis = (requirements, characteristics) => {
  if (!requirements || !characteristics || !requirements.frequency || !characteristics.frequency || 
      requirements.frequency.length === 0 || characteristics.frequency.length === 0) {
    return null;
  }

  const result = {};

  for (const axis of ['x', 'y', 'z']) {
    const reqF = requirements.frequency;
    const charF = characteristics.frequency;
    
    // Handle both MRZ and PZ field naming patterns
    const getFieldValue = (data, prefix, axis) => {
      return data[`${prefix}_${axis}`] || data[`${prefix.toLowerCase()}_${axis}`];
    };
    
    const reqV = getFieldValue(requirements, 'mrz', axis) || getFieldValue(requirements, 'pz', axis);
    const charV = getFieldValue(characteristics, 'mrz', axis) || getFieldValue(characteristics, 'pz', axis);

    if (!reqV || !charV || reqV.length === 0 || charV.length === 0) {
      result[`m_${axis}_max`] = 0; // Set to 0 if data for an axis is missing
      continue;
    }

    const allFrequencies = [...new Set([...reqF, ...charF])].sort((a, b) => a - b);
    
    const interpolatedReqV = interpolateData(allFrequencies, reqF, reqV);
    const interpolatedCharV = interpolateData(allFrequencies, charF, charV);

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
  result.m2 = Math.sqrt(m_x_max**2 + m_y_max**2 + m_z_max**2);
  result.numberOfPoints = Math.max(...Object.values(result).map(v => Array.isArray(v) ? v.length : 0).filter(v => v > 0));

  const allFrequencies = [...new Set([...(requirements.frequency || []), ...(characteristics.frequency || [])])];
  result.numberOfPoints = allFrequencies.length;

  return result;
};

const calculateAnalysisWithNaturalFrequency = (requirements, characteristics, naturalFreq = null) => {
  // Если собственная частота не задана, используем обычный расчет
  if (!naturalFreq || isNaN(naturalFreq) || naturalFreq <= 0) {
    return calculateAnalysis(requirements, characteristics);
  }

  if (!requirements || !characteristics || !requirements.frequency || !characteristics.frequency || 
      requirements.frequency.length === 0 || characteristics.frequency.length === 0) {
    return null;
  }

  console.log(`=== ЛОГИКА С ПЛАТО ДЛЯ ЧАСТОТЫ: ${naturalFreq} Гц ===`);
  
  const result = {};

  for (const axis of ['x', 'y', 'z']) {
    const reqF = requirements.frequency;
    const charF = characteristics.frequency;
    
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
    const allFrequencies = [...new Set([...reqF, ...charF])]
      .filter(f => f >= naturalFreq)
      .sort((a, b) => a - b);
    
    if (allFrequencies.length === 0) {
      result[`m_${axis}_max`] = 0;
      continue;
    }
    
    console.log(`Ось ${axis}: частоты для расчета от ${allFrequencies[0]} до ${allFrequencies[allFrequencies.length-1]} Гц`);
    
    // Интерполируем данные на отфильтрованные частоты (с плато!)
    const interpolatedReqV = interpolateData(allFrequencies, reqF, reqV);
    const interpolatedCharV = interpolateData(allFrequencies, charF, charV);

    console.log(`Ось ${axis}: примеры интерполированных требований:`, interpolatedReqV.slice(0, 3));
    console.log(`Ось ${axis}: примеры интерполированных характеристик:`, interpolatedCharV.slice(0, 3));

    // Вычисляем отношения
    const ratios = interpolatedReqV.map((reqValue, i) => {
      const charValue = interpolatedCharV[i];
      if (charValue === 0) {
        return reqValue > 0 ? Infinity : 0;
      }
      return reqValue / charValue;
    });

    console.log(`Ось ${axis}: примеры отношений req/char:`, ratios.slice(0, 3));

    const maxRatio = Math.max(...ratios.filter(r => isFinite(r)));
    result[`m_${axis}_max`] = isFinite(maxRatio) ? maxRatio : 0;
    if (ratios.includes(Infinity)) {
      result[`m_${axis}_max`] = Infinity;
    }
    
    console.log(`Ось ${axis}: максимальное отношение = ${result[`m_${axis}_max`]}`);
  }

  const { m_x_max, m_y_max, m_z_max } = result;

  result.m1 = Math.max(m_x_max, m_y_max, m_z_max);
  result.m2 = Math.sqrt(m_x_max**2 + m_y_max**2 + m_z_max**2);
  
  // Подсчитываем количество отфильтрованных точек
  const allFilteredFrequencies = [...new Set([...requirements.frequency, ...characteristics.frequency])]
    .filter(f => f >= naturalFreq);
  result.numberOfPoints = allFilteredFrequencies.length;

  console.log('Итоговый результат:', result);
  
  return result;
};

const AnalysisModal = ({
  isOpen,
  onClose,
  elementData,
  selectedPlant,
  selectedUnit
}) => {
  const [activeTab, setActiveTab] = useState('spectra');
  const [activeSubTab, setActiveSubTab] = useState('seismic'); // New state for subtabs
  const [spectralData, setSpectralData] = useState(null);
  const [allSpectralData, setAllSpectralData] = useState({}); // New state for all spectrum types
  const [requirementsData, setRequirementsData] = useState(null);
  const [allRequirementsData, setAllRequirementsData] = useState({}); // New state for all requirements
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAxis, setSelectedAxis] = useState('x'); // New state for axis selection
  const [spectrumType, setSpectrumType] = useState('МРЗ'); // New state for spectrum type
  const [dampingFactor, setDampingFactor] = useState(0.5); // New state for damping factor
  const [dampingInputValue, setDampingInputValue] = useState('0.5'); // Local state for input display
  const [analysisResult, setAnalysisResult] = useState(null);
  const [allAnalysisResults, setAllAnalysisResults] = useState({}); // New state for all analysis results
  const [plotData, setPlotData] = useState(null);
  
  // Natural frequency states
  const [isFrequencyEnabled, setIsFrequencyEnabled] = useState(false);
  const [naturalFrequency, setNaturalFrequency] = useState('');
  const [forceRecalculate, setForceRecalculate] = useState(0); // Force recalculation trigger
  
  // Spectrum selection states
  const [spectrumSelection, setSpectrumSelection] = useState({
    xc_pz: false,    // Спектр ХС ПЗ
    xc_mrz: false,   // Спектр ХС МРЗ
    vc_pz: false,    // Спектр ВС ПЗ
    vc_mrz: false    // Спектр ВС МРЗ
  });

  // Input stress calculation states  
  const [stressInputs, setStressInputs] = useState({
    // Общие характеристики
    sigma_dop: { enabled: false, value: '' },
    hclpf: { enabled: false, value: '' },
    sigma_1: { enabled: false, value: '' },
    sigma_2: { enabled: false, value: '' },
    // Поля для ПЗ
    sigma_1_1_pz: { enabled: false, value: '' },
    sigma_1_2_pz: { enabled: false, value: '' },
    sigma_1_s1_pz: { enabled: false, value: '' },
    sigma_2_s2_pz: { enabled: false, value: '' },
    // Поля для МРЗ
    sigma_1_1_mrz: { enabled: false, value: '' },
    sigma_1_2_mrz: { enabled: false, value: '' },
    sigma_1_s1_mrz: { enabled: false, value: '' },
    sigma_2_s2_mrz: { enabled: false, value: '' }
  });

  const [calculationResults, setCalculationResults] = useState({
    pz: {},
    mrz: {},
    calculationAttempted: false
  });

  // State for K coefficient results
  const [kResults, setKResults] = useState({
    mrz: { k1: null, k2: null, kMin: null, canCalculate: false },
    pz: { k1: null, k2: null, kMin: null, canCalculate: false, seismicCategory: null, coefficients: null },
    calculated: false
  });
  
  const modalRef = useRef(null);
  const chartsCreated = useRef(false); // Track if charts have been created
  const dampingTimerRef = useRef(null); // Timer ref for debouncing
  const frequencyTimerRef = useRef(null); // Timer ref for natural frequency debouncing

  // Reset stress inputs and fetch data when modal opens or element changes
  useEffect(() => {
    if (isOpen && elementData) {
      // Reset stress inputs to default values
      setStressInputs({
        // Общие характеристики
        sigma_dop: { enabled: false, value: '' },
        hclpf: { enabled: false, value: '' },
        sigma_1: { enabled: false, value: '' },
        sigma_2: { enabled: false, value: '' },
        // Поля для ПЗ
        sigma_1_1_pz: { enabled: false, value: '' },
        sigma_1_2_pz: { enabled: false, value: '' },
        sigma_1_s1_pz: { enabled: false, value: '' },
        sigma_2_s2_pz: { enabled: false, value: '' },
        // Поля для МРЗ
        sigma_1_1_mrz: { enabled: false, value: '' },
        sigma_1_2_mrz: { enabled: false, value: '' },
        sigma_1_s1_mrz: { enabled: false, value: '' },
        sigma_2_s2_mrz: { enabled: false, value: '' }
      });
      
      // Clear calculation results when modal opens or element changes
      clearCalculationResults();
      
      fetchAllSpectralData();
      fetchAllRequirementsData(elementData.EK_ID || elementData.ek_id);
      // Small delay to ensure reset is applied before loading from DB
      setTimeout(() => {
        fetchStressInputsFromDatabase();
        fetchCalculationResultsFromDatabase();
        fetchKResultsFromDatabase();
      }, 100);
    }
  }, [isOpen, elementData]);

  // Auto-select available spectrums when data is loaded
  useEffect(() => {
    if (Object.keys(allSpectralData).length > 0 && Object.keys(allRequirementsData).length > 0) {
      const newSelection = { ...spectrumSelection };
      
      // Check ПЗ availability
      const pzSpectralData = allSpectralData?.['ПЗ'];
      const pzRequirementsData = allRequirementsData?.['ПЗ'];
      
      if (pzSpectralData && pzRequirementsData) {
        const hasPzSpectral = (pzSpectralData.pz_x && pzSpectralData.pz_x.length > 0) ||
                             (pzSpectralData.pz_y && pzSpectralData.pz_y.length > 0) ||
                             (pzSpectralData.pz_z && pzSpectralData.pz_z.length > 0);
        
        const hasPzRequirements = (pzRequirementsData.pz_x && pzRequirementsData.pz_x.length > 0) ||
                                 (pzRequirementsData.pz_y && pzRequirementsData.pz_y.length > 0) ||
                                 (pzRequirementsData.pz_z && pzRequirementsData.pz_z.length > 0);
        
        if (hasPzSpectral && hasPzRequirements) {
          newSelection.xc_pz = true;
          newSelection.vc_pz = true;
        }
      }

      // Check МРЗ availability
      const mrzSpectralData = allSpectralData?.['МРЗ'];
      const mrzRequirementsData = allRequirementsData?.['МРЗ'];
      
      if (mrzSpectralData && mrzRequirementsData) {
        const hasMrzSpectral = (mrzSpectralData.mrz_x && mrzSpectralData.mrz_x.length > 0) ||
                              (mrzSpectralData.mrz_y && mrzSpectralData.mrz_y.length > 0) ||
                              (mrzSpectralData.mrz_z && mrzSpectralData.mrz_z.length > 0);
        
        const hasMrzRequirements = (mrzRequirementsData.mrz_x && mrzRequirementsData.mrz_x.length > 0) ||
                                  (mrzRequirementsData.mrz_y && mrzRequirementsData.mrz_y.length > 0) ||
                                  (mrzRequirementsData.mrz_z && mrzRequirementsData.mrz_z.length > 0);
        
        if (hasMrzSpectral && hasMrzRequirements) {
          newSelection.xc_mrz = true;
          newSelection.vc_mrz = true;
        }
      }

      setSpectrumSelection(newSelection);
    }
  }, [allSpectralData, allRequirementsData]);

  // Auto-recalculate when natural frequency changes
  useEffect(() => {
    // Clear previous timer
    if (frequencyTimerRef.current) {
      clearTimeout(frequencyTimerRef.current);
    }

    // Only trigger recalculation if we have data and frequency is enabled
    if (spectralData && requirementsData && isFrequencyEnabled) {
      frequencyTimerRef.current = setTimeout(() => {
        console.log('Auto-recalculating due to natural frequency change...');
        setForceRecalculate(prev => prev + 1);
      }, 500); // 500ms delay
    } else if (!isFrequencyEnabled) {
      // If frequency is disabled, also trigger recalculation to reset to normal calculation
      console.log('Auto-recalculating due to frequency being disabled...');
      setForceRecalculate(prev => prev + 1);
    }

    // Cleanup timer on unmount
    return () => {
      if (frequencyTimerRef.current) {
        clearTimeout(frequencyTimerRef.current);
      }
    };
  }, [naturalFrequency, isFrequencyEnabled, spectralData, requirementsData]);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Create Plotly charts when spectral data is available
  useEffect(() => {
    if (spectralData && spectralData.frequency && spectralData.frequency.length > 0) {
      // Small delay to ensure DOM elements are rendered
      setTimeout(() => {
        if (activeTab === 'spectra') {
          createPlotlyChart();
          chartsCreated.current = true;
        }
      }, 100);
    }
  }, [spectralData, activeTab, selectedAxis, requirementsData, spectrumType, isFrequencyEnabled, naturalFrequency]); // Added natural frequency dependencies

  // Calculate analysis for all available data
  useEffect(() => {
    const newAnalysisResults = {};
    let hasAnyResults = false;

    // Determine natural frequency value for calculations
    const naturalFreq = isFrequencyEnabled && naturalFrequency && !isNaN(parseFloat(naturalFrequency)) 
      ? parseFloat(naturalFrequency) 
      : null;

    // Calculate for each spectrum type that has both requirements and spectral data
    for (const type of ['МРЗ', 'ПЗ']) {
      const reqData = allRequirementsData[type];
      const specData = allSpectralData[type];
      
      if (reqData && specData) {
        // Use natural frequency calculation if natural frequency is enabled
        const result = naturalFreq !== null 
          ? calculateAnalysisWithNaturalFrequency(reqData, specData, naturalFreq)
          : calculateAnalysis(reqData, specData);
          
        if (result) {
          newAnalysisResults[type] = result;
          hasAnyResults = true;
          
          // Save analysis results to database
          if (result.m1 !== undefined && result.m2 !== undefined && elementData) {
            saveAnalysisResults(result.m1, result.m2, type);
          }
        }
      }
    }

    if (hasAnyResults) {
      setAllAnalysisResults(newAnalysisResults);
      // Set current analysis result for backward compatibility
      if (newAnalysisResults[spectrumType]) {
        setAnalysisResult(newAnalysisResults[spectrumType]);
      }
    }

    // Update plot data for current spectrum type
    const currentReqData = allRequirementsData[spectrumType];
    const currentSpecData = allSpectralData[spectrumType];
    
    if (currentReqData && currentSpecData && currentReqData.frequency && currentSpecData.frequency) {
      const interpolated = {};
      const allFrequencies = [...new Set([...currentReqData.frequency, ...currentSpecData.frequency])].sort((a, b) => a - b);
      interpolated.frequency = allFrequencies;
  
      // Helper function to get field value with fallback patterns
      const getFieldValue = (data, prefix, axis) => {
        return data[`${prefix}_${axis}`] || data[`${prefix.toLowerCase()}_${axis}`];
      };
      
      for (const axis of ['x', 'y', 'z']) {
        const reqData = getFieldValue(currentReqData, spectrumType.toLowerCase() === 'мрз' ? 'mrz' : 'pz', axis);
        const charData = getFieldValue(currentSpecData, spectrumType.toLowerCase() === 'мрз' ? 'mrz' : 'pz', axis);
        
        if (reqData && charData) {
          interpolated[`req_${axis}`] = interpolateData(allFrequencies, currentReqData.frequency, reqData);
          interpolated[`char_${axis}`] = interpolateData(allFrequencies, currentSpecData.frequency, charData);
        }
      }
      setPlotData(interpolated);
    }
  }, [allRequirementsData, allSpectralData, spectrumType, elementData, isFrequencyEnabled, naturalFrequency, forceRecalculate]);

  // Reset charts when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      chartsCreated.current = false;
    }
  }, [isOpen, elementData]);

  // Cleanup Plotly charts when component unmounts
  useEffect(() => {
    return () => {
      // Clean up Plotly charts to prevent memory leaks
      try {
        Plotly.purge('main-spectrum-chart');
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, []);

  // Update requirements data when damping factor changes
  useEffect(() => {
    if (elementData && (elementData.EK_ID || elementData.ek_id)) {
      fetchAllRequirementsData(elementData.EK_ID || elementData.ek_id);
    }
  }, [dampingFactor]);

  // Update input value when damping factor changes externally
  useEffect(() => {
    setDampingInputValue(dampingFactor.toString());
  }, [dampingFactor]);

  // Update spectralData when spectrumType changes (for UI display)
  useEffect(() => {
    if (allSpectralData[spectrumType]) {
      setSpectralData(allSpectralData[spectrumType]);
    }
  }, [spectrumType, allSpectralData]);

  // Update requirementsData when spectrumType changes (for UI display)
  useEffect(() => {
    if (allRequirementsData[spectrumType]) {
      setRequirementsData(allRequirementsData[spectrumType]);
    }
  }, [spectrumType, allRequirementsData]);

  const createPlotlyChart = () => {
    if (!plotData && (!spectralData || !spectralData.frequency)) return;

    const dataToPlot = plotData || spectralData;
    const frequency = dataToPlot.frequency;
    
    // Helper function to get field value with fallback patterns
    const getFieldValue = (data, prefix, axis) => {
      return data[`${prefix}_${axis}`] || data[`${prefix.toLowerCase()}_${axis}`];
    };

    // Get data for selected axis based on spectrum type
    let yData, axisName, requirementsYData;
    const spectrumPrefix = spectrumType.toLowerCase() === 'мрз' ? 'mrz' : 'pz';
    const displayPrefix = spectrumType.toUpperCase();
    
    switch (selectedAxis) {
      case 'x':
        yData = getFieldValue(dataToPlot, `char`, 'x') || getFieldValue(dataToPlot, spectrumPrefix, 'x');
        requirementsYData = getFieldValue(dataToPlot, 'req', 'x');
        axisName = `${displayPrefix} X`;
        break;
      case 'y':
        yData = getFieldValue(dataToPlot, `char`, 'y') || getFieldValue(dataToPlot, spectrumPrefix, 'y');
        requirementsYData = getFieldValue(dataToPlot, 'req', 'y');
        axisName = `${displayPrefix} Y`;
        break;
      case 'z':
        yData = getFieldValue(dataToPlot, `char`, 'z') || getFieldValue(dataToPlot, spectrumPrefix, 'z');
        requirementsYData = getFieldValue(dataToPlot, 'req', 'z');
        axisName = `${displayPrefix} Z`;
        break;
      default:
        return;
    }

    if (!yData || yData.length === 0) return;

    // Professional chart configuration optimized for single chart
    const layout = {
      xaxis: { 
        title: {
          text: 'Частота, Гц',
          font: { size: 14, color: '#2c3e50', family: 'Arial, sans-serif' }
        },
        type: 'linear',
        autorange: true,
        showgrid: true,
        gridcolor: '#e1e5e9',
        gridwidth: 1,
        zeroline: false,
        linecolor: '#bdc3c7',
        linewidth: 1,
        tickfont: { size: 12, color: '#34495e', family: 'Arial, sans-serif' },
        mirror: true,
        ticks: 'outside',
        tickcolor: '#bdc3c7'
      },
      yaxis: { 
        title: {
          text: spectrumType === 'МРЗ' ? 'Прискорення, м/с²' : 'Переміщення, м',
          font: { size: 14, color: '#2c3e50', family: 'Arial, sans-serif' }
        },
        type: 'linear',
        autorange: true,
        showgrid: true,
        gridcolor: '#e1e5e9',
        gridwidth: 1,
        zeroline: true,
        zerolinecolor: '#bdc3c7',
        linecolor: '#bdc3c7',
        linewidth: 1,
        tickfont: { size: 12, color: '#34495e', family: 'Arial, sans-serif' },
        mirror: true,
        ticks: 'outside',
        tickcolor: '#bdc3c7'
      },
      margin: { t: 60, r: 80, b: 60, l: 80 },
      autosize: true,
      showlegend: true,
      legend: {
        x: 0.98,
        y: 0.98,
        xanchor: 'right',
        yanchor: 'top',
        bgcolor: 'rgba(255, 255, 255, 0.9)',
        bordercolor: '#bdc3c7',
        borderwidth: 1,
        font: { 
          family: 'Arial, sans-serif',
          size: 12,
          color: '#2c3e50'
        }
      },
      font: { 
        family: 'Arial, sans-serif',
        size: 12,
        color: '#2c3e50'
      },
      plot_bgcolor: '#ffffff',
      paper_bgcolor: '#ffffff'
    };

    // Add green vertical line for natural frequency if enabled
    if (isFrequencyEnabled && naturalFrequency && !isNaN(parseFloat(naturalFrequency))) {
      const freq = parseFloat(naturalFrequency);
      layout.shapes = [{
        type: 'line',
        x0: freq,
        x1: freq,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: {
          color: '#28a745',
          width: 3,
          dash: 'solid'
        }
      }];
      
      layout.annotations = [{
        x: freq,
        y: 0.95,
        yref: 'paper',
        text: `Власна частота: ${freq} Гц`,
        showarrow: false,
        bgcolor: '#28a745',
        bordercolor: '#28a745',
        font: { color: 'white', size: 12 },
        borderwidth: 1,
        borderpad: 4
      }];
    }

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: [
        'pan2d', 'select2d', 'lasso2d', 'autoScale2d', 'toggleSpikelines'
      ],
      toImageButtonOptions: {
        format: 'png',
        filename: `spectrum_chart_${spectrumType.toLowerCase()}_${selectedAxis}`,
        height: 600,
        width: 800,
        scale: 2
      }
    };

    const unitLabel = spectrumType === 'МРЗ' ? 'м/с²' : 'м';
    
    const data = [{
      x: frequency,
      y: yData,
      type: 'scatter',
      mode: 'lines',
      line: { 
        color: '#3498db', 
        width: 2.5,
        shape: 'linear'
      },
      name: 'Властивості',
      hovertemplate: `Частота: %{x:.3f} Гц<br>${spectrumType === 'МРЗ' ? 'Прискорення' : 'Переміщення'}: %{y:.6f} ${unitLabel}<extra></extra>`
    }];

    // Add requirements data if available
    if (requirementsYData && requirementsYData.length > 0) {
      data.push({
        x: frequency,
        y: requirementsYData,
        type: 'scatter',
        mode: 'lines',
        line: {
          color: '#e74c3c', // A contrasting color for requirements
          width: 2.5,
          dash: 'dash' // Dashed line for distinction
        },
        name: 'Вимоги',
        hovertemplate: `Частота: %{x:.3f} Гц<br>${spectrumType === 'МРЗ' ? 'Прискорення' : 'Переміщення'}: %{y:.6f} ${unitLabel}<extra></extra>`
      });
    }

    const element = document.getElementById('main-spectrum-chart');
    if (element) {
      try {
        // Always purge first to ensure clean state
        Plotly.purge('main-spectrum-chart');
        // Then create new plot
        Plotly.newPlot('main-spectrum-chart', data, layout, config)
          .then(() => {
            // Force resize to ensure proper display
            setTimeout(() => {
              Plotly.Plots.resize('main-spectrum-chart');
            }, 100);
          });
      } catch (error) {
        console.warn('Error creating chart:', error);
      }
    }
  };

  const fetchAllSpectralData = async () => {
    if (!elementData || (!elementData.EK_ID && !elementData.ek_id)) return;
    setLoading(true);
    setError(null);
    setPlotData(null);

    try {
      const ekId = elementData.EK_ID || elementData.ek_id;
      if (!ekId) {
        throw new Error('Не вдалося отримати ID елемента');
      }

      const calcType = elementData.CALC_TYPE || elementData.calc_type || 'ДЕТЕРМІНИСТИЧНИЙ';
      const newAllSpectralData = {};

      // Fetch data for both spectrum types
      for (const type of ['МРЗ', 'ПЗ']) {
        try {
          const response = await fetch(
            `http://localhost:8000/api/spectral-data?ek_id=${ekId}&calc_type=${encodeURIComponent(calcType)}&spectrum_type=${encodeURIComponent(type)}`
          );

          if (response.ok) {
            const data = await response.json();
            if (data && data.frequency && data.frequency.length > 0) {
              newAllSpectralData[type] = data;
            }
          }
        } catch (err) {
          console.warn(`Error fetching spectral data for ${type}:`, err);
        }
      }

      setAllSpectralData(newAllSpectralData);
      
      // Set current spectral data for UI
      if (newAllSpectralData[spectrumType]) {
        setSpectralData(newAllSpectralData[spectrumType]);
      } else {
        // If current spectrum type is not available, switch to available one
        const availableType = Object.keys(newAllSpectralData)[0];
        if (availableType) {
          setSpectrumType(availableType);
          setSpectralData(newAllSpectralData[availableType]);
        }
      }

      // Auto-select first available axis based on spectrum type
      const currentData = newAllSpectralData[spectrumType] || newAllSpectralData[Object.keys(newAllSpectralData)[0]];
      if (currentData) {
        const currentSpectrumType = spectrumType in newAllSpectralData ? spectrumType : Object.keys(newAllSpectralData)[0];
        const spectrumPrefix = currentSpectrumType.toLowerCase() === 'мрз' ? 'mrz' : 'pz';
        
        const getFieldValue = (data, prefix, axis) => {
          return data[`${prefix}_${axis}`] || data[`${prefix.toLowerCase()}_${axis}`];
        };
        
        if (getFieldValue(currentData, spectrumPrefix, 'x') && getFieldValue(currentData, spectrumPrefix, 'x').length > 0) {
          setSelectedAxis('x');
        } else if (getFieldValue(currentData, spectrumPrefix, 'y') && getFieldValue(currentData, spectrumPrefix, 'y').length > 0) {
          setSelectedAxis('y');
        } else if (getFieldValue(currentData, spectrumPrefix, 'z') && getFieldValue(currentData, spectrumPrefix, 'z').length > 0) {
          setSelectedAxis('z');
        }
      }

      // Fetch requirements data for all available spectrum types
      await fetchAllRequirementsData(ekId);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching spectral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveAnalysisResults = async (m1, m2, spectrumTypeForSave = spectrumType) => {
    if (!elementData || (!elementData.EK_ID && !elementData.ek_id)) {
      console.warn('Cannot save analysis results: missing element ID');
      return;
    }

    const ekId = elementData.EK_ID || elementData.ek_id;
    
    try {
      console.log('=== Збереження результатів аналізу ===');
      console.log('EK_ID:', ekId);
      console.log('Spectrum Type:', spectrumTypeForSave);
      console.log('M1:', m1);
      console.log('M2:', m2);

      const response = await fetch('http://localhost:8000/api/save-analysis-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ek_id: ekId,
          spectrum_type: spectrumTypeForSave,
          m1: isFinite(m1) ? m1 : null,
          m2: isFinite(m2) ? m2 : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error saving analysis results:', errorData);
        return;
      }

      const result = await response.json();
      console.log('✓ Результати аналізу збережено:', result);
      
    } catch (err) {
      console.error('Error saving analysis results:', err);
    }
  };

  const clearCalculationResults = () => {
    setCalculationResults({ pz: {}, mrz: {}, calculationAttempted: false, missingData: {} });
    setKResults({
      mrz: { k1: null, k2: null, kMin: null, canCalculate: false },
      pz: { k1: null, k2: null, kMin: null, canCalculate: false, seismicCategory: null, coefficients: null },
      calculated: false
    });
  };

  const calculateSigmaAlt = async (onCalculationComplete = null) => {
    if (!elementData || (!elementData.EK_ID && !elementData.ek_id)) {
      console.warn('Cannot calculate sigma alt: missing element ID');
      return;
    }

    const ekId = elementData.EK_ID || elementData.ek_id;
    
    try {
      // First, check what data is missing
      const requirementsResponse = await fetch(`http://localhost:8000/api/check-calculation-requirements?ek_id=${ekId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      let missingData = {};
      if (requirementsResponse.ok) {
        const requirementsResult = await requirementsResponse.json();
  
        if (requirementsResult.success && requirementsResult.requirements) {
          // Extract missing fields information
          missingData = {
            pz: {
              sigma_alt_1: requirementsResult.requirements.pz.sigma_alt_1.missing_fields,
              sigma_alt_2: requirementsResult.requirements.pz.sigma_alt_2.missing_fields
            },
            mrz: {
              sigma_alt_1: requirementsResult.requirements.mrz.sigma_alt_1.missing_fields,
              sigma_alt_2: requirementsResult.requirements.mrz.sigma_alt_2.missing_fields
            }
          };
          console.log('Extracted missing data:', missingData);
        }
      } else {
        console.error('Failed to fetch requirements:', requirementsResponse.status);
      }

      // Then perform the calculation
      const response = await fetch('http://localhost:8000/api/calculate-sigma-alt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ek_id: ekId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error calculating sigma alt:', errorData);
        // Mark calculation as attempted but failed, include missing data info
        const failedState = { pz: {}, mrz: {}, calculationAttempted: true, missingData };
        setCalculationResults(failedState);
        
        // Call the callback even in error case
        if (onCalculationComplete && typeof onCalculationComplete === 'function') {
          onCalculationComplete(failedState);
        }
        return;
      }

      const result = await response.json();
      console.log('Sigma alt calculation result:', result);
      
      if (result.success) {
        console.log('Calculated values:', result.calculated_values);
        
        // Update calculation results state - always mark as attempted
        const newResults = { pz: {}, mrz: {}, calculationAttempted: true, missingData };
        
        // Parse calculated values and group by PZ/MRZ (only if there are any)
        if (result.calculated_values && Object.keys(result.calculated_values).length > 0) {
          Object.entries(result.calculated_values).forEach(([key, value]) => {
            if (key.includes('_PZ')) {
              if (key === 'SIGMA_S_ALT_1_PZ') {
                newResults.pz.sigma_alt_1 = value;
              } else if (key === 'SIGMA_S_ALT_2_PZ') {
                newResults.pz.sigma_alt_2 = value;
              }
            } else if (key.includes('_MRZ')) {
              if (key === 'SIGMA_S_ALT_1_MRZ') {
                newResults.mrz.sigma_alt_1 = value;
              } else if (key === 'SIGMA_S_ALT_2_MRZ') {
                newResults.mrz.sigma_alt_2 = value;
              }
            }
          });
        }
        
        console.log('Setting calculation results with values:', newResults);
        setCalculationResults(newResults);
        
        // Call the callback with actual sigma values if provided
        if (onCalculationComplete && typeof onCalculationComplete === 'function') {
          onCalculationComplete(newResults);
        }
      } else {
        // Mark calculation as attempted but no results, include missing data info
        const noResultsState = { pz: {}, mrz: {}, calculationAttempted: true, missingData };
        console.log('Setting calculation results with no values:', noResultsState);
        setCalculationResults(noResultsState);
        
        // Call the callback even if no results
        if (onCalculationComplete && typeof onCalculationComplete === 'function') {
          onCalculationComplete(noResultsState);
        }
      }
      
    } catch (err) {
      console.error('Error calculating sigma alt:', err);
      // Try to get missing data info even in error case
      try {
        const requirements = await fetchCalculationRequirements(ekId);
        const missingData = requirements ? {
          pz: {
            sigma_alt_1: requirements.pz?.sigma_alt_1?.missing_fields || [],
            sigma_alt_2: requirements.pz?.sigma_alt_2?.missing_fields || []
          },
          mrz: {
            sigma_alt_1: requirements.mrz?.sigma_alt_1?.missing_fields || [],
            sigma_alt_2: requirements.mrz?.sigma_alt_2?.missing_fields || []
          }
        } : {};
        const errorState = { pz: {}, mrz: {}, calculationAttempted: true, missingData };
        setCalculationResults(errorState);
        
        // Call the callback even in error case
        if (onCalculationComplete && typeof onCalculationComplete === 'function') {
          onCalculationComplete(errorState);
        }
      } catch (innerErr) {
        console.error('Error fetching requirements in error handler:', innerErr);
        const finalErrorState = { pz: {}, mrz: {}, calculationAttempted: true };
        setCalculationResults(finalErrorState);
        
        // Call the callback even in final error case
        if (onCalculationComplete && typeof onCalculationComplete === 'function') {
          onCalculationComplete(finalErrorState);
        }
      }
    }
  };

  // Function to save K coefficient results to database
  const saveKResults = async (kResultsData) => {
    if (!elementData || (!elementData.EK_ID && !elementData.ek_id)) {
      console.warn('Cannot save K results: missing element ID');
      return;
    }

    const ekId = elementData.EK_ID || elementData.ek_id;
    
    try {
      console.log('=== Збереження результатів K коефіцієнтів ===');
      console.log('EK_ID:', ekId);
      console.log('K Results:', kResultsData);

      const kData = {
        ek_id: ekId,
        // ПЗ результаты
        k1_pz: kResultsData.pz?.k1 || null,
        // МРЗ результаты  
        k1_mrz: kResultsData.mrz?.k1 || null,
        // Общий флаг что расчет выполнен
        calculated: kResultsData.calculated || false
      };

      const response = await fetch('http://localhost:8000/api/save-k-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(kData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error saving K results:', errorData);
        return;
      }

      const result = await response.json();
      console.log('✓ Результати K коефіцієнтів збережено:', result);
      
    } catch (err) {
      console.error('Error saving K results:', err);
    }
  };

  const saveStressInputs = async (stressInputsData) => {
    if (!elementData || (!elementData.EK_ID && !elementData.ek_id)) {
      console.warn('Cannot save stress inputs: missing element ID');
      return;
    }

    const ekId = elementData.EK_ID || elementData.ek_id;
    
    try {

      // Prepare data for API call - send all fields regardless of enabled state
      const stressData = {
        ek_id: ekId
      };

      // Add all fields - enabled fields get their values, disabled fields get null
      Object.keys(stressInputsData).forEach(key => {
        const field = stressInputsData[key];
        if (field && field.enabled) {
          if (field.value === '' || field.value === null || field.value === undefined) {
            // Send null for empty values to clear database
            stressData[key] = null;
          } else if (!isNaN(parseFloat(field.value))) {
            // Send numeric value
            stressData[key] = parseFloat(field.value);
          } else {
            // Invalid numeric value, send null
            stressData[key] = null;
          }
        } else {
          // Disabled field - send null to clear database
          stressData[key] = null;
        }
      });



      const response = await fetch('http://localhost:8000/api/save-stress-inputs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stressData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error saving stress inputs:', errorData);
        return;
      }

      const result = await response.json();
      
      // Don't clear calculation results automatically - let user decide when to recalculate
      
    } catch (err) {
      console.error('Error saving stress inputs:', err);
    }
  };

  const fetchCalculationRequirements = async (ekId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/check-calculation-requirements?ek_id=${ekId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching calculation requirements:', errorData);
        return null;
      }

      const result = await response.json();
      return result.requirements;
      
    } catch (err) {
      console.error('Error fetching calculation requirements:', err);
      return null;
    }
  };

  // Function to fetch K coefficient results from database
  const fetchKResultsFromDatabase = async () => {
    if (!elementData || (!elementData.EK_ID && !elementData.ek_id)) {
      console.warn('Cannot fetch K results: missing element ID');
      return;
    }

    const ekId = elementData.EK_ID || elementData.ek_id;
    
    try {
      console.log('=== Завантаження результатів K коефіцієнтів ===');
      console.log('EK_ID:', ekId);

      const response = await fetch(`http://localhost:8000/api/get-k-results/${ekId}`);
      
      if (!response.ok) {
        console.warn('No K results found for element:', ekId);
        return;
      }

      const data = await response.json();
      console.log('✓ Результати K коефіцієнтів завантажено:', data);

      const newKResults = {
        pz: {
          k1: data.k1_pz,
          k2: data.k2_pz,
          kMin: data.k_min_pz,
          seismicCategory: data.seismic_category_pz,
          canCalculate: data.k_min_pz !== null,
          coefficients: null // Will be calculated based on seismic category
        },
        mrz: {
          k1: data.k1_mrz,
          k2: data.k2_mrz,
          kMin: data.k_min_mrz,
          canCalculate: data.k_min_mrz !== null
        },
        calculated: data.calculated || false
      };

      setKResults(newKResults);
      
    } catch (err) {
      console.error('Error fetching K results:', err);
    }
  };

  const fetchCalculationResultsFromDatabase = async () => {
    if (!elementData || (!elementData.EK_ID && !elementData.ek_id)) {
      console.warn('Cannot fetch calculation results: missing element ID');
      return;
    }

    const ekId = elementData.EK_ID || elementData.ek_id;
    
    try {
      // Fetch both calculation results and requirements information
      const [resultsResponse, requirements] = await Promise.all([
        fetch(`http://localhost:8000/api/get-calculation-results?ek_id=${ekId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }),
        fetchCalculationRequirements(ekId)
      ]);

      if (!resultsResponse.ok) {
        const errorData = await resultsResponse.json();
        console.error('Error fetching calculation results:', errorData);
        return;
      }

      const result = await resultsResponse.json();
      
      // Initialize results structure
      const newResults = { pz: {}, mrz: {}, calculationAttempted: false, missingData: {} };
      
      // Parse calculated values and group by PZ/MRZ
      if (result.calculated_values && Object.keys(result.calculated_values).length > 0) {
        Object.entries(result.calculated_values).forEach(([key, value]) => {
          if (key.includes('_PZ')) {
            if (key === 'SIGMA_S_ALT_1_PZ') {
              newResults.pz.sigma_alt_1 = value;
            } else if (key === 'SIGMA_S_ALT_2_PZ') {
              newResults.pz.sigma_alt_2 = value;
            }
          } else if (key.includes('_MRZ')) {
            if (key === 'SIGMA_S_ALT_1_MRZ') {
              newResults.mrz.sigma_alt_1 = value;
            } else if (key === 'SIGMA_S_ALT_2_MRZ') {
              newResults.mrz.sigma_alt_2 = value;
            }
          }
        });
        
        // Only show results section if there are actual calculated values
        if (Object.keys(result.calculated_values).length > 0) {
          newResults.calculationAttempted = true;
        }
      }
      
      // Add missing data information from requirements
      if (requirements) {
        newResults.missingData = {
          pz: {
            sigma_alt_1: requirements.pz?.sigma_alt_1?.missing_fields || [],
            sigma_alt_2: requirements.pz?.sigma_alt_2?.missing_fields || []
          },
          mrz: {
            sigma_alt_1: requirements.mrz?.sigma_alt_1?.missing_fields || [],
            sigma_alt_2: requirements.mrz?.sigma_alt_2?.missing_fields || []
          }
        };
      }
      
      setCalculationResults(newResults);
      
    } catch (err) {
      console.error('Error fetching calculation results:', err);
    }
  };

  const fetchStressInputsFromDatabase = async () => {
    if (!elementData || (!elementData.EK_ID && !elementData.ek_id)) {
      console.warn('Cannot fetch stress inputs: missing element ID');
      return;
    }

    const ekId = elementData.EK_ID || elementData.ek_id;
    
    try {

      const response = await fetch(`http://localhost:8000/api/get-stress-inputs?ek_id=${ekId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching stress inputs:', errorData);
        return;
      }

      const result = await response.json();
      
      // Update stress inputs with values from database
      if (result.stress_values) {
        // Start with fresh default values
        const newStressInputs = {
          // Общие характеристики
          sigma_dop: { enabled: false, value: '' },
          hclpf: { enabled: false, value: '' },
          sigma_1: { enabled: false, value: '' },
          sigma_2: { enabled: false, value: '' },
          // Поля для ПЗ
          sigma_1_1_pz: { enabled: false, value: '' },
          sigma_1_2_pz: { enabled: false, value: '' },
          sigma_1_s1_pz: { enabled: false, value: '' },
          sigma_2_s2_pz: { enabled: false, value: '' },
          // Поля для МРЗ
          sigma_1_1_mrz: { enabled: false, value: '' },
          sigma_1_2_mrz: { enabled: false, value: '' },
          sigma_1_s1_mrz: { enabled: false, value: '' },
          sigma_2_s2_mrz: { enabled: false, value: '' }
        };
        
        // Map database values to form fields
        const fieldMapping = {
          'SIGMA_DOP': 'sigma_dop',
          'HCLPF': 'hclpf',
          'SIGMA_1': 'sigma_1',
          'SIGMA_2': 'sigma_2',
          'SIGMA_S_1_PZ': 'sigma_1_1_pz',
          'SIGMA_S_2_PZ': 'sigma_1_2_pz',
          'SIGMA_S_S1_PZ': 'sigma_1_s1_pz',
          'SIGMA_S_S2_PZ': 'sigma_2_s2_pz',
          'SIGMA_S_1_MRZ': 'sigma_1_1_mrz',
          'SIGMA_S_2_MRZ': 'sigma_1_2_mrz',
          'SIGMA_S_S1_MRZ': 'sigma_1_s1_mrz',
          'SIGMA_S_S2_MRZ': 'sigma_2_s2_mrz'
        };

        Object.entries(fieldMapping).forEach(([dbColumn, formField]) => {
          const dbValue = result.stress_values[dbColumn];
          if (dbValue !== null && dbValue !== undefined && dbValue !== '') {
            newStressInputs[formField] = {
              enabled: true,
              value: dbValue.toString()
            };
          }
        });

        setStressInputs(newStressInputs);
      }
      
    } catch (err) {
      console.error('Error fetching stress inputs:', err);
    }
  };

  const fetchAllRequirementsData = async (ekId) => {
    try {
      const newAllRequirementsData = {};

      // Fetch requirements for both spectrum types
      for (const type of ['МРЗ', 'ПЗ']) {
        try {
          console.log(`=== ДЕБАГ GET_SEISM_REQUIREMENTS для ${type} ===`);
          console.log('Входные параметры:');
          console.log('  ek_id:', ekId);
          console.log('  dempf:', dampingFactor);
          console.log('  spectr_earthq_type:', type);
          console.log('  calc_type: ДЕТЕРМІНИСТИЧНИЙ');
          
          const response = await fetch(
            `http://localhost:8000/api/seism-requirements?ek_id=${ekId}&dempf=${dampingFactor}&spectr_earthq_type=${encodeURIComponent(type)}&calc_type=ДЕТЕРМІНИСТИЧНИЙ`
          );

          console.log(`Статус ответа для ${type}:`, response.status, response.statusText);

          if (response.ok) {
            const data = await response.json();
            
            console.log(`Выходные данные процедуры для ${type}:`, data);
            console.log('  frequency:', data?.frequency?.length || 0, 'точек');
            
            const spectrumPrefix = type.toLowerCase() === 'мрз' ? 'mrz' : 'pz';
            const getFieldValue = (data, prefix, axis) => {
              return data[`${prefix}_${axis}`] || data[`${prefix.toLowerCase()}_${axis}`];
            };
            
            console.log('  ' + spectrumPrefix + '_x:', getFieldValue(data, spectrumPrefix, 'x')?.length || 0, 'точек');
            console.log('  ' + spectrumPrefix + '_y:', getFieldValue(data, spectrumPrefix, 'y')?.length || 0, 'точек');
            console.log('  ' + spectrumPrefix + '_z:', getFieldValue(data, spectrumPrefix, 'z')?.length || 0, 'точек');
            
            // Check if we actually have frequency data
            if (data && data.frequency && data.frequency.length > 0) {
              // Check if we have actual data for at least one axis
              const hasRequirementsData = getFieldValue(data, spectrumPrefix, 'x')?.length > 0 || 
                                          getFieldValue(data, spectrumPrefix, 'y')?.length > 0 || 
                                          getFieldValue(data, spectrumPrefix, 'z')?.length > 0;
              
              if (hasRequirementsData) {
                newAllRequirementsData[type] = data;
                console.log(`✓ Данные требований успешно получены для типа спектру: ${type}`);
              } else {
                console.warn(`Відсутні дані для вимог типу спектру: ${type}`);
              }
            } else {
              console.warn(`Дані вимог відсутні для коефіцієнта демпфірування: ${dampingFactor} та типу спектру: ${type}`);
            }
          } else {
            console.warn(`Помилка при отриманні даних вимог для ${type}`);
          }
          
          console.log(`=== КОНЕЦ ДЕБАГА для ${type} ===`);
        } catch (err) {
          console.error(`=== ОШИБКА ПРОЦЕДУРЫ GET_SEISM_REQUIREMENTS для ${type} ===`);
          console.error(`Error fetching requirements data for ${type}:`, err);
        }
      }

      setAllRequirementsData(newAllRequirementsData);
      
      // Set current requirements data for UI
      if (newAllRequirementsData[spectrumType]) {
        setRequirementsData(newAllRequirementsData[spectrumType]);
      }
    } catch (err) {
      console.error('Error fetching all requirements data:', err);
    }
  };

  const handleDampingInputChange = (e) => {
    const inputValue = e.target.value;
    setDampingInputValue(inputValue);

    // Clear previous timer
    if (dampingTimerRef.current) {
      clearTimeout(dampingTimerRef.current);
    }

    // Set new timer to update damping factor after 500ms of no input
    dampingTimerRef.current = setTimeout(() => {
      const numericValue = parseFloat(inputValue);
      if (!isNaN(numericValue) && numericValue > 0) {
        setDampingFactor(numericValue);
      } else {
        // Reset to previous valid value if input is invalid
        setDampingInputValue(dampingFactor.toString());
      }
    }, 1200);
  };

  const handleDampingInputBlur = () => {
    // Clear timer if exists
    if (dampingTimerRef.current) {
      clearTimeout(dampingTimerRef.current);
    }

    // Immediately validate and apply value on blur
    const numericValue = parseFloat(dampingInputValue);
    if (!isNaN(numericValue) && numericValue > 0) {
      setDampingFactor(numericValue);
      setDampingInputValue(numericValue.toString());
    } else {
      // Reset to previous valid value if input is invalid
      setDampingInputValue(dampingFactor.toString());
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dampingTimerRef.current) {
        clearTimeout(dampingTimerRef.current);
      }
    };
  }, []);

  const renderSpectraTab = () => {
    if (loading) {
      return (
        <div className="analysis-loading">
          <div className="spinner"></div>
          <p>Завантаження спектральних даних...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="analysis-error">
          <p>Помилка: {error}</p>
          <button onClick={fetchAllSpectralData} className="retry-button">
            Спробувати ще раз
          </button>
        </div>
      );
    }

    if (!spectralData || !spectralData.frequency || spectralData.frequency.length === 0) {
      return (
        <div className="analysis-no-data">
          <p>Спектральні дані відсутні для цього елемента</p>
          <p>Імпортуйте характеристики, щоб переглянути графіки</p>
        </div>
      );
    }

    // Helper function to get field value with fallback patterns
    const getFieldValue = (data, prefix, axis) => {
      return data[`${prefix}_${axis}`] || data[`${prefix.toLowerCase()}_${axis}`];
    };
    
    // Check which axes have data based on spectrum type
    const spectrumPrefix = spectrumType.toLowerCase() === 'мрз' ? 'mrz' : 'pz';
    const hasXData = getFieldValue(spectralData, spectrumPrefix, 'x')?.length > 0;
    const hasYData = getFieldValue(spectralData, spectrumPrefix, 'y')?.length > 0;
    const hasZData = getFieldValue(spectralData, spectrumPrefix, 'z')?.length > 0;

    return (
      <div className="spectra-container">
        <div className="unified-selector">
          <div className="spectrum-type-buttons">
            <button 
              className={`spectrum-type-button ${spectrumType === 'МРЗ' ? 'active' : ''}`}
              onClick={() => setSpectrumType('МРЗ')}
            >
              МРЗ
            </button>
            <button 
              className={`spectrum-type-button ${spectrumType === 'ПЗ' ? 'active' : ''}`}
              onClick={() => setSpectrumType('ПЗ')}
            >
              ПЗ
            </button>
          </div>
          
          <div className="axis-buttons">
            {hasXData && (
              <button 
                className={`axis-button ${selectedAxis === 'x' ? 'active' : ''}`}
                onClick={() => setSelectedAxis('x')}
              >
                {spectrumType} X
              </button>
            )}
            {hasYData && (
              <button 
                className={`axis-button ${selectedAxis === 'y' ? 'active' : ''}`}
                onClick={() => setSelectedAxis('y')}
              >
                {spectrumType} Y
              </button>
            )}
            {hasZData && (
              <button 
                className={`axis-button ${selectedAxis === 'z' ? 'active' : ''}`}
                onClick={() => setSelectedAxis('z')}
              >
                {spectrumType} Z
              </button>
            )}
          </div>
        </div>
        
        <div className="single-chart-container">
          <div id="main-spectrum-chart" className="main-plotly-chart"></div>
        </div>
        
        <div className="damping-controls">
          <div className="damping-input-group">
            <label htmlFor="damping-factor">Коефіцієнт демпфірування:</label>
            <input
              id="damping-factor"
              type="number"
              step="0.01"
              value={dampingInputValue}
              onChange={handleDampingInputChange}
              onBlur={handleDampingInputBlur}
              className="damping-input"
              lang="en"
            />
          </div>
        </div>
        
        <div className="spectral-info">
          <div className="info-item">
            <span className="info-label">Тип спектру:</span>
            <span className="info-value">{spectrumType}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Кількість точок частоти:</span>
            <span className="info-value">{spectralData.frequency.length}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Діапазон частот:</span>
            <span className="info-value">
              {Math.min(...spectralData.frequency).toFixed(2)} - {Math.max(...spectralData.frequency).toFixed(2)} Гц
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Поточна вісь:</span>
            <span className="info-value">
              {selectedAxis === 'x' ? `${spectrumType} X` : selectedAxis === 'y' ? `${spectrumType} Y` : `${spectrumType} Z`}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'spectra':
        return renderSpectraTab();
      case 'analysis':
        return renderAnalysisTab();
      case 'calculation':
        return renderCalculationTab();
      default:
        return null;
    }
  };

  const renderAnalysisTab = () => {
    // Use filtered analysis results if natural frequency is enabled
    const currentResults = Object.keys(allAnalysisResults).length > 0 ? allAnalysisResults : { [spectrumType]: analysisResult };
    return <CalculationAnalysisTab analysisResult={analysisResult} allAnalysisResults={currentResults} />;
  };

  const renderCalculationTab = () => {
    switch (activeSubTab) {
      case 'seismic':
        return (
                      <SeismicAnalysisTab
              isFrequencyEnabled={isFrequencyEnabled}
              setIsFrequencyEnabled={setIsFrequencyEnabled}
              naturalFrequency={naturalFrequency}
              setNaturalFrequency={setNaturalFrequency}
              allSpectralData={allSpectralData}
              allRequirementsData={allRequirementsData}
              spectrumSelection={spectrumSelection}
              setSpectrumSelection={setSpectrumSelection}
              allAnalysisResults={allAnalysisResults}
                          stressInputs={stressInputs}
            setStressInputs={setStressInputs}
                        saveStressInputs={saveStressInputs}
          calculateSigmaAlt={calculateSigmaAlt}
          calculationResults={calculationResults}
          clearCalculationResults={clearCalculationResults}
          fetchCalculationResults={fetchCalculationResultsFromDatabase}
          kResults={kResults}
          setKResults={setKResults}
          saveKResults={saveKResults}
          elementData={elementData}
            />
        );
      case 'pressure':
        return (
          <LoadAnalysisTab
            isFrequencyEnabled={isFrequencyEnabled}
            setIsFrequencyEnabled={setIsFrequencyEnabled}
            naturalFrequency={naturalFrequency}
            setNaturalFrequency={setNaturalFrequency}
            allSpectralData={allSpectralData}
            allRequirementsData={allRequirementsData}
            allAnalysisResults={allAnalysisResults}
            calculationResults={calculationResults}
            kResults={kResults}
            elementData={elementData}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="analysis-modal-overlay">
      <div className="analysis-modal" ref={modalRef}>
        <div className="analysis-modal-header">
          <div className="modal-title-section">
            <h2>Аналіз спектрів</h2>
            {elementData && (
              <div className="element-info">
                <div className="element-main-info">
                  <div className="element-name">
                    <strong>
                      {elementData.NAME || elementData.name || 'Невідомий елемент'}
                      {(elementData.EK_ID || elementData.ek_id) && (
                        <span className="ek-id-label"> (ID: {elementData.EK_ID || elementData.ek_id})</span>
                      )}
                    </strong>
                  </div>
                  <div className="element-inline-details">
                    {(elementData.PTYPE_TXT || elementData.ptype_txt || elementData.Ptype_Txt) && (
                      <span className="inline-detail">
                        <strong>Тип:</strong> {elementData.PTYPE_TXT || elementData.ptype_txt || elementData.Ptype_Txt}
                      </span>
                    )}
                    <span className="inline-detail">
                      <strong>Розрахунок:</strong> {elementData.CALC_TYPE || elementData.calc_type || 'ДЕТЕРМІНИСТИЧНИЙ'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button className="modal-close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="analysis-modal-tabs">
          <button 
            className={`tab-button ${activeTab === 'spectra' ? 'active' : ''}`}
            onClick={() => setActiveTab('spectra')}
          >
            Спектри
          </button>
          <button 
            className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            Аналіз спектрів
          </button>
          <button 
            className={`tab-button ${activeTab === 'calculation' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculation')}
          >
            Розрахунковий аналіз
          </button>
        </div>

        {/* Subtabs for Розрахунковий аналіз */}
        {activeTab === 'calculation' && (
          <div className="analysis-modal-subtabs">
            <button 
              className={`subtab-button ${activeSubTab === 'seismic' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('seismic')}
            >
              Аналіз зміни сейсмічних вимог
            </button>
            <button 
              className={`subtab-button ${activeSubTab === 'pressure' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('pressure')}
            >
              Аналіз зміни навантаження
            </button>
          </div>
        )}

        <div className="analysis-modal-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal; 