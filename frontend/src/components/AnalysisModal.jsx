import React, { useState, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import CalculationAnalysisTab from './CalculationAnalysisTab';
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

const AnalysisModal = ({
  isOpen,
  onClose,
  elementData,
  selectedPlant,
  selectedUnit
}) => {
  const [activeTab, setActiveTab] = useState('spectra');
  const [spectralData, setSpectralData] = useState(null);
  const [requirementsData, setRequirementsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAxis, setSelectedAxis] = useState('x'); // New state for axis selection
  const [spectrumType, setSpectrumType] = useState('МРЗ'); // New state for spectrum type
  const [dampingFactor, setDampingFactor] = useState(0.5); // New state for damping factor
  const [dampingInputValue, setDampingInputValue] = useState('0.5'); // Local state for input display
  const [analysisResult, setAnalysisResult] = useState(null);
  const [plotData, setPlotData] = useState(null);
  const modalRef = useRef(null);
  const chartsCreated = useRef(false); // Track if charts have been created
  const dampingTimerRef = useRef(null); // Timer ref for debouncing

  // Fetch spectral data when modal opens or spectrum type changes
  useEffect(() => {
    if (isOpen && elementData) {
      fetchSpectralData();
    }
  }, [isOpen, elementData, spectrumType]);

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
  }, [spectralData, activeTab, selectedAxis, requirementsData, spectrumType]); // Added spectrumType dependency

  useEffect(() => {
    if (requirementsData && spectralData) {
      const result = calculateAnalysis(requirementsData, spectralData);
      setAnalysisResult(result);

      if (requirementsData.frequency && spectralData.frequency) {
        const interpolated = {};
        const allFrequencies = [...new Set([...requirementsData.frequency, ...spectralData.frequency])].sort((a, b) => a - b);
        interpolated.frequency = allFrequencies;
    
        // Helper function to get field value with fallback patterns
        const getFieldValue = (data, prefix, axis) => {
          return data[`${prefix}_${axis}`] || data[`${prefix.toLowerCase()}_${axis}`];
        };
        
        for (const axis of ['x', 'y', 'z']) {
          const reqData = getFieldValue(requirementsData, spectrumType.toLowerCase() === 'мрз' ? 'mrz' : 'pz', axis);
          const charData = getFieldValue(spectralData, spectrumType.toLowerCase() === 'мрз' ? 'mrz' : 'pz', axis);
          
          if (reqData && charData) {
            interpolated[`req_${axis}`] = interpolateData(allFrequencies, requirementsData.frequency, reqData);
            interpolated[`char_${axis}`] = interpolateData(allFrequencies, spectralData.frequency, charData);
          }
        }
        setPlotData(interpolated);
      }
    }
  }, [requirementsData, spectralData, spectrumType]);

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

  // Update requirements data when damping factor or spectrum type changes
  useEffect(() => {
    if (elementData && (elementData.EK_ID || elementData.ek_id)) {
      fetchRequirementsData(elementData.EK_ID || elementData.ek_id);
    }
  }, [dampingFactor, spectrumType]);

  // Update input value when damping factor changes externally
  useEffect(() => {
    setDampingInputValue(dampingFactor.toString());
  }, [dampingFactor]);

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

  const fetchSpectralData = async () => {
    if (!elementData || (!elementData.EK_ID && !elementData.ek_id)) return;
    setLoading(true);
    setError(null);
    setPlotData(null); // Reset plot data on new fetch

    try {
      const ekId = elementData.EK_ID || elementData.ek_id;
      if (!ekId) {
        throw new Error('Не вдалося отримати ID елемента');
      }

      // Get calculation type from element data or use default
      const calcType = elementData.CALC_TYPE || elementData.calc_type || 'ДЕТЕРМІНИСТИЧНИЙ';

      // Fetch spectral data for the specified calculation type and spectrum type
      const response = await fetch(
        `http://localhost:8000/api/spectral-data?ek_id=${ekId}&calc_type=${encodeURIComponent(calcType)}&spectrum_type=${encodeURIComponent(spectrumType)}`
      );

      if (!response.ok) {
        throw new Error('Помилка при отриманні спектральних даних');
      }

      const data = await response.json();
      setSpectralData(data);
      
      // Helper function to get field value with fallback patterns
      const getFieldValue = (data, prefix, axis) => {
        return data[`${prefix}_${axis}`] || data[`${prefix.toLowerCase()}_${axis}`];
      };
      
      // Auto-select first available axis based on spectrum type
      if (data) {
        const spectrumPrefix = spectrumType.toLowerCase() === 'мрз' ? 'mrz' : 'pz';
        
        if (getFieldValue(data, spectrumPrefix, 'x') && getFieldValue(data, spectrumPrefix, 'x').length > 0) {
          setSelectedAxis('x');
        } else if (getFieldValue(data, spectrumPrefix, 'y') && getFieldValue(data, spectrumPrefix, 'y').length > 0) {
          setSelectedAxis('y');
        } else if (getFieldValue(data, spectrumPrefix, 'z') && getFieldValue(data, spectrumPrefix, 'z').length > 0) {
          setSelectedAxis('z');
        }
      }

      // Fetch requirements data
      await fetchRequirementsData(ekId);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching spectral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequirementsData = async (ekId) => {
    setLoading(true);
    setError(null);
    setPlotData(null); // Reset plot data on new fetch

    try {
      console.log('=== ДЕБАГ GET_SEISM_REQUIREMENTS ===');
      console.log('Входные параметры:');
      console.log('  ek_id:', ekId);
      console.log('  dempf:', dampingFactor);
      console.log('  spectr_earthq_type:', spectrumType);
      console.log('  calc_type: ДЕТЕРМІНИСТИЧНИЙ');
      
      // Call the GET_SEISM_REQUIREMENTS procedure with spectrum type
      const response = await fetch(
        `http://localhost:8000/api/seism-requirements?ek_id=${ekId}&dempf=${dampingFactor}&spectr_earthq_type=${encodeURIComponent(spectrumType)}&calc_type=ДЕТЕРМІНИСТИЧНИЙ`
      );

      console.log('Статус ответа:', response.status, response.statusText);

      if (!response.ok) {
        console.warn('Помилка при отриманні даних вимог');
        console.log('=== КОНЕЦ ДЕБАГА (ОШИБКА) ===');
        setRequirementsData(null);
        return;
      }

      const data = await response.json();
      
      console.log('Выходные данные процедуры:');
      console.log('  data:', data);
      console.log('  frequency:', data?.frequency?.length || 0, 'точек');
      
      // Helper function to get field value with fallback patterns
      const getFieldValue = (data, prefix, axis) => {
        return data[`${prefix}_${axis}`] || data[`${prefix.toLowerCase()}_${axis}`];
      };
      
      const spectrumPrefix = spectrumType.toLowerCase() === 'мрз' ? 'mrz' : 'pz';
      console.log('  ' + spectrumPrefix + '_x:', getFieldValue(data, spectrumPrefix, 'x')?.length || 0, 'точек');
      console.log('  ' + spectrumPrefix + '_y:', getFieldValue(data, spectrumPrefix, 'y')?.length || 0, 'точек');
      console.log('  ' + spectrumPrefix + '_z:', getFieldValue(data, spectrumPrefix, 'z')?.length || 0, 'точек');
      
      // Check if we actually have frequency data
      if (!data || !data.frequency || data.frequency.length === 0) {
        console.warn('Дані вимог відсутні для коефіцієнта демпфірування:', dampingFactor, 'та типу спектру:', spectrumType);
        console.log('=== КОНЕЦ ДЕБАГА (НЕТ FREQUENCY) ===');
        setRequirementsData(null);
        return;
      }
      
      // Check if we have actual data for at least one axis
      const hasRequirementsData = getFieldValue(data, spectrumPrefix, 'x')?.length > 0 || 
                                  getFieldValue(data, spectrumPrefix, 'y')?.length > 0 || 
                                  getFieldValue(data, spectrumPrefix, 'z')?.length > 0;
      
      console.log('Есть данные:', hasRequirementsData);
      
      if (!hasRequirementsData) {
        console.warn('Відсутні дані для вимог типу спектру:', spectrumType);
        console.log('=== КОНЕЦ ДЕБАГА (НЕТ ДАННЫХ) ===');
        setRequirementsData(null);
        return;
      }
      
      console.log('✓ Данные требований успешно получены для типа спектру:', spectrumType);
      console.log('=== КОНЕЦ ДЕБАГА (УСПЕХ) ===');
      setRequirementsData(data);
    } catch (err) {
      console.error('=== ОШИБКА ПРОЦЕДУРЫ GET_SEISM_REQUIREMENTS ===');
      console.error('Error fetching requirements data:', err);
      console.log('=== КОНЕЦ ДЕБАГА (ИСКЛЮЧЕНИЕ) ===');
      setRequirementsData(null);
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
          <button onClick={fetchSpectralData} className="retry-button">
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
      case 'calculation':
        return <CalculationAnalysisTab analysisResult={analysisResult} />;
      case 'comparison':
        return (
          <div className="comparison-container">
            <p>Порівняння з іншими елементами (в розробці)</p>
          </div>
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
            <h2>Аналіз спектрів {spectrumType}</h2>
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
            Спектри {spectrumType}
          </button>
          <button 
            className={`tab-button ${activeTab === 'calculation' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculation')}
          >
            Розрахунковий аналіз
          </button>
          <button 
            className={`tab-button ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
          >
            Порівняння
          </button>
        </div>

        <div className="analysis-modal-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal; 