import React from 'react';
import '../styles/CalculationAnalysisTab.css';

const CalculationAnalysisTab = ({ analysisResult }) => {
  if (!analysisResult) {
    return (
      <div className="calculation-tab-content">
        <p className="info-message">Для розрахунку необхідно завантажити дані випробувань та вимог.</p>
      </div>
    );
  }

  const { m_x_max, m_y_max, m_z_max, m1, m2, numberOfPoints } = analysisResult;

  const formatValue = (value) => {
    if (value === Infinity) {
      return '∞';
    }
    return value.toFixed(4);
  };

  return (
    <div className="calculation-tab-content">
      <div className="analysis-section">
        <h4 className="section-title">Максимальні відношення по осях (m)</h4>
        <div className="results-grid">
          <div className="result-item">
            <span className="axis-label">Вісь X</span>
            <span className="axis-value">{formatValue(m_x_max)}</span>
          </div>
          <div className="result-item">
            <span className="axis-label">Вісь Y</span>
            <span className="axis-value">{formatValue(m_y_max)}</span>
          </div>
          <div className="result-item">
            <span className="axis-label">Вісь Z</span>
            <span className="axis-value">{formatValue(m_z_max)}</span>
          </div>
        </div>
      </div>

      <div className="analysis-section">
        <h4 className="section-title">Критерії сейсмостійкості</h4>
        <div className="criteria-grid">
          <div className="criteria-item">
            <div className="criteria-label">
              <span>m<sub>1</sub> = max(m<sub>x</sub>, m<sub>y</sub>, m<sub>z</sub>)</span>
              <span className="criteria-description">Приріст вимог із сейсмостійкості</span>
            </div>
            <span className="criteria-value">{formatValue(m1)}</span>
          </div>
          <div className="criteria-item">
            <div className="criteria-label">
              <span>m<sub>2</sub> = √(m<sub>x</sub>² + m<sub>y</sub>² + m<sub>z</sub>²)</span>
              <span className="criteria-description">Приріст вимог із сейсмостійкості, що враховує квадратичне усереднення по осях</span>
            </div>
            <span className="criteria-value">{formatValue(m2)}</span>
          </div>
        </div>
      </div>
      <div className="analysis-section calculation-points">
        <p>Розрахунок виконано по <strong>{numberOfPoints}</strong> точкам</p>
      </div>
    </div>
  );
};

export default CalculationAnalysisTab; 