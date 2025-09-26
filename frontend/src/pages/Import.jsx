import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import '../styles/Import.css';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';

function Import() {
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [lev1, setLev1] = useState('');
  const [lev2, setLev2] = useState('');
  const [pga, setPga] = useState('');
  const [type, setType] = useState('ДЕТЕРМІНИСТИЧНИЙ');
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
  const [importedData, setImportedData] = useState(null); // Store imported data for table
  const [selectedSheet, setSelectedSheet] = useState(null); // Track selected sheet for table
  const [tableGlobalFilter, setTableGlobalFilter] = useState('');
  const [tableSorting, setTableSorting] = useState([]);
  const [savingData, setSavingData] = useState(false); // Add state for saving progress
  const [importStatus, setImportStatus] = useState(null); // 'success', 'error', or null
  const [dataImported, setDataImported] = useState(false); // Track if data was successfully imported
  
  // Replace multiple import states with a single phase tracker
  const [importPhase, setImportPhase] = useState(null); // null, 'checking', 'clearing', 'extracting', 'saving'
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [checkingExistingData, setCheckingExistingData] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [detailedConfirmationData, setDetailedConfirmationData] = useState(null);
  const [showDetailedConfirmation, setShowDetailedConfirmation] = useState(false);

  // Fetch plants from backend on component mount
  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const response = await fetch('/api/plants');
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
        const response = await fetch(`/api/units?plant_id=${selectedPlant}`);
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
    setDataImported(false); // Reset imported state
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
    setDataImported(false); // Reset imported state
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
    setDataImported(false); // Reset imported state
  };

  const handleBuildingBlur = async () => {
    if (!building || !selectedPlant || !selectedUnit) {
      setBuildingStatus(null);
      return;
    }
    try {
      const response = await fetch('/api/check-building', {
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
    setDataImported(false); // Reset imported state
  };

  const handleRoomBlur = async () => {
    if (!room) {
      // If room is empty, just clear the status and allow it to be null
      setRoomStatus(null);
      setRoomMessage('');
      return;
    }
    
    if (!building || !selectedPlant || !selectedUnit) {
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
      const response = await fetch('/api/check-location', {
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
      setDataImported(false); // Reset imported state when file changes
      setImportStatus(null); // Clear any previous import status
      
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
      const response = await fetch('/api/analyze-excel?filter_percentage_only=true', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze Excel file');
      }
      
      const data = await response.json();
      
      if (!data.sheets || !Array.isArray(data.sheets) || data.sheets.length === 0) {
        throw new Error('В Excel файлі не знайдено листів з іменами у форматі відсотків (наприклад: 4%, 0.2%, 1,2%)');
      }
      
      setSheetInfo(data.sheets);
      setAnalyzingFile(false);
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
    setDataImported(false);
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
      
      const response = await fetch('/api/extract-sheet-data', {
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
    if (!file || !sheetInfo || !Array.isArray(sheetInfo) || sheetInfo.length === 0) {
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

  // Function to check for existing data for each DEMPF
  const checkForExistingDataByDempf = async () => {
    if (!selectedPlant || !selectedUnit || !building || !sheetInfo || !Array.isArray(sheetInfo)) {
      return [];
    }

    // Check if at least one of LEV1 or LEV2 is provided
    let level1 = lev1 ? parseFloat(lev1) : null;
    let level2 = lev2 ? parseFloat(lev2) : null;
    
    // Auto-fill logic for levels
    if (level1 !== null && level2 === null) {
      level2 = level1 + 200;
    } else if (level1 === null && level2 !== null) {
      level1 = level2 - 200;
    }

    setImportPhase('checking');
    const results = [];
    
    try {
      // Check for each sheet (DEMPF value)
      for (const sheet of sheetInfo) {
        // Convert sheet name to DEMPF value (e.g., "5%" -> 5)
        const dempf = parseFloat(sheet.name.replace('%', '').replace(',', '.'));
        
        const checkParams = {
          plant_id: selectedPlant,
          unit_id: selectedUnit,
          building: building,
          room: room || '',  // Send empty string instead of null for backend validation
          lev1: level1 ? level1.toString() : null,
          lev2: level2 ? level2.toString() : null,
          earthq_type: null, // Will default to 'МРЗ' in procedure
          calc_type: type,
          set_type: null, // Will default to 'ВИМОГИ' in procedure
          dempf: dempf.toString()
        };

        console.log(`Checking for DEMPF ${dempf}%:`, checkParams);

        const response = await fetch('/api/find-req-accel-set', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(checkParams),
        });

        if (!response.ok) {
          throw new Error(`Failed to check for existing data for DEMPF ${dempf}%`);
        }

        const result = await response.json();
        results.push({
          dempf: dempf,
          sheetName: sheet.name,
          setId: result.set_id,
          foundEk: result.found_ek,
          hasExistingData: result.set_id !== null
        });
        
        console.log(`DEMPF ${dempf}% result:`, result);
      }
      
      return results;
    } catch (err) {
      console.error('Error checking for existing data:', err);
      throw err;
    } finally {
      setImportPhase(null);
    }
  };

  // Updated import function that handles all sheets at once
  const handleImport = async (e) => {
    if (e) e.preventDefault();
    if (!file || !selectedPlant || !selectedUnit || !building) {
      alert('Будь ласка, заповніть всі поля та виберіть файл Excel');
      return;
    }

    // Check if at least one of LEV1 or LEV2 is provided
    if (!lev1 && !lev2) {
      alert('Будь ласка, введіть хоча б один з параметрів: "Рівень, м, від" або "Рівень, м, до"');
      return;
    }

    // Reset any previous import status
    setImportStatus(null);
    setError(null);

    try {
      // First analyze the file if not already analyzed
      if (!sheetInfo) {
        setAnalyzingFile(true);
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/analyze-excel?filter_percentage_only=true', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to analyze Excel file');
        }
        
        const data = await response.json();
        
        if (!data.sheets || !Array.isArray(data.sheets) || data.sheets.length === 0) {
          throw new Error('В Excel файлі не знайдено листів з іменами у форматі відсотків (наприклад: 4%, 0.2%, 1,2%)');
        }
        
        setSheetInfo(data.sheets);
        setAnalyzingFile(false);
      }

      // TEMPORARY: Check for existing data for each DEMPF
      console.log('=== DEBUGGING: Checking existing data for each DEMPF ===');
      const existingDataResults = await checkForExistingDataByDempf();
      
      console.log('All DEMPF check results:', existingDataResults);
      
      // Find which DEMPFs have existing data
      const existingDempfs = existingDataResults.filter(result => result.hasExistingData);
      
      if (existingDempfs.length > 0) {
        // Show detailed results in popup
        setDetailedConfirmationData({
          existingDempfs: existingDempfs,
          totalSheets: existingDataResults.length,
          allResults: existingDataResults
        });
        setShowDetailedConfirmation(true);
        return;
      } else {
        // No existing data found, proceed with normal import
        console.log('No existing data found, proceeding with import');
        await performImport();
      }

    } catch (err) {
      setError(err.message || 'Помилка при імпорті даних');
      setImportStatus('error');
      console.error('Error during import:', err);
      alert(`ПОМИЛКА: ${err.message}`);
    } finally {
      setAnalyzingFile(false);
    }
  };

  // Function to clear existing data for a single set
  const clearExistingData = async (setId) => {
    if (!setId) return { success: false, message: 'No set ID provided' };

    try {
      const clearParams = {
        set_id: setId
      };

      const response = await fetch('/api/clear-accel-set-arrays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clearParams),
      });

      if (!response.ok) {
        throw new Error(`Failed to clear set ${setId}`);
      }

      const result = await response.json();
      return { 
        success: result.clear_result === '1', 
        message: result.clear_result,
        setId: setId
      };
    } catch (err) {
      console.error(`Error clearing set ${setId}:`, err);
      return { success: false, message: err.message, setId: setId };
    }
  };

  // Function to handle detailed confirmation response
  const handleDetailedConfirmation = async (shouldOverwrite) => {
    setShowDetailedConfirmation(false);
    
    if (!shouldOverwrite) {
      console.log('User cancelled import');
      setDetailedConfirmationData(null);
      return;
    }
    
    try {
      // Get all set IDs that need to be cleared
      const setIds = detailedConfirmationData.existingDempfs
        .map(result => result.setId)
        .filter(id => id !== null);
      
      console.log('User confirmed overwrite for set IDs:', setIds);
      
      if (setIds.length === 0) {
        throw new Error('No valid set IDs found to clear');
      }

      // Start clearing process
      setImportPhase('clearing');
      
      // Clear each set individually
      const clearResults = [];
      for (const setId of setIds) {
        console.log(`Clearing set ID: ${setId}`);
        const clearResult = await clearExistingData(setId);
        clearResults.push(clearResult);
        
        if (!clearResult.success) {
          console.error(`Failed to clear set ${setId}:`, clearResult.message);
        } else {
          console.log(`Successfully cleared set ${setId}`);
        }
      }
      
      // Check if all clears were successful
      const failedClears = clearResults.filter(result => !result.success);
      if (failedClears.length > 0) {
        const failedIds = failedClears.map(result => result.setId).join(', ');
        throw new Error(`Failed to clear sets: ${failedIds}`);
      }
      
      console.log('All sets cleared successfully, proceeding with import');
      
      // Now proceed with the actual import
      await performImport();
      
    } catch (err) {
      setError(err.message || 'Помилка при очищенні даних');
      console.error('Error during clearing:', err);
      alert(`ПОМИЛКА ПРИ ОЧИЩЕННІ: ${err.message}`);
    } finally {
      setImportPhase(null);
      setDetailedConfirmationData(null);
    }
  };

  // Function to save imported data to database
  const saveImportedDataToDatabase = async (data) => {
    if (!data || !selectedPlant || !selectedUnit || !building) {
      return { success: false, message: 'Missing required data' };
    }

    // Check if at least one of LEV1 or LEV2 is provided
    let level1 = lev1 ? parseFloat(lev1) : null;
    let level2 = lev2 ? parseFloat(lev2) : null;
    
    // Auto-fill logic for levels
    if (level1 !== null && level2 === null) {
      // If only LEV1 provided, set LEV2 = LEV1 + 200
      level2 = level1 + 200;
    } else if (level1 === null && level2 !== null) {
      // If only LEV2 provided, set LEV1 = LEV2 - 200
      level1 = level2 - 200;
    }

    try {
      // Transform the imported data into the format expected by the backend
      const transformedData = {
        plant_id: selectedPlant,
        unit_id: selectedUnit,
        building: building,
        room: room || '',  // Send empty string instead of null for backend validation
        lev1: level1,
        lev2: level2,
        pga: pga ? parseFloat(pga) : null,
        calc_type: type,
        sheets: {}
      };

      // For each sheet (representing a DEMPF value)
      Object.entries(data).forEach(([sheetName, sheetData]) => {
        // Convert sheet name to DEMPF value (e.g., "5%" -> 5)
        const dempf = parseFloat(sheetName.replace('%', '').replace(',', '.'));
        
        // Add sheet data to transformation
        transformedData.sheets[sheetName] = {
          dempf: dempf,
          data: sheetData
        };
      });

      // Log the data being sent for debugging
      console.log('Sending data to save-accel-data:', JSON.stringify(transformedData, null, 2));

      // Send data to backend
      const response = await fetch('/api/save-accel-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save data';
        try {
          const errorData = await response.json();
          console.error('Detailed error from save-accel-data:', errorData);
          errorMessage = errorData.detail || errorData.message || errorMessage;
          
          // If it's a validation error, try to extract more specific information
          if (response.status === 422 && errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              // FastAPI validation errors format
              const validationErrors = errorData.detail.map(err => 
                `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`
              ).join(', ');
              errorMessage = `Validation error: ${validationErrors}`;
            } else if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            }
          }
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (err) {
      console.error('Error saving data to database:', err);
      return { success: false, message: err.message };
    }
  };

  // Function to perform the actual import
  const performImport = async () => {
    try {
      // Extract data from all sheets
      setImportPhase('extracting');
      const allData = {};
      
      // Add safety check for sheetInfo
      if (!sheetInfo || !Array.isArray(sheetInfo) || sheetInfo.length === 0) {
        throw new Error('No sheet information available for import');
      }
      
      for (const sheet of sheetInfo) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sheet_name', sheet.name);
        
        const response = await fetch('/api/extract-sheet-data', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to extract data from sheet ${sheet.name}`);
        }
        
        const sheetData = await response.json();
        if (sheetData) {
          allData[sheet.name] = sheetData;
        }
      }
      
      setSheetsData(allData);

      // Prepare data for table: convert columns to array of objects
      const importedTableData = {};
      Object.entries(allData).forEach(([sheetName, columns]) => {
        // columns: { col1: [v1, v2], col2: [v1, v2] }
        const keys = Object.keys(columns).filter(k => k !== 'demp');
        const rowCount = columns[keys[0]]?.length || 0;
        const rows = Array.from({ length: rowCount }, (_, i) => {
          const row = {};
          keys.forEach(k => {
            row[k] = columns[k][i];
          });
          return row;
        });
        importedTableData[sheetName] = rows;
      });
      setImportedData(importedTableData);
      setSelectedSheet(Object.keys(importedTableData)[0] || null);

      // Save the data to the database
      setImportPhase('saving');
      const saveResult = await saveImportedDataToDatabase(allData);
      if (!saveResult.success) {
        throw new Error(`Помилка при збереженні даних: ${saveResult.message}`);
      }
      
      setImportStatus('success');
      setDataImported(true);

      // Reset the file input
      const fileInput = document.getElementById('file');
      if (fileInput) {
        fileInput.value = '';
      }
      
      console.log('Import completed successfully');
      
    } finally {
      setImportPhase(null);
    }
  };

  return (
    <div className="import-page">
      <PageHeader title="Імпорт спектрів" />
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
                    Приміщення (опціонально):
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
                  placeholder={!selectedPlant ? 'Необхідно обрати станцію' : (!selectedUnit ? 'Необхідно обрати енергоблок' : (!building ? 'Необхідно ввести будівлю' : 'Введіть приміщення (опціонально)'))}
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
                  <option value="ДЕТЕРМІНИСТИЧНИЙ">ДЕТЕРМІНИСТИЧНИЙ</option>
                  <option value="ІМОВІРНІСНИЙ">ІМОВІРНІСНИЙ</option>
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
                    className={`import-button ${importPhase ? 'pulsing-button' : ''}`}
                    onClick={handleImport}
                    disabled={!file || !selectedPlant || !selectedUnit || !building || importPhase || dataImported}
                  >
                    {importPhase === 'checking' ? 'Перевірка даних...' : 
                     importPhase === 'clearing' ? 'Очищення...' : 
                     importPhase === 'extracting' ? 'Отримання даних...' : 
                     importPhase === 'saving' ? 'Імпорт даних...' : 
                     'Імпортувати'}
                  </button>
                </div>
              </div>
            </div>

            {/* Show message while checking existing data */}
            {file && importPhase === 'checking' && (
              <div className="file-import-row">
                <div className="analyzing-message">
                  Перевірка існуючих даних...
                </div>
              </div>
            )}

            {/* Show message while clearing data */}
            {file && importPhase === 'clearing' && (
              <div className="file-import-row">
                <div className="analyzing-message">
                  Очищення...
                </div>
              </div>
            )}

            {/* Show message while extracting data */}
            {file && importPhase === 'extracting' && (
              <div className="file-import-row">
                <div className="analyzing-message">
                  Отримання даних...
                </div>
              </div>
            )}

            {/* Show message while saving data */}
            {file && importPhase === 'saving' && (
              <div className="file-import-row">
                <div className="analyzing-message">
                  Імпорт даних...
                </div>
              </div>
            )}

            {/* Sheet information */}
            {sheetInfo && sheetInfo.length > 0 && !sheetsData && !dataImported && 
             !analyzingFile && !importPhase && (
              <div className="file-import-row">
                <div className="sheet-info-message">
                  Знайдено {sheetInfo.length} аркушів Excel. Натисніть кнопку "Імпортувати".
                </div>
              </div>
            )}

            {/* Show success message when import complete */}
            {importStatus === 'success' && (
              <div className="file-import-row">
                <div className="success-message">
                  Дані успішно імпортовано
                </div>
              </div>
            )}

            {/* Show error message if any */}
            {importStatus === 'error' && error && (
              <div className="file-import-row">
                <div className="error-message">
                  Помилка при імпорті даних: {error}
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

        {/* Display data in a table */}
        {importedData && selectedSheet && (
          <div className="imported-table-container">
            <h3>Отримані дані</h3>
            <div className="sheet-tabs">
              {Object.keys(importedData).map(sheetName => (
                <button
                  key={sheetName}
                  className={`sheet-tab${selectedSheet === sheetName ? ' active' : ''}`}
                  onClick={() => setSelectedSheet(sheetName)}
                >
                  {sheetName}
                </button>
              ))}
            </div>
            <ImportedSheetTable
              data={importedData[selectedSheet]}
              globalFilter={tableGlobalFilter}
              setGlobalFilter={setTableGlobalFilter}
              sorting={tableSorting}
              setSorting={setTableSorting}
            />
          </div>
        )}
      </div>

      {/* Detailed Confirmation Dialog */}
      {showDetailedConfirmation && detailedConfirmationData && (
        <div className="confirmation-overlay">
          <div className="detailed-confirmation-dialog">
            <div className="confirmation-header">
              <h3>Знайдено існуючі дані</h3>
            </div>
            <div className="confirmation-body">
              <p className="summary-text">
                Знайдено існуючі дані для <strong>{detailedConfirmationData.existingDempfs.length}</strong> з <strong>{detailedConfirmationData.totalSheets}</strong> коефіцієнтів DEMPF:
              </p>
              
              <div className="existing-data-list">
                {detailedConfirmationData.existingDempfs.map((result, index) => (
                  <div key={index} className="existing-data-item">
                    <div className="dempf-header">
                      <span className="dempf-name">{result.sheetName}</span>
                      <span className="dempf-value">DEMPF: {result.dempf}%</span>
                    </div>
                    <div className="data-details">
                      <div className="detail-item">
                        <span className="detail-label">ID набору:</span>
                        <span className="detail-value">{result.setId}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="warning-text">
                <strong>Увага:</strong> Перезапис видалить існуючі дані безповоротно!
              </div>
            </div>
            <div className="confirmation-actions">
              <button 
                className="btn-cancel"
                onClick={() => handleDetailedConfirmation(false)}
                disabled={importPhase === 'clearing'}
              >
                Скасувати
              </button>
              <button 
                className="btn-overwrite"
                onClick={() => handleDetailedConfirmation(true)}
                disabled={importPhase === 'clearing'}
              >
                {importPhase === 'clearing' ? 'Очищення...' : 'Перезаписати дані'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <div className="confirmation-header">
              <h3>Знайдено існуючі дані</h3>
            </div>
            <div className="confirmation-body">
              <p>
                В базі даних знайдено дані з такими же параметрами.
                Знайдено елементів: {confirmationData?.foundEk}
              </p>
              <p>
                Бажаєте перезаписати існуючі дані?
              </p>
            </div>
            <div className="confirmation-actions">
              <button 
                className="btn-cancel"
                onClick={() => handleConfirmedImport(false)}
                disabled={importPhase === 'clearing'}
              >
                Скасувати
              </button>
              <button 
                className="btn-overwrite"
                onClick={() => handleConfirmedImport(true)}
                disabled={importPhase === 'clearing'}
              >
                {importPhase === 'clearing' ? 'Очищення...' : 'Перезаписати'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .imported-table-container {
          padding: 24px 20px 28px 20px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          margin-top: 18px;
          font-family: 'Segoe UI', 'Roboto', 'Arial', sans-serif;
        }
        .imported-table-container h3 {
          font-family: 'Segoe UI', 'Roboto', 'Arial', sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 18px;
        }
        .sheet-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          font-family: 'Segoe UI', 'Roboto', 'Arial', sans-serif;
        }
        .sheet-tab {
          padding: 8px 22px;
          border: 2px solid #007bff;
          border-radius: 8px;
          background-color: #fff;
          color: #007bff;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, border 0.2s, box-shadow 0.2s;
          outline: none;
          box-shadow: none;
          position: relative;
          z-index: 1;
          font-family: inherit;
        }
        .sheet-tab:not(.active):hover {
          background-color: #e6f0ff;
          color: #0056b3;
          border-color: #0056b3;
        }
        .sheet-tab.active {
          background-color: #007bff;
          color: #fff;
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0,123,255,0.10);
          z-index: 2;
        }
        .imported-table-block thead tr {
          margin-bottom: 12px;
          display: table-row;
          font-family: inherit;
        }
        .imported-table-block thead {
          display: table-header-group;
          font-family: inherit;
        }
        .imported-table-block, .imported-table-block table, .imported-table-block td, .imported-table-block th {
          font-family: inherit;
        }
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
        .success-message {
          margin-top: 15px;
          padding: 12px;
          background-color: #e8f5e9;
          border: 1px solid #a5d6a7;
          border-radius: 4px;
          color: #2e7d32;
          text-align: center;
          font-weight: 600;
        }
        .pulsing-button {
          animation: pulse 2s infinite ease-in-out;
          position: relative;
          overflow: visible;
          background-color: #0062cc;
          color: white;
          transition: background-color 0.3s;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 98, 204, 0.4);
            opacity: 1;
          }
          50% {
            box-shadow: 0 0 0 5px rgba(0, 98, 204, 0);
            opacity: 0.85;
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 98, 204, 0);
            opacity: 1;
          }
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
        .confirmation-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .confirmation-dialog {
          background: white;
          border-radius: 8px;
          padding: 0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
        }
        .confirmation-header {
          padding: 20px 24px 16px 24px;
          border-bottom: 1px solid #e9ecef;
          background-color: #f8f9fa;
        }
        .confirmation-header h3 {
          margin: 0;
          color: #495057;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .confirmation-body {
          padding: 24px;
          color: #495057;
          line-height: 1.5;
        }
        .confirmation-body p {
          margin: 0 0 16px 0;
        }
        .confirmation-body p:last-child {
          margin-bottom: 0;
        }
        .confirmation-actions {
          padding: 16px 24px 24px 24px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        .btn-cancel {
          padding: 10px 20px;
          border: 1px solid #6c757d;
          border-radius: 6px;
          background-color: #fff;
          color: #6c757d;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel:hover:not(:disabled) {
          background-color: #6c757d;
          color: white;
        }
        .btn-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-overwrite {
          padding: 10px 20px;
          border: 1px solid #dc3545;
          border-radius: 6px;
          background-color: #dc3545;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-overwrite:hover:not(:disabled) {
          background-color: #c82333;
          border-color: #bd2130;
        }
        .btn-overwrite:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .detailed-confirmation-dialog {
          background: white;
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          max-width: 700px;
          width: 95%;
          max-height: 85vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .summary-text {
          font-size: 1.1rem;
          margin-bottom: 20px;
          color: #495057;
        }
        .existing-data-list {
          max-height: 300px;
          overflow-y: auto;
          margin-bottom: 20px;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          background: #f8f9fa;
        }
        .existing-data-item {
          padding: 16px;
          border-bottom: 1px solid #e9ecef;
          background: white;
          margin: 8px;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .existing-data-item:last-child {
          border-bottom: none;
        }
        .dempf-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e9ecef;
        }
        .dempf-name {
          font-weight: 600;
          font-size: 1.1rem;
          color: #2c5aa0;
        }
        .dempf-value {
          background: #e3f2fd;
          color: #1565c0;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .data-details {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .detail-label {
          font-size: 0.85rem;
          color: #6c757d;
          font-weight: 500;
        }
        .detail-value {
          font-weight: 600;
          color: #495057;
        }
        .warning-text {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}

function ImportedSheetTable({ data, globalFilter, setGlobalFilter, sorting, setSorting }) {
  const columns = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).map(key => ({
      accessorKey: key,
      header: key,
      cell: info => {
        const content = info.getValue()?.toString() || '';
        const handleMouseMove = (e) => {
          const tooltip = e.currentTarget.querySelector('.cell-tooltip');
          if (tooltip) {
            const x = e.clientX;
            const y = e.clientY;
            tooltip.style.left = `${x + 10}px`;
            tooltip.style.top = `${y - 10}px`;
          }
        };
        const handleCopy = async (e) => {
          const element = e.currentTarget;
          await navigator.clipboard.writeText(content);
          element.classList.add('copied');
          const label = document.createElement('span');
          label.className = 'copy-label';
          label.textContent = '📋';
          element.appendChild(label);
          setTimeout(() => {
            element.classList.remove('copied');
            element.removeChild(label);
          }, 500);
        };
        return (
          <div className="cell-content-wrapper">
            <div className="cell-content" onClick={handleCopy} onMouseMove={handleMouseMove}>
              <span className="cell-text">{content}</span>
              <span className="cell-tooltip">{content}</span>
            </div>
          </div>
        );
      },
    }));
  }, [data]);

  const table = useReactTable({
    data: data || [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId);
      return value?.toString().toLowerCase().includes(filterValue.toLowerCase());
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="imported-table-block">
      <div className="table-search">
        <input
          type="text"
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder="Пошук у таблиці..."
          className="search-input"
        />
        {globalFilter && (
          <button
            onClick={() => setGlobalFilter('')}
            className="clear-search"
            title="Очистити пошук"
          >
            ✕
          </button>
        )}
      </div>
      <div className="table-container">
        <table>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{ asc: ' 🔼', desc: ' 🔽' }[header.column.getIsSorted()] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          {table.getRowModel().rows.length > 0 ? (
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          ) : (
            <tbody>
              <tr>
                <td colSpan={columns.length}>
                  <div className="no-results">Немає даних для відображення</div>
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
      {table.getRowModel().rows.length > 0 && (
        <div className="pagination">
          <div className="pagination-controls">
            <div className="pagination-buttons">
              <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>{'<<'}</button>
              <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>{'<'}</button>
              <span className="page-info">
                Сторінка <strong>{table.getState().pagination.pageIndex + 1} з {table.getPageCount()}</strong>
              </span>
              <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>{'>'}</button>
              <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>{'>>'}</button>
            </div>
            <div className="pagination-right">
              <input
                type="number"
                defaultValue={table.getState().pagination.pageIndex + 1}
                onChange={e => {
                  const page = e.target.value ? Number(e.target.value) - 1 : 0;
                  table.setPageIndex(page);
                }}
                className="page-input"
                title="Go to page"
              />
              <select
                value={table.getState().pagination.pageSize}
                onChange={e => table.setPageSize(Number(e.target.value))}
                title="Rows per page"
              >
                {[10, 20, 30, 40, 50].map(pageSize => (
                  <option key={pageSize} value={pageSize}>{pageSize}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Import; 