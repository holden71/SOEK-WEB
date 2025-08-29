import React, { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import FilterSection from '../components/FilterSection';
import UnifiedTable from '../components/UnifiedTable';
import ImportPopup from '../components/ImportPopup';
import AnalysisModal from '../components/AnalysisModal';
import TableActions from '../components/TableActions';
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
        cell: ({ row }) => (
          <TableActions
            row={row}
            data={data}
            onImportClick={handleImportClick}
            onAnalysisClick={handleAnalysisClick}
          />
        ),
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
      </div>
    </div>
  );
}

export default Main; 