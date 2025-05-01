import React, { useState, useEffect, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import PageHeader from '../components/PageHeader';
import '../styles/Main.css';

function Main() {
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedT, setSelectedT] = useState('');
  const [data, setData] = useState([]);
  const [plants, setPlants] = useState([]);
  const [units, setUnits] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    
    return Object.keys(data[0]).map(key => ({
      name: key,
      selector: row => row[key],
      sortable: true,
      grow: 1,
      minWidth: '100px',
    }));
  }, [data]);

  // Fetch plants from backend on component mount
  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/plants');
        if (!response.ok) {
          throw new Error('Failed to fetch plants');
        }
        const data = await response.json();
        setPlants(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPlants();
  }, []);

  // Fetch units when plant is selected
  useEffect(() => {
    const fetchUnits = async () => {
      if (!selectedPlant) {
        setUnits([]);
        return;
      }

      try {
        const response = await fetch(`http://localhost:8000/api/units?plant_id=${selectedPlant}`);
        if (!response.ok) {
          throw new Error('Failed to fetch units');
        }
        const data = await response.json();
        setUnits(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchUnits();
  }, [selectedPlant]);

  // Fetch terms when unit is selected
  useEffect(() => {
    const fetchTerms = async () => {
      if (!selectedPlant || !selectedUnit) {
        setTerms([]);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:8000/api/terms?plant_id=${selectedPlant}&unit_id=${selectedUnit}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch terms');
        }
        const data = await response.json();
        setTerms(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchTerms();
  }, [selectedPlant, selectedUnit]);

  const handlePlantChange = (e) => {
    setSelectedPlant(e.target.value);
    setSelectedUnit('');
    setSelectedT('');
  };

  const handleUnitChange = (e) => {
    setSelectedUnit(e.target.value);
    setSelectedT('');
  };

  const handleSearch = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/search?plant_id=${selectedPlant}&unit_id=${selectedUnit}&t_id=${selectedT}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      
      const result = await response.json();
      console.log('Search results:', result);
      setData(result.map(item => item.data));
    } catch (err) {
      setError(err.message);
      console.error('Search error:', err);
    }
  };

  const getUnitDefaultText = () => {
    if (!selectedPlant) return "Необхідно обрати станцію";
    return "Оберіть енергоблок";
  };

  const getTDefaultText = () => {
    if (!selectedPlant) return "Необхідно обрати станцію";
    if (!selectedUnit) return "Необхідно обрати енергоблок";
    return "Оберіть перелік";
  };

  const isSearchEnabled = selectedPlant && selectedUnit && selectedT;

  if (loading) {
    return <div>Loading plants...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="main-page">
      <PageHeader title="Перелік ЕК" />
      <div className="main-content">
        <div className="filters-container">
          <div className="filters">
            <div className="filter-group">
              <label htmlFor="plant">Вибір станції:</label>
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

            <div className="filter-group">
              <label htmlFor="unit">Вибір енергоблоку:</label>
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

            <div className="filter-group">
              <label htmlFor="t">Вибір переліку:</label>
              <select
                id="t"
                value={selectedT}
                onChange={(e) => setSelectedT(e.target.value)}
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
              disabled={!isSearchEnabled}
              className={!isSearchEnabled ? 'disabled' : ''}
            >
              Пошук
            </button>
          </div>

          <div className="results">
            <DataTable
              columns={columns}
              data={data}
              pagination
              paginationPerPage={10}
              paginationRowsPerPageOptions={[10, 20, 30, 40, 50]}
              highlightOnHover
              pointerOnHover
              responsive
              dense
              customStyles={{
                head: {
                  style: {
                    backgroundColor: '#f8f9fa',
                    color: '#495057',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '12px',
                  },
                },
                rows: {
                  style: {
                    minHeight: '40px',
                    '&:hover': {
                      backgroundColor: '#f8f9fa',
                    },
                  },
                },
                cells: {
                  style: {
                    padding: '12px 16px',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main; 