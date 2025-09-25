import React, { useState, useRef, useEffect } from 'react';
import '../styles/TableActions.css';

const TableActions = ({ 
  row, 
  data, 
  onImportClick, 
  onAnalysisClick 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleImportClick = (e) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onImportClick(e, row);
  };

  const handleAnalysisClick = (e) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onAnalysisClick(e, row);
  };

  return (
    <div className="table-actions-container">
      <button 
        ref={buttonRef}
        className="action-menu-button" 
        onClick={handleMenuToggle}
        title="Дії"
      >
        ⋮
      </button>
      {isMenuOpen && (
        <div ref={menuRef} className="action-dropdown-menu">
          <div className="menu-item" onClick={handleImportClick}>
            <span className="menu-text">Імпорт характеристик</span>
          </div>
          <div className="menu-item" onClick={handleAnalysisClick}>
            <span className="menu-text">Аналіз спектрів</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableActions; 