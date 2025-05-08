import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import '../styles/Import.css';

function Import() {
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [lev1, setLev1] = useState('');
  const [lev2, setLev2] = useState('');
  const [pga, setPga] = useState('');
  const [type, setType] = useState('Детермінистичний');
  const [plants, setPlants] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [buildingStatus, setBuildingStatus] = useState(null); // 'success', 'warning', or null
  const [roomStatus, setRoomStatus] = useState(null); // 'success', 'warning', or null
  const [roomMessage, setRoomMessage] = useState('');
  const [sheetInfo, setSheetInfo] = useState(null);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [sheetsData, setSheetsData] = useState(null); // To store extracted sheet data
  const [extractingData, setExtractingData] = useState(false); // Flag for data extraction in progress
  const [expandedColumns, setExpandedColumns] = useState({}); // Track which columns are expanded

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
    setBuilding('');
    setRoom('');
    setLev1('');
    setLev2('');
    setPga('');
    setBuildingStatus(null); // Reset building status
    setRoomStatus(null); // Reset room status
    setRoomMessage(''); // Reset room message
    setSheetsData(null); // Reset sheet data
  };

  const handleUnitChange = (e) => {
    setSelectedUnit(e.target.value);
    setBuilding('');
    setRoom('');
    setLev1('');
    setLev2('');
    setPga('');
    setBuildingStatus(null);
    setRoomStatus(null);
    setRoomMessage('');
    setSheetsData(null); // Reset sheet data
  };

  const handleBuildingChange = (e) => {
    setBuilding(e.target.value);
    setBuildingStatus(null); // Reset status on change
    if (!e.target.value) {
      setRoom('');
      setRoomStatus(null);
      setRoomMessage('');
    }
    setSheetsData(null); // Reset sheet data
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

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setSheetInfo(null);
      setSheetsData(null);
      
      if (selectedPlant && selectedUnit && building) {
        await analyzeExcelFile(selectedFile);
      }
    }
  };

  const analyzeExcelFile = async (fileToAnalyze) => {
    if (!fileToAnalyze) return;
    
    setAnalyzingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToAnalyze);
      
      // Filter sheets to only show percentage values
      const response = await fetch('http://localhost:8000/api/analyze-excel?filter_percentage_only=true', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze Excel file');
      }
      
      const data = await response.json();
      
      if (data.sheets && data.sheets.length === 0) {
        setError('В Excel файлі не знайдено листів з іменами у форматі відсотків (наприклад: 4%, 0.2%, 1,2%)');
        setFile(null);
        const fileInput = document.getElementById('file');
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        setSheetInfo(data.sheets);
      }
    } catch (err) {
      setError('Error analyzing Excel file: ' + err.message);
      console.error('Error analyzing Excel file:', err);
    } finally {
      setAnalyzingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setSheetInfo(null);
    setSheetsData(null);
    setExpandedColumns({});
    // Reset the file input
    const fileInput = document.getElementById('file');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const fileInputRef = React.useRef(null);

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Function to extract data from a specific sheet
  const extractSheetData = async (sheetName) => {
    if (!file) return null;
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheet_name', sheetName);
      
      const response = await fetch('http://localhost:8000/api/extract-sheet-data', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to extract data from sheet ${sheetName}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error(`Error extracting data from sheet ${sheetName}:`, err);
      return null;
    }
  };

  // Function to extract data from all sheets
  const extractAllSheetsData = async () => {
    if (!file || !sheetInfo || sheetInfo.length === 0) {
      return;
    }
    
    setExtractingData(true);
    setSheetsData(null);
    
    try {
      const allData = {};
      
      // Process each sheet
      for (const sheet of sheetInfo) {
        const sheetData = await extractSheetData(sheet.name);
        if (sheetData) {
          allData[sheet.name] = sheetData;
        }
      }
      
      setSheetsData(allData);
      console.log('Extracted data from all sheets:', allData);
    } catch (err) {
      setError('Error extracting data from sheets: ' + err.message);
      console.error('Error extracting data from sheets:', err);
    } finally {
      setExtractingData(false);
    }
  };

  // Toggle column expansion
  const toggleColumnExpansion = (sheetName, columnName) => {
    setExpandedColumns(prev => {
      const key = `${sheetName}-${columnName}`;
      return {
        ...prev,
        [key]: !prev[key]
      };
    });
  };

  // Check if a column is expanded
  const isColumnExpanded = (sheetName, columnName) => {
    const key = `${sheetName}-${columnName}`;
    return expandedColumns[key];
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

  const handleLev1Change = (e) => {
    const value = e.target.value;
    // Allow empty string or valid float
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setLev1(value);
    }
  };

  const handleLev2Change = (e) => {
    const value = e.target.value;
    // Allow empty string or valid float
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setLev2(value);
    }
  };

  const handlePgaChange = (e) => {
    const value = e.target.value;
    // Allow empty string or valid float
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setPga(value);
    }
  };

  const handleTypeChange = (e) => {
    setType(e.target.value);
  };

  // Updated import function that handles all sheets at once
  const handleImport = async () => {
    if (!file || !selectedPlant || !selectedUnit || !sheetInfo || sheetInfo.length === 0) {
      alert('Будь ласка, заповніть всі поля та виберіть файл Excel');
      return;
    }

    // First extract data from all sheets if not already done
    if (!sheetsData) {
      await extractAllSheetsData();
      return; // Stop here after extraction, user can review before actual import
    }

    // Now proceed with importing the data
    try {
      // In a real application, you would send the sheetsData to the backend
      // For now, we just simulate a successful import
      alert('Дані успішно імпортовано зі всіх листів');
      
      // Reset form after successful import
      setFile(null);
      setSheetInfo(null);
      setSheetsData(null);
      setExpandedColumns({});
      setSelectedPlant('');
      setSelectedUnit('');
      setBuilding('');
      setRoom('');
      setLev1('');
      setLev2('');
      setPga('');
      
      // Reset the file input
      const fileInput = document.getElementById('file');
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      setError(err.message || 'Помилка при імпорті даних');
      alert('Помилка при імпорті даних: ' + (err.message || ''));
    }
  };

  return (
    <div className="import-page">
      <PageHeader title="Імпорт з Excel" />
      <div className="import-content">
        <form className="import-form">
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
                  <option value="">{!selectedPlant ? "Необхідно обрати станцію" : "Оберіть енергоблок"}</option>
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
                  <label htmlFor="building" className={!selectedUnit ? "label-inactive" : ""}>Будівля:</label>
                  {buildingStatus === 'success' && (
                    <span className="status-text success">Знайдено</span>
                  )}
                  {buildingStatus === 'warning' && (
                    <span className="status-text warning">Не знайдено</span>
                  )}
                </div>
                <input
                  type="text"
                  id="building"
                  value={building}
                  onChange={handleBuildingChange}
                  onBlur={handleBuildingBlur}
                  onKeyDown={handleBuildingKeyDown}
                  placeholder={!selectedPlant ? 'Необхідно обрати станцію' : (!selectedUnit ? 'Необхідно обрати енергоблок' : 'Введіть будівлю')}
                  className={buildingStatus ? `border-${buildingStatus}` : ''}
                  disabled={!selectedPlant || !selectedUnit}
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
                    <span className="status-text success">Знайдено</span>
                  )}
                  {roomStatus === 'warning' && (
                    <span className="status-text warning">Не знайдено</span>
                  )}
                </div>
                <input
                  type="text"
                  id="room"
                  value={room}
                  onChange={handleRoomChange}
                  onBlur={handleRoomBlur}
                  onKeyDown={handleRoomKeyDown}
                  placeholder={!selectedPlant ? 'Необхідно обрати станцію' : (!selectedUnit ? 'Необхідно обрати енергоблок' : (!building ? 'Необхідно ввести будівлю' : 'Введіть приміщення'))}
                  className={roomStatus ? `border-${roomStatus}` : ''}
                  disabled={!selectedPlant || !selectedUnit || !building}
                />
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="lev1" className={!building ? "label-inactive" : ""}>Рівень, м, від:</label>
                <input
                  type="text"
                  id="lev1"
                  value={lev1}
                  onChange={handleLev1Change}
                  placeholder={!selectedPlant ? 'Необхідно обрати станцію' : (!selectedUnit ? 'Необхідно обрати енергоблок' : (!building ? 'Необхідно ввести будівлю' : 'Введіть рівень'))}
                  disabled={!selectedPlant || !selectedUnit || !building}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="lev2" className={!building ? "label-inactive" : ""}>Рівень, м, до:</label>
                <input
                  type="text"
                  id="lev2"
                  value={lev2}
                  onChange={handleLev2Change}
                  placeholder={!selectedPlant ? 'Необхідно обрати станцію' : (!selectedUnit ? 'Необхідно обрати енергоблок' : (!building ? 'Необхідно ввести будівлю' : 'Введіть рівень'))}
                  disabled={!selectedPlant || !selectedUnit || !building}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="pga" className={!building ? "label-inactive" : ""}>PGA, g:</label>
                <input
                  type="text"
                  id="pga"
                  value={pga}
                  onChange={handlePgaChange}
                  placeholder={!selectedPlant ? 'Необхідно обрати станцію' : (!selectedUnit ? 'Необхідно обрати енергоблок' : (!building ? 'Необхідно ввести будівлю' : 'Введіть прискорення'))}
                  disabled={!selectedPlant || !selectedUnit || !building}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="type" className={!building ? "label-inactive" : ""}>Тип розрахунку:</label>
                <select
                  id="type"
                  value={type}
                  onChange={handleTypeChange}
                  disabled={!selectedPlant || !selectedUnit || !building}
                  className="uppercase-options"
                >
                  <option value="Детермінистичний">Детермінистичний</option>
                  <option value="Імовірнісний">Імовірнісний</option>
                </select>
              </div>
            </div>

            <div className="file-import-row">
              <div className="filter-group file-input-group">
                <label htmlFor="file">Файл Excel:</label>
                <div className="file-input-container">
                  <div className="custom-file-input">
                    <input
                      type="file"
                      id="file"
                      ref={fileInputRef}
                      accept=".xlsx,.xls,.xlsm"
                      onChange={handleFileChange}
                      required
                      className="hidden-file-input"
                    />
                    <button 
                      type="button" 
                      className="select-file-button"
                      onClick={triggerFileInput}
                      disabled={!selectedPlant || !selectedUnit || !building}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                        <path d="M8.5 8.5V6.5h2a.5.5 0 0 1 0 1h-2v1.5h2a.5.5 0 0 1 0 1h-2v1.5H10a.5.5 0 0 1 0 1H8.5V14H10a.5.5 0 0 1 0 1H6a.5.5 0 0 1 0-1h1.5v-1.5H6a.5.5 0 0 1 0-1h1.5V10H6a.5.5 0 0 1 0-1h1.5V7.5H6a.5.5 0 0 1 0-1h2V5z"/>
                      </svg>
                      Вибрати файл
                    </button>
                    <div className="file-display">
                      {file ? (
                        <div className="selected-file">
                          <span className="file-name">{file.name}</span>
                          <button
                            type="button"
                            className="remove-file-button"
                            onClick={handleRemoveFile}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="no-file">
                          {!selectedPlant 
                            ? 'Необхідно обрати станцію' 
                            : !selectedUnit 
                              ? 'Необхідно обрати енергоблок' 
                              : !building
                                ? 'Необхідно ввести будівлю'
                                : 'Файл не вибрано'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    type="button" 
                    className="import-button"
                    onClick={handleImport}
                    disabled={!file || !selectedPlant || !selectedUnit || !building || analyzingFile || extractingData}
                  >
                    {!sheetsData ? 'Отримати дані з усіх листів' : 'Імпортувати'}
                  </button>
                </div>
              </div>
            </div>

            {/* File analysis message */}
            {file && analyzingFile && (
              <div className="file-import-row">
                <div className="analyzing-message">
                  Аналіз Excel файлу, будь ласка зачекайте...
                </div>
              </div>
            )}

            {/* Show message while extracting data */}
            {file && extractingData && (
              <div className="file-import-row">
                <div className="analyzing-message">
                  Отримання даних з листів, будь ласка зачекайте...
                </div>
              </div>
            )}

            {/* Sheet information */}
            {sheetInfo && sheetInfo.length > 0 && !sheetsData && (
              <div className="file-import-row">
                <div className="sheet-info-message">
                  Знайдено {sheetInfo.length} аркушів Excel. Натисніть кнопку "Отримати дані з усіх листів".
                </div>
              </div>
            )}

            {/* Display extracted data with expandable columns */}
            {sheetsData && Object.keys(sheetsData).length > 0 && (
              <div className="extracted-data-container">
                <h3>Отримані дані листів</h3>
                <div className="sheets-data-tabs">
                  {Object.keys(sheetsData).map(sheetName => (
                    <div key={sheetName} className="sheet-data-summary">
                      <h4>Лист: {sheetName}</h4>
                      <div className="sheet-data-info">
                        <p>Кількість стовпців: {Object.keys(sheetsData[sheetName]).filter(key => key !== 'demp').length}</p>
                        
                        {Object.keys(sheetsData[sheetName])
                          .filter(key => key !== 'demp')
                          .map(columnName => {
                            const columnData = sheetsData[sheetName][columnName];
                            const isExpanded = isColumnExpanded(sheetName, columnName);
                            const displayData = isExpanded 
                              ? columnData 
                              : columnData.slice(0, 5);
                            
                            return (
                              <div key={columnName} className="column-details">
                                <div 
                                  className="column-header" 
                                  onClick={() => toggleColumnExpansion(sheetName, columnName)}
                                >
                                  <strong>{columnName}:</strong> {columnData.length} рядків
                                  <span className="expand-icon">{isExpanded ? '▼' : '►'}</span>
                                </div>
                                
                                {displayData.length > 0 && (
                                  <div className={`column-values ${isExpanded ? 'expanded' : ''}`}>
                                    <ul>
                                      {displayData.map((value, idx) => (
                                        <li key={idx}>{value}</li>
                                      ))}
                                    </ul>
                                    
                                    {!isExpanded && columnData.length > 5 && (
                                      <div className="show-more" onClick={() => toggleColumnExpansion(sheetName, columnName)}>
                                        Показати ще {columnData.length - 5} рядків...
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>
        
        {/* Display error message if any */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
      <style jsx>{`
        .uppercase-options {
          text-transform: uppercase;
        }
        .uppercase-options option {
          text-transform: uppercase;
        }
        .error-message {
          margin-top: 15px;
          padding: 12px;
          background-color: #ffebee;
          border: 1px solid #ffcdd2;
          border-radius: 4px;
          color: #c62828;
        }
        .sheet-info-message {
          padding: 10px;
          background-color: #e6f7ff;
          border: 1px solid #91d5ff;
          border-radius: 4px;
          color: #1890ff;
          text-align: center;
        }
        .column-header {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .column-header:hover {
          background-color: #f5f5f5;
        }
        .column-values {
          padding-left: 20px;
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
        }
        .column-values.expanded {
          max-height: 500px;
          overflow-y: auto;
          padding-top: 10px;
          padding-bottom: 10px;
        }
        .column-values ul {
          margin: 0;
          padding-left: 20px;
        }
        .column-values li {
          margin-bottom: 5px;
        }
        .show-more {
          color: #1890ff;
          cursor: pointer;
          padding: 5px 0;
          font-size: 0.9rem;
        }
        .show-more:hover {
          text-decoration: underline;
        }
        .expand-icon {
          font-size: 0.8rem;
          color: #1890ff;
        }
        .column-details {
          margin-bottom: 10px;
          border: 1px solid #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export default Import; 