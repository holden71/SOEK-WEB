import React, { useState, useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import '../styles/AnalysisModal.css';

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
  const [dampingFactor, setDampingFactor] = useState(0.5); // New state for damping factor
  const [dampingInputValue, setDampingInputValue] = useState('0.5'); // Local state for input display
  const modalRef = useRef(null);
  const chartsCreated = useRef(false); // Track if charts have been created
  const dampingTimerRef = useRef(null); // Timer ref for debouncing

  // Fetch spectral data when modal opens
  useEffect(() => {
    if (isOpen && elementData) {
      fetchSpectralData();
    }
  }, [isOpen, elementData]);

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
  }, [spectralData, activeTab, selectedAxis, requirementsData]); // Added requirementsData dependency

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
      fetchRequirementsData(elementData.EK_ID || elementData.ek_id);
    }
  }, [dampingFactor]);

  // Update input value when damping factor changes externally
  useEffect(() => {
    setDampingInputValue(dampingFactor.toString());
  }, [dampingFactor]);

  const createPlotlyChart = () => {
    if (!spectralData || !spectralData.frequency) return;
    
    const frequency = spectralData.frequency;
    
    // Get data for selected axis
    let yData, axisName;
    switch (selectedAxis) {
      case 'x':
        yData = spectralData.mrz_x;
        axisName = 'МРЗ X';
        break;
      case 'y':
        yData = spectralData.mrz_y;
        axisName = 'МРЗ Y';
        break;
      case 'z':
        yData = spectralData.mrz_z;
        axisName = 'МРЗ Z';
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
          text: 'Прискорення, м/с²',
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
        filename: `spectrum_chart_${selectedAxis}`,
        height: 600,
        width: 800,
        scale: 2
      }
    };

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
      hovertemplate: 'Частота: %{x:.3f} Гц<br>Прискорення: %{y:.6f} м/с²<extra></extra>'
    }];

    // Add requirements data if available
    if (requirementsData && requirementsData.frequency && requirementsData.frequency.length > 0) {
      let requirementsYData;
      switch (selectedAxis) {
        case 'x':
          requirementsYData = requirementsData.mrz_x;
          break;
        case 'y':
          requirementsYData = requirementsData.mrz_y;
          break;
        case 'z':
          requirementsYData = requirementsData.mrz_z;
          break;
        default:
          requirementsYData = null;
      }

      if (requirementsYData && requirementsYData.length > 0) {
        data.push({
          x: requirementsData.frequency,
          y: requirementsYData,
          type: 'scatter',
          mode: 'lines',
          line: { 
            color: '#e74c3c', 
            width: 2.5,
            shape: 'linear'
          },
          name: 'Вимоги',
          hovertemplate: 'Частота: %{x:.3f} Гц<br>Прискорення: %{y:.6f} м/с²<extra></extra>'
        });
      }
    }

    const element = document.getElementById('main-spectrum-chart');
    if (element) {
      try {
        // Always purge first to ensure clean state
        Plotly.purge('main-spectrum-chart');
        // Then create new plot
        Plotly.newPlot('main-spectrum-chart', data, layout, config);
        // Force resize to ensure proper display
        setTimeout(() => {
          Plotly.Plots.resize('main-spectrum-chart');
        }, 100);
      } catch (error) {
        console.warn('Error creating chart:', error);
      }
    }
  };

  const fetchSpectralData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const ekId = elementData.EK_ID || elementData.ek_id;
      if (!ekId) {
        throw new Error('Не вдалося отримати ID елемента');
      }

      // Get calculation type from element data or use default
      const calcType = elementData.CALC_TYPE || elementData.calc_type || 'ДЕТЕРМІНИСТИЧНИЙ';

      // Fetch MRZ spectral data for the specified calculation type
      const response = await fetch(
        `http://localhost:8000/api/spectral-data?ek_id=${ekId}&calc_type=${encodeURIComponent(calcType)}&spectrum_type=МРЗ`
      );

      if (!response.ok) {
        throw new Error('Помилка при отриманні спектральних даних');
      }

      const data = await response.json();
      setSpectralData(data);
      
      // Auto-select first available axis
      if (data) {
        if (data.mrz_x && data.mrz_x.length > 0) {
          setSelectedAxis('x');
        } else if (data.mrz_y && data.mrz_y.length > 0) {
          setSelectedAxis('y');
        } else if (data.mrz_z && data.mrz_z.length > 0) {
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
    try {
      console.log('=== ДЕБАГ GET_SEISM_REQUIREMENTS ===');
      console.log('Входные параметры:');
      console.log('  ek_id:', ekId);
      console.log('  dempf:', dampingFactor);
      console.log('  spectr_earthq_type: МРЗ');
      console.log('  calc_type: ДЕТЕРМІНИСТИЧНИЙ');
      
      // Call the GET_SEISM_REQUIREMENTS procedure
      const response = await fetch(
        `http://localhost:8000/api/seism-requirements?ek_id=${ekId}&dempf=${dampingFactor}&spectr_earthq_type=МРЗ&calc_type=ДЕТЕРМІНИСТИЧНИЙ`
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
      console.log('  mrz_x:', data?.mrz_x?.length || 0, 'точек');
      console.log('  mrz_y:', data?.mrz_y?.length || 0, 'точек');
      console.log('  mrz_z:', data?.mrz_z?.length || 0, 'точек');
      
      // Check if we actually have frequency data
      if (!data || !data.frequency || data.frequency.length === 0) {
        console.warn('Дані вимог відсутні для коефіцієнта демпфірування:', dampingFactor);
        console.log('=== КОНЕЦ ДЕБАГА (НЕТ FREQUENCY) ===');
        setRequirementsData(null);
        return;
      }
      
      // Check if we have actual acceleration data for at least one axis
      const hasRequirementsData = (data.mrz_x && data.mrz_x.length > 0) || 
                                  (data.mrz_y && data.mrz_y.length > 0) || 
                                  (data.mrz_z && data.mrz_z.length > 0);
      
      console.log('Есть данные ускорения:', hasRequirementsData);
      
      if (!hasRequirementsData) {
        console.warn('Відсутні дані прискорення для вимог');
        console.log('=== КОНЕЦ ДЕБАГА (НЕТ ДАННЫХ УСКОРЕНИЯ) ===');
        setRequirementsData(null);
        return;
      }
      
      console.log('✓ Данные требований успешно получены');
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

    // Check which axes have data
    const hasXData = spectralData.mrz_x && spectralData.mrz_x.length > 0;
    const hasYData = spectralData.mrz_y && spectralData.mrz_y.length > 0;
    const hasZData = spectralData.mrz_z && spectralData.mrz_z.length > 0;

    return (
      <div className="spectra-container">
        <div className="axis-selector">
          <div className="axis-buttons">
            {hasXData && (
              <button 
                className={`axis-button ${selectedAxis === 'x' ? 'active' : ''}`}
                onClick={() => setSelectedAxis('x')}
              >
                МРЗ X
              </button>
            )}
            {hasYData && (
              <button 
                className={`axis-button ${selectedAxis === 'y' ? 'active' : ''}`}
                onClick={() => setSelectedAxis('y')}
              >
                МРЗ Y
              </button>
            )}
            {hasZData && (
              <button 
                className={`axis-button ${selectedAxis === 'z' ? 'active' : ''}`}
                onClick={() => setSelectedAxis('z')}
              >
                МРЗ Z
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
              {selectedAxis === 'x' ? 'МРЗ X' : selectedAxis === 'y' ? 'МРЗ Y' : 'МРЗ Z'}
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
      case 'statistics':
        return (
          <div className="statistics-container">
            <p>Статистичний аналіз (в розробці)</p>
          </div>
        );
      case 'comparison':
        return (
          <div className="comparison-container">
            <p>Порівняння з іншими елементами (в розробці)</p>
          </div>
        );
      default:
        return renderSpectraTab();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="analysis-modal-overlay">
      <div className="analysis-modal" ref={modalRef}>
        <div className="analysis-modal-header">
          <div className="modal-title-section">
            <h2>Аналіз спектрів МРЗ</h2>
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
            Спектри МРЗ
          </button>
          <button 
            className={`tab-button ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            Статистика
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