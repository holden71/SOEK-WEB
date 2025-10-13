import React from 'react';
import '../styles/CalculationAnalysisTab.css';

const CalculationAnalysisTab = ({ analysisResult, allAnalysisResults = {} }) => {
  const hasAnyResults = Object.keys(allAnalysisResults).length > 0 || analysisResult;

  if (!hasAnyResults) {
    return (
      <div className="calculation-tab-content">
        <p className="info-message">Для розрахунку необхідно завантажити дані випробувань та вимог.</p>
      </div>
    );
  }

  const formatValue = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '—';
    }
    if (value === Infinity) {
      return '∞';
    }
    return value.toFixed(4);
  };

  // Get results for МРЗ and ПЗ
  const mrzResult = allAnalysisResults['МРЗ'] || (analysisResult && Object.keys(allAnalysisResults).length === 0 ? analysisResult : null);
  const pzResult = allAnalysisResults['ПЗ'];

  return (
    <div className="calculation-tab-content">
      <div className="summary-section">
        <h3 className="summary-title">Попередні розрахунки</h3>
        
        <div className="summary-table-container">
          <table className="summary-table">
            <thead>
              <tr>
                <th className="parameter-header">Параметр</th>
                <th className="spectrum-header pz-header">ПЗ</th>
                <th className="spectrum-header mrz-header">МРЗ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="main-criteria-row">
                <td className="parameter-name">
                  <strong>m₁</strong>
                  <span className="parameter-description">max(m<sub>x</sub>, m<sub>y</sub>, m<sub>z</sub>)</span>
                </td>
                <td className="value-cell">{formatValue(pzResult?.m1)}</td>
                <td className="value-cell">{formatValue(mrzResult?.m1)}</td>
              </tr>
              
              <tr className="main-criteria-row">
                <td className="parameter-name">
                  <strong>m₂</strong>
                  <span className="parameter-description">√(m<sub>x</sub>² + m<sub>y</sub>² + m<sub>z</sub>²)</span>
                </td>
                <td className="value-cell">{formatValue(pzResult?.m2)}</td>
                <td className="value-cell">{formatValue(mrzResult?.m2)}</td>
              </tr>
              
              <tr className="divider-row">
                <td colSpan="3"><hr /></td>
              </tr>
              
              <tr>
                <td className="parameter-name">
                  <strong>m<sub>x</sub></strong>
                  <span className="parameter-description">по осі X</span>
                </td>
                <td className="value-cell">{formatValue(pzResult?.m_x_max)}</td>
                <td className="value-cell">{formatValue(mrzResult?.m_x_max)}</td>
              </tr>
              
              <tr>
                <td className="parameter-name">
                  <strong>m<sub>y</sub></strong>
                  <span className="parameter-description">по осі Y</span>
                </td>
                <td className="value-cell">{formatValue(pzResult?.m_y_max)}</td>
                <td className="value-cell">{formatValue(mrzResult?.m_y_max)}</td>
              </tr>
              
              <tr>
                <td className="parameter-name">
                  <strong>m<sub>z</sub></strong>
                  <span className="parameter-description">по осі Z</span>
                </td>
                <td className="value-cell">{formatValue(pzResult?.m_z_max)}</td>
                <td className="value-cell">{formatValue(mrzResult?.m_z_max)}</td>
              </tr>
              
              <tr className="divider-row">
                <td colSpan="3"><hr /></td>
              </tr>
              
              <tr className="info-row">
                <td className="parameter-name">
                  <strong>Точки розрахунку</strong>
                  <span className="parameter-description">кількість</span>
                </td>
                <td className="value-cell info-value">{pzResult?.numberOfPoints || '—'}</td>
                <td className="value-cell info-value">{mrzResult?.numberOfPoints || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Status indicators */}
        <div className="status-indicators">
          <div className="status-item">
            <span className={`status-dot ${pzResult ? 'available' : 'unavailable'}`}></span>
            <span className={pzResult ? 'status-available' : 'status-unavailable'}>
              ПЗ: {pzResult ? 'Доступно' : 'Недоступно'}
            </span>
          </div>
          <div className="status-item">
            <span className={`status-dot ${mrzResult ? 'available' : 'unavailable'}`}></span>
            <span className={mrzResult ? 'status-available' : 'status-unavailable'}>
              МРЗ: {mrzResult ? 'Доступно' : 'Недоступно'}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="legend">
          <p><strong>Критерії оцінки сейсмостійкості:</strong></p>
          <ul>
            <li><strong>m₁</strong> — приріст вимог із сейсмостійкості (максимальний по осях)</li>
            <li><strong>m₂</strong> — приріст вимог із сейсмостійкості з квадратичним усередненням</li>
            <li><strong>m<sub>x</sub>, m<sub>y</sub>, m<sub>z</sub></strong> — максимальні відношення по відповідних осях</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CalculationAnalysisTab; 