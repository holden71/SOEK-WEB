import React from 'react';
import '../styles/ModeSwitcher.css';

function ModeSwitcher({ currentMode, onModeChange, modes }) {
  return (
    <div className="mode-switcher">
      {modes.map((mode) => (
        <button
          key={mode.key}
          className={`mode-button ${currentMode === mode.key ? 'active' : ''}`}
          onClick={() => onModeChange(mode.key)}
          title={mode.description}
        >
          {mode.icon} {mode.label}
        </button>
      ))}
    </div>
  );
}

export default ModeSwitcher;
