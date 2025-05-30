import React from 'react';
import '../styles/FilterSection.css';

const FilterSection = ({
  selectedPlant,
  selectedUnit,
  selectedT,
  plants,
  units,
  terms,
  searching,
  isSearchEnabled,
  handlePlantChange,
  handleUnitChange,
  handleTChange,
  handleSearch,
  getUnitDefaultText,
  getTDefaultText
}) => {
  return (
    <div className="main-filters-container">
      <div className="main-filters-row">
        <div className="main-filter-item">
          <label htmlFor="plant">Станція:</label>
          <select
            id="plant"
            value={selectedPlant}
            onChange={handlePlantChange}
          >
            <option value="">Оберіть станцію</option>
            {plants.map(plant => (
              <option key={plant.plant_id} value={plant.plant_id}>{plant.name}</option>
            ))}
          </select>
        </div>

        <div className="main-filter-item">
          <label htmlFor="unit">Енергоблок:</label>
          <select
            id="unit"
            value={selectedUnit}
            onChange={handleUnitChange}
            disabled={!selectedPlant}
          >
            <option value="">{getUnitDefaultText()}</option>
            {units.map(unit => (
              <option key={unit.unit_id} value={unit.unit_id}>{unit.name}</option>
            ))}
          </select>
        </div>

        <div className="main-filter-item">
          <label htmlFor="t">Перелік:</label>
          <select
            id="t"
            value={selectedT}
            onChange={handleTChange}
            disabled={!selectedPlant || !selectedUnit}
          >
            <option value="">{getTDefaultText()}</option>
            {terms.map(term => (
              <option key={term.term_id} value={term.term_id}>{term.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="search-button">
        <button
          onClick={handleSearch}
          disabled={!isSearchEnabled || searching}
          className={!isSearchEnabled ? 'disabled' : ''}
        >
          {searching ? (
            <div className="spinner"></div>
          ) : (
            'Пошук'
          )}
        </button>
      </div>
    </div>
  );
};

export default FilterSection; 