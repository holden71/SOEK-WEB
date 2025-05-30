import React from 'react';
import '../styles/TableActions.css';

const TableActions = ({ 
  row, 
  data, 
  onImportClick, 
  onAnalysisClick 
}) => {
  const handleImportClick = (e) => {
    e.stopPropagation();
    onImportClick(e, row);
  };

  const handleAnalysisClick = (e) => {
    e.stopPropagation();
    onAnalysisClick(e, row);
  };

  return (
    <div className="table-actions-container">
      <button 
        className="tiny-import-button" 
        onClick={handleImportClick}
        title="Імпорт характеристик"
      >
        ↴
      </button>
      <button 
        className="tiny-analysis-button" 
        onClick={handleAnalysisClick}
        title="Аналіз спектрів"
      >
        📊
      </button>
    </div>
  );
};

export default TableActions; 