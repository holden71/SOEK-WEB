import React, { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import FilterSection from '../components/FilterSection';
import UnifiedTable from '../components/UnifiedTable';
import ImportPopup from '../components/ImportPopup';
import AnalysisModal from '../components/AnalysisModal';
import TableActions from '../components/TableActions';
import AddModelModal from '../components/AddModelModal';
import ViewModelsModal from '../components/ViewModelsModal';
import { useDataFetching } from '../hooks/useDataFetching';
import '../styles/index.css';

function Main() {
  // Data fetching hook
  const {
    selectedPlant,
    selectedUnit,
    selectedT,
    data,
    plants,
    units,
    terms,
    loading,
    searching,
    error,
    hasSearched,
    handlePlantChange,
    handleUnitChange,
    handleTChange,
    handleSearch,
    getUnitDefaultText,
    getTDefaultText,
    isSearchEnabled,
    setData
  } = useDataFetching();

  // Table state
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Import popup state
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [importPopupPosition, setImportPopupPosition] = useState({ x: 0, y: 0 });
  const [importPopupRowData, setImportPopupRowData] = useState(null);
  const [sameTypeCount, setSameTypeCount] = useState(0);

  // Analysis modal state
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisElementData, setAnalysisElementData] = useState(null);

  // Model modal states
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [showViewModelsModal, setShowViewModelsModal] = useState(false);
  const [currentElementData, setCurrentElementData] = useState(null);
  
  // Models availability cache
  const [modelsAvailability, setModelsAvailability] = useState({});

  const calculatePopupPosition = (rect) => {
            const popupWidth = 480;
    const popupHeight = 400;
            const margin = 10;
            
            let x = rect.left - 200;
            let y = rect.bottom + 5;
            
    // Check right boundary
            if (x + popupWidth > window.innerWidth - margin) {
              x = window.innerWidth - popupWidth - margin;
            }
            
    // Check left boundary
            if (x < margin) {
              x = margin;
            }
            
    // Check bottom boundary
            if (y + popupHeight > window.innerHeight - margin) {
              y = rect.top - popupHeight - 5;
              
              if (y < margin) {
                y = (window.innerHeight - popupHeight) / 2;
              }
            }
            
    return { x, y };
  };

  const handleImportClick = (e, row) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const position = calculatePopupPosition(rect);
    
    setImportPopupPosition(position);
    
            const rowData = row.original;
    console.log("Row data:", rowData);
    setImportPopupRowData(rowData);
            
            // Count items with the same ptype_id
            if (rowData && rowData.ptype_id) {
              const sameTypeItems = data.filter(item => item.ptype_id === rowData.ptype_id);
              setSameTypeCount(sameTypeItems.length);
            } else {
              setSameTypeCount(0);
            }
            
    setShowImportPopup(true);
  };

  const handleAnalysisClick = (e, row) => {
    const rowData = row.original;
    console.log("Analysis for row data:", rowData);
    console.log("Row data EK_ID:", rowData?.EK_ID);
    console.log("Row data ek_id:", rowData?.ek_id);
    console.log("Row data id:", rowData?.id);
    setAnalysisElementData(rowData);
    setShowAnalysisModal(true);
  };

  const handleAddModelClick = (e, row) => {
    const rowData = row.original;
    console.log("Add model for row data:", rowData);
    console.log("Row data EK_ID:", rowData?.EK_ID);
    setCurrentElementData(rowData);
    setShowAddModelModal(true);
  };

  const handleViewModelsClick = (e, row) => {
    const rowData = row.original;
    console.log("View models for row data:", rowData);
    console.log("Row data EK_ID:", rowData?.EK_ID);
    setCurrentElementData(rowData);
    setShowViewModelsModal(true);
  };

  // Check if element has linked models
  const checkElementModels = async (ekId) => {
    try {
      const response = await fetch(`/api/ek_models/check/${ekId}`);
      if (response.ok) {
        const result = await response.json();
        return result.has_models;
      }
      return false;
    } catch (error) {
      console.error('Error checking models for EK_ID:', ekId, error);
      return false;
    }
  };

  // Batch check models availability for all elements
  const checkModelsAvailabilityForData = async (elementData) => {
    if (!elementData || elementData.length === 0) return;
    
    const availability = {};
    const promises = elementData.map(async (element) => {
      const ekId = element.EK_ID || element.ek_id;
      if (ekId) {
        availability[ekId] = await checkElementModels(ekId);
      }
    });
    
    await Promise.all(promises);
    setModelsAvailability(availability);
  };

  // Effect to check models availability when data changes
  React.useEffect(() => {
    if (data && data.length > 0) {
      checkModelsAvailabilityForData(data);
    }
  }, [data]);

  const handleSearchRefresh = async () => {
      console.log('Refreshing table data after import...');
      await handleSearch();
    // Clear global filter to show updated data
    setGlobalFilter('');
  };

  // Handle delete selected items
  const handleDeleteSelected = async (selectedRows) => {
    // TODO: Implement delete functionality for main table
    console.log('Selected rows to delete:', selectedRows);
    alert(`Видалення елементів ЕК (${selectedRows.length} шт.) знаходиться в розробці`);
  };

  // Handle saving new 3D model with EK link
  const handleSaveModel = async (modelData) => {
    try {
      // First create the 3D model
      const response = await fetch('/api/models_3d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelData),
      });

      if (!response.ok) {
        // Handle non-JSON error responses
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
          } else {
            errorMessage = 'Server returned non-JSON response. Check API endpoint.';
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response for model creation');
      }

      const newModel = await response.json();
      console.log('Created 3D model:', newModel);

      // Get EK_ID from current element data
      const ekId = currentElementData?.EK_ID || currentElementData?.ek_id;
      
      if (!ekId) {
        throw new Error('EK_ID not found in element data');
      }

      // Create link between EK and 3D model
      const linkResponse = await fetch('/api/ek_models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ek_id: ekId,
          model_id: newModel.model_id,
          sh_name: `Model for EK ${ekId}`
        }),
      });

      if (!linkResponse.ok) {
        let errorMessage = `HTTP ${linkResponse.status}`;
        try {
          const linkContentType = linkResponse.headers.get('content-type');
          if (linkContentType && linkContentType.includes('application/json')) {
            const errorData = await linkResponse.json();
            errorMessage = errorData.detail || errorMessage;
          }
        } catch (parseError) {
          console.error('Failed to parse link error response:', parseError);
        }
        
        console.warn('Failed to link model to EK:', errorMessage);
        alert(`3D модель створено успішно, але виникла проблема з прив'язкою до елементу: ${errorMessage}`);
      } else {
        alert('3D модель успішно створено і прив\'язано до елементу!');
        
        // Update models availability cache
        setModelsAvailability(prev => ({
          ...prev,
          [ekId]: true
        }));
      }

      setShowAddModelModal(false);
      setCurrentElementData(null);

    } catch (error) {
      console.error('Error creating model:', error);
      
      // Handle specific JSON parsing errors
      if (error.message.includes('Unexpected token') || error.message.includes('Unexpected end of JSON')) {
        alert('Помилка: Сервер повернув неправильний формат відповіді. Перевірте налаштування API.');
      } else {
        alert(`Помилка створення моделі: ${error.message}`);
      }
    }
  };

  // Define custom columns for Main table
  const customColumns = useMemo(() => {
    if (data.length === 0) return [];

    const baseColumns = [
      {
        id: 'actions',
        header: '',
        size: 80,
        maxSize: 80,
        minSize: 80,
        cell: ({ row }) => {
          const ekId = row.original.EK_ID || row.original.ek_id;
          const hasModels = modelsAvailability[ekId] || false;
          
          return (
            <TableActions
              row={row}
              data={data}
              onImportClick={handleImportClick}
              onAnalysisClick={handleAnalysisClick}
              onAddModelClick={handleAddModelClick}
              onViewModelsClick={hasModels ? handleViewModelsClick : null}
            />
          );
        },
      }
    ];

    // Add data columns
    const dataColumns = Object.keys(data[0]).map(key => ({
      accessorKey: key,
      header: key,
      cell: info => {
        const content = info.getValue()?.toString() || '';

        const handleCopy = async (e) => {
          const element = e.currentTarget;
          try {
            await navigator.clipboard.writeText(content);
            // Добавляем класс для анимации ячейки
            setTimeout(() => {
              element.classList.add('copied');

              // Создаем label для уведомления
              const label = document.createElement('span');
              label.className = 'copy-label';
              label.textContent = '📋 Скопійовано!';
              label.style.position = 'fixed';
              label.style.zIndex = '9999';

              // Позиционируем label относительно курсора
              const rect = element.getBoundingClientRect();
              label.style.left = (rect.left + rect.width / 2) + 'px';
              label.style.top = (rect.top - 40) + 'px';
              label.style.transform = 'translateX(-50%)';

              document.body.appendChild(label);

              // Убираем анимацию через 800ms
              setTimeout(() => {
                element.classList.remove('copied');
                if (document.body.contains(label)) {
                  document.body.removeChild(label);
                }
              }, 800);
            }, 10);
          } catch (error) {
            console.error('Failed to copy text:', error);
            // Показываем ошибку копирования
            setTimeout(() => {
              element.classList.add('copy-error');

              const label = document.createElement('span');
              label.className = 'copy-label error';
              label.textContent = '❌ Помилка';
              label.style.position = 'fixed';
              label.style.zIndex = '9999';

              const rect = element.getBoundingClientRect();
              label.style.left = (rect.left + rect.width / 2) + 'px';
              label.style.top = (rect.top - 40) + 'px';
              label.style.transform = 'translateX(-50%)';

              document.body.appendChild(label);

              setTimeout(() => {
                element.classList.remove('copy-error');
                if (document.body.contains(label)) {
                  document.body.removeChild(label);
                }
              }, 1000);
            }, 10);
          }
        };

        return (
          <div className="cell-content-wrapper">
            <div
              className="cell-content"
              onClick={handleCopy}
            >
              <span className="cell-text">{content}</span>
            </div>
          </div>
        );
      },
    }));

    return [...baseColumns, ...dataColumns];
  }, [data, handleImportClick, handleAnalysisClick]);

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
        <FilterSection
          selectedPlant={selectedPlant}
          selectedUnit={selectedUnit}
          selectedT={selectedT}
          plants={plants}
          units={units}
          terms={terms}
          searching={searching}
          isSearchEnabled={isSearchEnabled}
          handlePlantChange={handlePlantChange}
          handleUnitChange={handleUnitChange}
          handleTChange={handleTChange}
          handleSearch={handleSearch}
          getUnitDefaultText={getUnitDefaultText}
          getTDefaultText={getTDefaultText}
        />

        {(data.length > 0 || searching || loading) && (
          <UnifiedTable
            data={data}
            title="перелік ЕК"
            loading={loading || searching}
            customColumns={customColumns}
            enableRowSelection={true}
            onDeleteSelected={handleDeleteSelected}
            className="main-table"
          />
        )}

        {!data.length && !searching && !loading && !error && (
          <div className="no-results">
            {!hasSearched
              ? "Виберіть параметри та натисніть \"Пошук\" для відображення даних"
              : "Пошук не дав результатів"
            }
                      </div>
                    )}
                    
        <ImportPopup
          showPopup={showImportPopup}
          setShowPopup={setShowImportPopup}
          popupPosition={importPopupPosition}
          popupRowData={importPopupRowData}
          sameTypeCount={sameTypeCount}
          selectedPlant={selectedPlant}
          selectedUnit={selectedUnit}
          onSearchRefresh={handleSearchRefresh}
        />

        <AnalysisModal
          isOpen={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          elementData={analysisElementData}
          selectedPlant={selectedPlant}
          selectedUnit={selectedUnit}
        />

        <AddModelModal
          isOpen={showAddModelModal}
          onClose={() => {
            setShowAddModelModal(false);
            setCurrentElementData(null);
          }}
          onSave={handleSaveModel}
        />

        <ViewModelsModal
          isOpen={showViewModelsModal}
          onClose={() => {
            setShowViewModelsModal(false);
            setCurrentElementData(null);
          }}
          ekId={currentElementData?.EK_ID || currentElementData?.ek_id}
          elementData={currentElementData}
          onModelsChanged={(ekId, hasModels) => {
            setModelsAvailability(prev => ({
              ...prev,
              [ekId]: hasModels
            }));
          }}
        />
      </div>
    </div>
  );
}

export default Main; 