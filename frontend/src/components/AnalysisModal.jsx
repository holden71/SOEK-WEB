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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAxis, setSelectedAxis] = useState('x'); // New state for axis selection
  const modalRef = useRef(null);
  const chartsCreated = useRef(false); // Track if charts have been created

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
  }, [spectralData, activeTab, selectedAxis]); // Added selectedAxis dependency

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

  const createPlotlyChart = () => {
    if (!spectralData || !spectralData.frequency) return;
    
    const frequency = spectralData.frequency;
    
    // Get data for selected axis
    let yData, color, axisName;
    switch (selectedAxis) {
      case 'x':
        yData = spectralData.mrz_x;
        color = '#3498db';
        axisName = 'МРЗ X';
        break;
      case 'y':
        yData = spectralData.mrz_y;
        color = '#27ae60';
        axisName = 'МРЗ Y';
        break;
      case 'z':
        yData = spectralData.mrz_z;
        color = '#e74c3c';
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
      margin: { t: 20, r: 20, b: 60, l: 80 },
      autosize: true,
      showlegend: false,
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
        color: color, 
        width: 2.5,
        shape: 'linear'
      },
      name: axisName,
      hovertemplate: 'Частота: %{x:.3f} Гц<br>Прискорення: %{y:.6f} м/с²<extra></extra>'
    }];

    const element = document.getElementById('main-spectrum-chart');
    if (element) {
      try {
        // Always purge first to ensure clean state
        Plotly.purge('main-spectrum-chart');
        // Then create new plot
        Plotly.newPlot('main-spectrum-chart', data, layout, config);
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
    } catch (err) {
      setError(err.message);
      console.error('Error fetching spectral data:', err);
    } finally {
      setLoading(false);
    }
  };

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