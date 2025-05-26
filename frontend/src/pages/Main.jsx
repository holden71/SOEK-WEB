import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
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
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [showPopup, setShowPopup] = useState(false);
  const [popupRowId, setPopupRowId] = useState(null);
  const [popupRowData, setPopupRowData] = useState(null);
  const [sameTypeCount, setSameTypeCount] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importForAllTypes, setImportForAllTypes] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [clearSets, setClearSets] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [imported, setImported] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const popupRef = useRef(null);
  const fileInputRef = useRef(null);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    
    return [
      {
        id: 'importButton',
        header: '',
        size: 50,
        maxSize: 50,
        minSize: 50,
        cell: ({ row }) => {
          const handleImportClick = (e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setPopupPosition({ 
              x: Math.max(rect.left - 200, 10), 
              y: rect.bottom 
            });
            
            // Get current row data
            const rowData = row.original;
            console.log("Row data:", rowData); // Log to see what we have
            setPopupRowData(rowData);
            
            // Count items with the same ptype_id
            if (rowData && rowData.ptype_id) {
              const sameTypeItems = data.filter(item => item.ptype_id === rowData.ptype_id);
              setSameTypeCount(sameTypeItems.length);
            } else {
              setSameTypeCount(0);
            }
            
            // Clear selected file when opening popup
            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            
            // Reset import state
            setImported(false);
            setImportResults(null);
            setClearSets(false);
            
            setShowPopup(true);
            setPopupRowId(row.id);
          };

          return (
            <div className="import-button-container">
              <button 
                className="tiny-import-button" 
                onClick={handleImportClick}
                title="Імпорт характеристик"
              >
                ↴
              </button>
            </div>
          );
        },
      },
      ...Object.keys(data[0]).map(key => ({
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
            await handleCopyContent(content);
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
            <div 
              className="cell-content-wrapper"
            >
              <div 
                className="cell-content"
                onClick={handleCopy}
                onMouseMove={handleMouseMove}
              >
                <span className="cell-text">{content}</span>
                <span className="cell-tooltip">{content}</span>
              </div>
            </div>
          );
        },
      })),
    ];
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
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
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

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

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePlantChange = (e) => {
    setSelectedPlant(e.target.value);
    setSelectedUnit('');
    setSelectedT('');
    setHasSearched(false);
  };

  const handleUnitChange = (e) => {
    setSelectedUnit(e.target.value);
    setSelectedT('');
    setHasSearched(false);
  };

  const handleTChange = (e) => {
    setSelectedT(e.target.value);
    setHasSearched(false);
  };

  const handleSearch = async () => {
    try {
      setSearching(true);
      setHasSearched(true);
      const response = await fetch(
        `http://localhost:8000/api/search?plant_id=${selectedPlant}&unit_id=${selectedUnit}&t_id=${selectedT}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      
      const result = await response.json();
      const processedData = result.map(item => item.data);
      setData(processedData);
      setGlobalFilter('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
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

  const renderNoDataMessage = () => {
    if (searching) {
      return null;
    }

    const hasData = data && data.length > 0;
    const hasFilter = Boolean(globalFilter);
    const hasFilteredRows = table.getRowModel().rows.length > 0;

    if (hasData && hasFilter && !hasFilteredRows) {
      return "Пошук не дав результатів";
    }

    if (!hasSearched) {
      return "Виберіть параметри та натисніть \"Пошук\" для відображення даних";
    }

    if (hasSearched && !hasData) {
      return "Пошук не дав результатів";
    }

    return null;
  };

  const handleCopyContent = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Function to handle import
  const handleImport = async () => {
    if (!selectedFile) {
      alert('Будь ласка, виберіть файл для імпорту');
      return;
    }
    
    setImportLoading(true);
    
    try {
      // Step 1: Analyze the Excel file to get basic sheet info
      const analyzeFormData = new FormData();
      analyzeFormData.append('file', selectedFile);
      
      const analyzeResponse = await fetch('http://localhost:8000/api/analyze-excel', {
        method: 'POST',
        body: analyzeFormData,
      });
      
      if (!analyzeResponse.ok) {
        throw new Error('Помилка при аналізі Excel файлу');
      }
      
      const analyzeData = await analyzeResponse.json();
      
      if (!analyzeData.sheets || analyzeData.sheets.length === 0) {
        throw new Error('В Excel файлі не знайдено листів');
      }
      
      // Get the first sheet only
      const firstSheet = analyzeData.sheets[0];
      
      // Step 2: Extract data from the first sheet
      const extractFormData = new FormData();
      extractFormData.append('file', selectedFile);
      extractFormData.append('sheet_name', firstSheet.name);
      
      const extractResponse = await fetch('http://localhost:8000/api/extract-sheet-data', {
        method: 'POST',
        body: extractFormData,
      });
      
      if (!extractResponse.ok) {
        throw new Error(`Помилка при вилученні даних з аркуша ${firstSheet.name}`);
      }
      
      const sheetData = await extractResponse.json();
      if (!sheetData) {
        throw new Error('Не вдалося отримати дані з аркуша');
      }
      
      // Step 3: Prepare data for saving to database
      console.log("Row data for import:", popupRowData);
      
      // The backend expects data according to the AccelData model
      const transformedData = {
        // AccelData model fields
        plant_id: selectedPlant,
        unit_id: selectedUnit,
        building: popupRowData.BUILDING || popupRowData.building || "",
        room: popupRowData.ROOM || popupRowData.room || "",
        lev: popupRowData.LEV || popupRowData.lev || null,
        lev1: null,
        lev2: null,
        pga: null,
        calc_type: "ДЕТЕРМІНИСТИЧНИЙ",
        set_type: "ХАРАКТЕРИСТИКИ",
        
        // Sheets data - just one sheet
        sheets: {}
      };
      
      console.log("Transformed data for import:", transformedData);
      
      // Process the single sheet
      const normalizedData = {};
      let hasFrequencyColumn = false;
      let hasMrzOrPzColumn = false;
      
      Object.entries(sheetData).forEach(([colName, colValues]) => {
        // Check for frequency column
        if (colName.toLowerCase().includes('частота') || 
            colName.toLowerCase().includes('frequency') || 
            colName.toLowerCase().includes('freq') || 
            colName.toLowerCase().includes('hz')) {
          normalizedData[colName] = colValues;
          hasFrequencyColumn = true;
        } 
        // Check for spectrum columns (МРЗ_x, МРЗ_y, etc.)
        else if (colName.includes('_')) {
          const [spectrumType, axis] = colName.split('_');
          if (['МРЗ', 'ПЗ'].includes(spectrumType) && ['x', 'y', 'z', 'X', 'Y', 'Z'].includes(axis)) {
            // Normalize column name to ensure uppercase spectrum type and lowercase axis
            const normalizedColName = `${spectrumType}_${axis.toLowerCase()}`;
            normalizedData[normalizedColName] = colValues;
            hasMrzOrPzColumn = true;
          } else {
            // Keep the column as is
            normalizedData[colName] = colValues;
          }
        } else {
          // Keep other columns as is
          normalizedData[colName] = colValues;
        }
      });
      
      // Skip if no frequency column found
      if (!hasFrequencyColumn) {
        throw new Error('В аркуші не знайдено стовпчика з частотою');
      }
      
      // Skip if no MRZ or PZ columns found
      if (!hasMrzOrPzColumn) {
        throw new Error('В аркуші відсутні стовпчики МРЗ або ПЗ');
      }
      
      // Add sheet data to transformation with normalized column names
      transformedData.sheets[firstSheet.name] = {
        dempf: null,
        data: normalizedData
      };
      
      // Step 4: Send data to backend
      console.log("Sending data to endpoint: /api/save-accel-data");
      console.log("Request body:", JSON.stringify(transformedData, null, 2));
      
      const saveResponse = await fetch('http://localhost:8000/api/save-accel-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedData),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        console.error("Server error response:", errorData);
        
        let errorMessage = 'Помилка при збереженні даних';
        
        // Try to extract detailed error message
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => {
              if (err.loc && err.msg) {
                const fieldPath = err.loc.join('.');
                return `Field ${fieldPath}: ${err.msg}`;
              }
              return JSON.stringify(err);
            }).join('\n');
          } else if (typeof errorData.detail === 'object') {
            errorMessage = JSON.stringify(errorData.detail);
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // Get the response data including the created set IDs
      const savedData = await saveResponse.json();
      console.log('Save response:', savedData);
      
      // Step 5: Call the stored procedure to set data for all elements if needed
      const ekId = popupRowData.EK_ID || popupRowData.ek_id;
      
      if (!ekId) {
        throw new Error('Не вдалося отримати ID елемента');
      }
      
      // Extract the MRZ and PZ set IDs from the response
      const mrzSetId = savedData.mrz_set_id || 0;
      const pzSetId = savedData.pz_set_id || 0;
      
      const procedureParams = {
        ek_id: ekId,
        set_mrz: mrzSetId,
        set_pz: pzSetId,
        can_overwrite: overwriteExisting ? 1 : 0,
        do_for_all: importForAllTypes ? 1 : 0,
        clear_sets: clearSets ? 1 : 0
      };
      
      console.log("Calling stored procedure with params:", procedureParams);
      
      const procedureResponse = await fetch('http://localhost:8000/api/execute-set-all-ek-accel-set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(procedureParams),
      });
      
      if (!procedureResponse.ok) {
        const procedureError = await procedureResponse.json();
        console.error("Procedure error:", procedureError);
        throw new Error('Помилка при виконанні процедури SET_ALL_EK_ACCEL_SET');
      }
      
      // Get raw response and log it for debugging
      const procedureResult = await procedureResponse.json();
      console.log("Raw procedure result:", procedureResult);
      console.log("Raw done_for_id_mrz:", procedureResult.done_for_id_mrz, "type:", typeof procedureResult.done_for_id_mrz);
      console.log("Raw done_for_id_pz:", procedureResult.done_for_id_pz, "type:", typeof procedureResult.done_for_id_pz);
      console.log("Raw done_for_all_mrz:", procedureResult.done_for_all_mrz, "type:", typeof procedureResult.done_for_all_mrz);
      console.log("Raw done_for_all_pz:", procedureResult.done_for_all_pz, "type:", typeof procedureResult.done_for_all_pz);
      console.log("Raw total_ek:", procedureResult.total_ek, "type:", typeof procedureResult.total_ek);
      console.log("Raw processed_mrz:", procedureResult.processed_mrz, "type:", typeof procedureResult.processed_mrz);
      console.log("Raw processed_pz:", procedureResult.processed_pz, "type:", typeof procedureResult.processed_pz);
      
      // Compare values directly to 1 (success) for element updates
      const isElementMrzSuccess = procedureResult.done_for_id_mrz === 1;
      const isElementPzSuccess = procedureResult.done_for_id_pz === 1;
      const isElementUpdateSuccess = isElementMrzSuccess && isElementPzSuccess;
      
      // For all elements updates (only relevant if importForAllTypes is true)
      let isAllElementsMrzSuccess = null;
      let isAllElementsPzSuccess = null;
      let isAllElementsUpdateSuccess = null;
      
      if (importForAllTypes) {
        isAllElementsMrzSuccess = procedureResult.done_for_all_mrz === 1;
        isAllElementsPzSuccess = procedureResult.done_for_all_pz === 1;
        isAllElementsUpdateSuccess = isAllElementsMrzSuccess && isAllElementsPzSuccess;
      }
      
      console.log("Element MRZ update success:", isElementMrzSuccess);
      console.log("Element PZ update success:", isElementPzSuccess);
      console.log("Overall element update success:", isElementUpdateSuccess);
      
      if (importForAllTypes) {
        console.log("All elements MRZ update success:", isAllElementsMrzSuccess);
        console.log("All elements PZ update success:", isAllElementsPzSuccess);
        console.log("Overall all elements update success:", isAllElementsUpdateSuccess);
      }
      
      // Store results with detailed information
      setImportResults({
        // Raw procedure results
        done_for_id_mrz: procedureResult.done_for_id_mrz,
        done_for_id_pz: procedureResult.done_for_id_pz,
        done_for_all_mrz: procedureResult.done_for_all_mrz,
        done_for_all_pz: procedureResult.done_for_all_pz,
        total_ek: procedureResult.total_ek,
        processed_mrz: procedureResult.processed_mrz,
        processed_pz: procedureResult.processed_pz,
        
        // Computed success flags
        isElementMrzSuccess,
        isElementPzSuccess,
        isElementUpdateSuccess,
        isAllElementsMrzSuccess,
        isAllElementsPzSuccess,
        isAllElementsUpdateSuccess
      });
      
      // Log warnings for non-success cases
      if (!isElementMrzSuccess) {
        console.warn('Помилка при встановленні МРЗ даних для елемента');
      }
      if (!isElementPzSuccess) {
        console.warn('Помилка при встановленні ПЗ даних для елемента');
      }
      
      if (importForAllTypes) {
        if (!isAllElementsMrzSuccess) {
          console.warn('Не всі елементи МРЗ було оновлено успішно');
        }
        if (!isAllElementsPzSuccess) {
          console.warn('Не всі елементи ПЗ було оновлено успішно');
        }
      }
      
      // Successfully imported
      console.log('Import successful');
      
      // Reset selected file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Set imported state
      setImported(true);
      setImportLoading(false);
      
      // Refresh the main table to show updated data
      console.log('Refreshing table data after import...');
      await handleSearch();
    } catch (error) {
      console.error('Import error:', error);
      
      // Format error message for display
      let errorMessage;
      if (error.message && error.message.startsWith('[object Object]')) {
        errorMessage = 'Помилка при імпорті: Неправильний формат даних';
      } else {
        errorMessage = `Помилка при імпорті: ${error.message}`;
      }
      
      alert(errorMessage);
      setImportLoading(false);
    }
  };

  // Reset imported state when popup closes
  useEffect(() => {
    if (!showPopup) {
      setImported(false);
    }
  }, [showPopup]);

  // Modify the triggerFileInput function to match Import.jsx
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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

          {data.length > 0 || searching ? (
            <>
              <div className="table-search">
                <input
                  type="text"
                  value={globalFilter ?? ''}
                  onChange={(e) => {
                    setGlobalFilter(e.target.value);
                  }}
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

              <div className="results">
                <div className="table-container">
                  <table>
                    <thead>
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{
                                asc: ' 🔼',
                                desc: ' 🔽',
                              }[header.column.getIsSorted()] ?? null}
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
                              <td key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    ) : (
                      <tbody>
                        <tr>
                          <td colSpan={columns.length}>
                            <div className="no-results">
                              {renderNoDataMessage()}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    )}
                  </table>
                </div>
                {/* Import Popup */}
                {showPopup && (
                  <div 
                    className="import-popup"
                    style={{ 
                      position: 'absolute',
                      left: `${popupPosition.x}px`,
                      top: `${popupPosition.y}px`,
                      width: '480px'
                    }}
                    ref={popupRef}
                  >
                    <div className="import-popup-header">Імпорт характеристик</div>
                    
                    {popupRowData && (
                      <div className="import-popup-element-name">
                        <div className="element-name-container">
                          <div className="element-name">
                            {popupRowData.NAME || popupRowData.name || 'Елемент'}
                          </div>
                          {(popupRowData.PTYPE_TXT || popupRowData.ptype_txt || popupRowData.Ptype_Txt) && (
                            <div className="element-type">
                              Тип: {popupRowData.PTYPE_TXT || popupRowData.ptype_txt || popupRowData.Ptype_Txt}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="import-popup-content">
                      <label className="import-option">
                        <input 
                          type="checkbox" 
                          checked={importForAllTypes}
                          onChange={(e) => {
                            setImportForAllTypes(e.target.checked);
                            // Reset import status when changing options
                            setImported(false);
                            setImportResults(null);
                          }}
                        /> 
                        Завантажити для всіх елементів цього типу 
                        {sameTypeCount > 0 && (
                          <span className="type-count">(знайдено {sameTypeCount} шт.)</span>
                        )}
                      </label>
                      <label className="import-option">
                        <input 
                          type="checkbox" 
                          checked={overwriteExisting}
                          onChange={(e) => {
                            setOverwriteExisting(e.target.checked);
                            // Reset import status when changing options
                            setImported(false);
                            setImportResults(null);
                          }}
                        /> Перезаписати існуючі спектри
                      </label>
                      <label className="import-option">
                        <input 
                          type="checkbox" 
                          checked={clearSets}
                          onChange={(e) => {
                            setClearSets(e.target.checked);
                            // Reset import status when changing options
                            setImported(false);
                            setImportResults(null);
                          }}
                        /> Очиститка спектрів у випадку порожніх даних
                      </label>
                      
                      <div className="import-file-container">
                        <div className="file-input-label">Файл Excel:</div>
                        <div className="file-input-container">
                          <div className="custom-file-input">
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept=".xlsx,.xls,.xlsm"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  setSelectedFile(e.target.files[0]);
                                  // Reset imported state when new file is selected
                                  setImported(false);
                                  setImportResults(null);
                                } else {
                                  setSelectedFile(null);
                                }
                              }}
                              className="hidden-file-input"
                            />
                            <button 
                              type="button" 
                              className="select-file-button"
                              onClick={triggerFileInput}
                              onFocus={(e) => e.target.blur()}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                                <path d="M8.5 8.5V6.5h2a.5.5 0 0 1 0 1h-2v1.5h2a.5.5 0 0 1 0 1h-2v1.5H10a.5.5 0 0 1 0 1H8.5V14H10a.5.5 0 0 1 0 1H6a.5.5 0 0 1 0-1h1.5v-1.5H6a.5.5 0 0 1 0-1h1.5V10H6a.5.5 0 0 1 0-1h1.5V7.5H6a.5.5 0 0 1 0-1h2V5z"/>
                              </svg>
                              Вибрати файл
                            </button>
                            <div className="file-display">
                              {selectedFile ? (
                                <div className="selected-file">
                                  <span className="file-name">{selectedFile.name}</span>
                                  <button
                                    type="button"
                                    className="remove-file-button"
                                    onClick={() => setSelectedFile(null)}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <span className="no-file">
                                  Файл не вибрано
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                                        <div className="import-popup-footer">
                      <div className="import-result-container">
                        {imported && importResults && (
                          <div className="import-results">
                            {/* Unified import statistics */}
                            <div className="result-section">
                              <div className="result-section-title">Статистика імпорту</div>
                              
                              {/* Element results */}
                              <div className={`result-item ${importResults.isElementMrzSuccess ? 'success' : 'fail'}`}>
                                МРЗ: {importResults.isElementMrzSuccess ? 'Успішно' : 'Вже існує'}
                              </div>
                              <div className={`result-item ${importResults.isElementPzSuccess ? 'success' : 'fail'}`}>
                                ПЗ: {importResults.isElementPzSuccess ? 'Успішно' : 'Вже існує'}
                              </div>
                              
                              {/* Statistics - always show */}
                              <div className="result-stats">
                                <div className="stat-item">
                                  <span className="stat-label">Загалом знайдено:</span>
                                  <span className="stat-value">
                                    {importForAllTypes ? (importResults.total_ek || 0) : 1} елементів
                                  </span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">МРЗ оновлено:</span>
                                  <span className="stat-value">
                                    {importResults.processed_mrz || 0} з {importForAllTypes ? (importResults.total_ek || 0) : 1}
                                  </span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">ПЗ оновлено:</span>
                                  <span className="stat-value">
                                    {importResults.processed_pz || 0} з {importForAllTypes ? (importResults.total_ek || 0) : 1}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Warning for partial failures - only if processing multiple elements */}
                              {importForAllTypes && (importResults.processed_mrz < importResults.total_ek || 
                                importResults.processed_pz < importResults.total_ek) && (
                                <div className="result-warning">
                                  ⚠ Деякі елементи не було оновлено
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <button 
                        className={`import-confirm-button ${imported ? 'imported' : ''} ${!selectedFile ? 'disabled' : ''}`}
                        onClick={handleImport}
                        disabled={importLoading || !selectedFile || imported}
                      >
                        {importLoading ? (
                          <span className="button-loading-indicator"></span>
                        ) : imported ? (
                          'Імпортовано'
                        ) : (
                          'Імпортувати'
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {table.getRowModel().rows.length > 0 && (
                  <div className="pagination">
                    <div className="pagination-controls">
                      <div className="pagination-buttons">
                        <button
                          onClick={() => table.setPageIndex(0)}
                          disabled={!table.getCanPreviousPage()}
                          title="First page"
                        >
                          {'<<'}
                        </button>
                        <button
                          onClick={() => table.previousPage()}
                          disabled={!table.getCanPreviousPage()}
                          title="Previous page"
                        >
                          {'<'}
                        </button>
                        <span className="page-info">
                          Сторінка{' '}
                          <strong>
                            {table.getState().pagination.pageIndex + 1} з{' '}
                            {table.getPageCount()}
                          </strong>
                        </span>
                        <button
                          onClick={() => table.nextPage()}
                          disabled={!table.getCanNextPage()}
                          title="Next page"
                        >
                          {'>'}
                        </button>
                        <button
                          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                          disabled={!table.getCanNextPage()}
                          title="Last page"
                        >
                          {'>>'}
                        </button>
                      </div>
                      <div className="pagination-right">
                        <input
                          type="number"
                          defaultValue={table.getState().pagination.pageIndex + 1}
                          onChange={e => {
                            const page = e.target.value ? Number(e.target.value) - 1 : 0
                            table.setPageIndex(page)
                          }}
                          className="page-input"
                          title="Go to page"
                        />
                        <select
                          value={table.getState().pagination.pageSize}
                          onChange={e => {
                            table.setPageSize(Number(e.target.value))
                          }}
                          title="Rows per page"
                        >
                          {[10, 20, 30, 40, 50].map(pageSize => (
                            <option key={pageSize} value={pageSize}>
                              {pageSize}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : !loading && !error ? (
            <div className="no-results">
              {renderNoDataMessage()}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Main; 