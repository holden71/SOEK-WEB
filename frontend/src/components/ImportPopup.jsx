import React, { useState, useRef, useEffect } from 'react';

const ImportPopup = ({
  showPopup,
  setShowPopup,
  popupPosition,
  popupRowData,
  sameTypeCount,
  selectedPlant,
  selectedUnit,
  onSearchRefresh
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importForAllTypes, setImportForAllTypes] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [clearSets, setClearSets] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [imported, setImported] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const popupRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPopup && popupRef.current && !popupRef.current.contains(event.target)) {
        const importButton = event.target.closest('.tiny-import-button');
        if (!importButton) {
          setShowPopup(false);
        }
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showPopup) {
        setShowPopup(false);
      }
    };

    if (showPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPopup, setShowPopup]);

  // Reset imported state when popup closes
  useEffect(() => {
    if (!showPopup) {
      setImported(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setImportResults(null);
      setClearSets(false);
    }
  }, [showPopup]);

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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
      
      const analyzeResponse = await fetch('/api/analyze-excel', {
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
      
      const extractResponse = await fetch('/api/extract-sheet-data', {
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

      // Get EK_ID early for checking
      const ekId = popupRowData.EK_ID || popupRowData.ek_id;

      if (!ekId) {
        throw new Error('Не вдалося отримати ID елемента');
      }

      // The backend expects data according to the AccelData model
      const transformedData = {
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
        sheets: {},
        ek_id: ekId,
        can_overwrite: overwriteExisting ? 1 : 0
      };
      
      console.log("Transformed data for import:", transformedData);
      
      // Add sheet data to transformation (backend will handle normalization)
      transformedData.sheets[firstSheet.name] = {
        dempf: null,
        data: sheetData
      };
      
      // Step 4: Send data to backend
      console.log("Sending data to endpoint: /api/save-accel-data");
      console.log("Request body:", JSON.stringify(transformedData, null, 2));
      
      const saveResponse = await fetch('/api/save-accel-data', {
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
      
      const savedData = await saveResponse.json();
      console.log('Save response:', savedData);

      // Step 5: Call the stored procedure
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
      
      const procedureResponse = await fetch('/api/execute-set-all-ek-accel-set', {
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
      
      const procedureResult = await procedureResponse.json();
      console.log("Raw procedure result:", procedureResult);
      
      const isElementMrzSuccess = procedureResult.done_for_id_mrz === 1;
      const isElementPzSuccess = procedureResult.done_for_id_pz === 1;
      const isElementUpdateSuccess = isElementMrzSuccess && isElementPzSuccess;
      
      let isAllElementsMrzSuccess = null;
      let isAllElementsPzSuccess = null;
      let isAllElementsUpdateSuccess = null;
      
      if (importForAllTypes) {
        isAllElementsMrzSuccess = procedureResult.done_for_all_mrz === 1;
        isAllElementsPzSuccess = procedureResult.done_for_all_pz === 1;
        isAllElementsUpdateSuccess = isAllElementsMrzSuccess && isAllElementsPzSuccess;
      }
      
      setImportResults({
        done_for_id_mrz: procedureResult.done_for_id_mrz,
        done_for_id_pz: procedureResult.done_for_id_pz,
        done_for_all_mrz: procedureResult.done_for_all_mrz,
        done_for_all_pz: procedureResult.done_for_all_pz,
        total_ek: procedureResult.total_ek,
        processed_mrz: procedureResult.processed_mrz,
        processed_pz: procedureResult.processed_pz,
        isElementMrzSuccess,
        isElementPzSuccess,
        isElementUpdateSuccess,
        isAllElementsMrzSuccess,
        isAllElementsPzSuccess,
        isAllElementsUpdateSuccess
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setImported(true);
      setImportLoading(false);
      
      console.log('Refreshing table data after import...');
      await onSearchRefresh();
    } catch (error) {
      console.error('Import error:', error);
      
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

  if (!showPopup) return null;

  return (
    <div 
      className="import-popup"
      style={{ 
        position: 'fixed',
        left: `${popupPosition.x}px`,
        top: `${popupPosition.y}px`,
        width: '480px',
        zIndex: 1000
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
              <div className="result-section">
                <div className="result-section-title">Статистика імпорту</div>
                
                <div className={`result-item ${importResults.isElementMrzSuccess ? 'success' : 'fail'}`}>
                  МРЗ: {importResults.isElementMrzSuccess ? 'Успішно' : 'Вже існує'}
                </div>
                <div className={`result-item ${importResults.isElementPzSuccess ? 'success' : 'fail'}`}>
                  ПЗ: {importResults.isElementPzSuccess ? 'Успішно' : 'Вже існує'}
                </div>
                
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
  );
};

export default ImportPopup; 