import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import '../styles/Import.css';

function Import() {
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [plants, setPlants] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [buildingStatus, setBuildingStatus] = useState(null); // 'success', 'warning', or null
  const [roomStatus, setRoomStatus] = useState(null); // 'success', 'warning', or null
  const [roomMessage, setRoomMessage] = useState('');

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

  const handlePlantChange = (e) => {
    setSelectedPlant(e.target.value);
    setSelectedUnit('');
  };

  const handleUnitChange = (e) => {
    setSelectedUnit(e.target.value);
  };

  const handleBuildingChange = (e) => {
    setBuilding(e.target.value);
    setBuildingStatus(null); // Reset status on change
    if (!e.target.value) {
      setRoom('');
      setRoomStatus(null);
      setRoomMessage('');
    }
  };

  const handleBuildingBlur = async () => {
    if (!building || !selectedPlant || !selectedUnit) {
      setBuildingStatus(null);
      return;
    }
    try {
      const response = await fetch('http://localhost:8000/api/check-building', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plant_id: selectedPlant,
          unit_id: selectedUnit,
          building: building
        }),
      });
      if (!response.ok) throw new Error('Failed to check building');
      const result = await response.json();
      setBuildingStatus(result.exists ? 'success' : 'warning');
    } catch (err) {
      setBuildingStatus('warning');
    }
  };

  const handleRoomChange = (e) => {
    setRoom(e.target.value);
    setRoomStatus(null); // Reset status on change
    setRoomMessage('');
  };

  const handleRoomBlur = async () => {
    if (!room || !building || !selectedPlant || !selectedUnit) {
      setRoomStatus(null);
      setRoomMessage('');
      return;
    }
    if (buildingStatus !== 'success') {
      setRoomStatus('warning');
      setRoomMessage('Будівля не знайдена або не підтверджена');
      return;
    }
    try {
      const response = await fetch('http://localhost:8000/api/check-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plant_id: selectedPlant,
          unit_id: selectedUnit,
          building: building,
          room: room
        }),
      });
      if (!response.ok) throw new Error('Failed to check room');
      const result = await response.json();
      if (result.exists) {
        setRoomStatus('success');
        setRoomMessage('Приміщення знайдено в базі даних');
      } else {
        setRoomStatus('warning');
        setRoomMessage('Приміщення не знайдено в базі даних');
      }
    } catch (err) {
      setRoomStatus('warning');
      setRoomMessage('Помилка при перевірці приміщення');
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !selectedPlant || !selectedUnit) {
      alert('Будь ласка, заповніть всі поля та виберіть файл');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('plant_id', selectedPlant);
    formData.append('unit_id', selectedUnit);

    try {
      const response = await fetch('http://localhost:8000/api/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to import data');
      }

      const result = await response.json();
      alert('Дані успішно імпортовано');
      // Reset form
      setFile(null);
      setSelectedPlant('');
      setSelectedUnit('');
    } catch (err) {
      setError(err.message);
      alert('Помилка при імпорті даних: ' + err.message);
    }
  };

  const getUnitDefaultText = () => {
    if (!selectedPlant) return "Необхідно обрати станцію";
    return "Оберіть енергоблок";
  };

  const handleBuildingKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBuildingBlur();
      e.target.blur();
    }
  };

  const handleRoomKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRoomBlur();
      e.target.blur();
    }
  };

  return (
    <div className="import-page">
      <PageHeader title="Імпорт з Excel" />
      <div className="import-content">
        <form className="import-form" onSubmit={handleSubmit}>
          <div className="filters">
            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="plant">Станція:</label>
                <select
                  id="plant"
                  value={selectedPlant}
                  onChange={handlePlantChange}
                  required
                >
                  <option value="">Оберіть станцію</option>
                  {plants.map((plant) => (
                    <option key={plant.plant_id} value={plant.plant_id}>
                      {plant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="unit">Енергоблок:</label>
                <select
                  id="unit"
                  value={selectedUnit}
                  onChange={handleUnitChange}
                  required
                  disabled={!selectedPlant}
                >
                  <option value="">{getUnitDefaultText()}</option>
                  {units.map((unit) => (
                    <option key={unit.unit_id} value={unit.unit_id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <div className="label-row">
                  <label htmlFor="building">Будівля:</label>
                  {buildingStatus === 'success' && (
                    <span className="status-text success">Будівля знайдена</span>
                  )}
                  {buildingStatus === 'warning' && (
                    <span className="status-text warning">Будівля не знайдена</span>
                  )}
                </div>
                <input
                  type="text"
                  id="building"
                  value={building}
                  onChange={handleBuildingChange}
                  onBlur={handleBuildingBlur}
                  onKeyDown={handleBuildingKeyDown}
                  placeholder="Введіть будівлю"
                  className={buildingStatus ? `border-${buildingStatus}` : ''}
                />
              </div>

              <div className="filter-group">
                <div className="label-row">
                  <label
                    htmlFor="room"
                    className={!building ? "label-inactive" : ""}
                  >
                    Приміщення:
                  </label>
                  {roomStatus === 'success' && (
                    <span className="status-text success">Приміщення знайдено</span>
                  )}
                  {roomStatus === 'warning' && (
                    <span className="status-text warning">Приміщення не знайдено</span>
                  )}
                </div>
                <input
                  type="text"
                  id="room"
                  value={room}
                  onChange={handleRoomChange}
                  onBlur={handleRoomBlur}
                  onKeyDown={handleRoomKeyDown}
                  placeholder="Введіть приміщення"
                  className={roomStatus ? `border-${roomStatus}` : ''}
                  disabled={!building}
                />
              </div>
            </div>

            <div className="filter-group">
              <label htmlFor="file">Файл Excel:</label>
              <input
                type="file"
                id="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                required
              />
            </div>
          </div>

          <div className="submit-button">
            <button type="submit" disabled={!file || !selectedPlant || !selectedUnit}>
              Імпортувати
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Import; 