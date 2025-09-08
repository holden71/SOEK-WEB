import React, { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import UnifiedTable from '../components/UnifiedTable';
import ModeSwitcher from '../components/ModeSwitcher';
import AddFileTypeModal from '../components/AddFileTypeModal';
import AddFileModal from '../components/AddFileModal';
import AddModelModal from '../components/AddModelModal';
import FileDownloadButton from '../components/FileDownloadButton';
import { use3DModelsFetching } from '../hooks/use3DModelsFetching';
import { useFilesFetching } from '../hooks/useFilesFetching';
import { useFileTypesFetching } from '../hooks/useFileTypesFetching';
import '../styles/index.css';

function Models3D() {
  // Mode state
  const [currentMode, setCurrentMode] = useState('models_3d');

  // Table state (only globalFilter, sorting handled by UnifiedTable)
  const [globalFilter, setGlobalFilter] = useState('');

  // Data fetching hooks
  const {
    data: modelsData,
    loading: modelsLoading,
    error: modelsError,
    deleteModel,
    createModel,
    refreshData: refreshModelsData
  } = use3DModelsFetching();

  const {
    data: filesData,
    loading: filesLoading,
    error: filesError,
    createFile,
    deleteFile,
    refreshData: refreshFilesData
  } = useFilesFetching();

  const {
    data: fileTypesData,
    loading: fileTypesLoading,
    error: fileTypesError,
    createFileType,
    deleteFileType,
    refreshData: refreshFileTypesData
  } = useFileTypesFetching();

  // Refresh data when switching tabs
  React.useEffect(() => {
    switch (currentMode) {
      case 'models_3d':
        refreshModelsData();
        break;
      case 'files':
        refreshFilesData();
        break;
      case 'file_types':
        refreshFileTypesData();
        break;
      default:
        break;
    }
  }, [currentMode]); // Only depend on currentMode to avoid infinite loops

  // Modal states
  const [showAddFileTypeModal, setShowAddFileTypeModal] = useState(false);
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [showAddModelModal, setShowAddModelModal] = useState(false);

  // Define available modes
  const modes = [
    {
      key: 'models_3d',
      label: '3D Моделі',
      description: 'Перегляд та управління 3D моделями'
    },
    {
      key: 'files',
      label: 'Файли',
      description: 'Перегляд та управління файлами'
    },
    {
      key: 'file_types',
      label: 'Типи файлів',
      description: 'Перегляд та управління типами файлів'
    }
  ];

  // Get current data based on mode
  const getCurrentData = () => {
    switch (currentMode) {
      case 'models_3d':
        return { data: modelsData, loading: modelsLoading, error: modelsError };
      case 'files':
        return { data: filesData, loading: filesLoading, error: filesError };
      case 'file_types':
        return { data: fileTypesData, loading: fileTypesLoading, error: fileTypesError };
      default:
        return { data: modelsData, loading: modelsLoading, error: modelsError };
    }
  };

  const { data, loading, error } = getCurrentData();

  // Get title based on current mode
  const getPageTitle = () => {
    const mode = modes.find(m => m.key === currentMode);
    return mode ? mode.label : '3D Моделі';
  };

  // Handle add button click based on current mode
  const handleAddClick = () => {
    switch (currentMode) {
      case 'file_types':
        setShowAddFileTypeModal(true);
        break;
      case 'files':
        setShowAddFileModal(true);
        break;
      case 'models_3d':
        setShowAddModelModal(true);
        break;
      default:
        break;
    }
  };

  // Check if add functionality is available for current mode
  const isAddAvailable = () => {
    return currentMode === 'file_types' || currentMode === 'files' || currentMode === 'models_3d';
  };

  // Define custom columns for files table
  const customFilesColumns = useMemo(() => {
    if (currentMode !== 'files' || filesData.length === 0) return null;

    // Add checkbox column for row selection
    const checkboxColumn = {
      id: 'select',
      header: ({ table }) => {
        const isAllSelected = table.getIsAllRowsSelected();
        const isSomeSelected = table.getIsSomeRowsSelected();

        return (
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={table.getToggleAllRowsSelectedHandler()}
            ref={(el) => {
              if (el) el.indeterminate = isSomeSelected && !isAllSelected;
            }}
          />
        );
      },
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      size: 40,
      enableSorting: false,
      enableFiltering: false,
    };

    const actionsColumn = {
      id: 'actions',
      header: '',
      size: 60,
      maxSize: 60,
      minSize: 60,
      cell: ({ row }) => {
        const fileId = row.original.FILE_ID || row.original.file_id;
        const fileName = row.original.FILE_NAME || row.original.file_name;
        
        return (
          <div className="table-actions-container">
            <FileDownloadButton 
              fileId={fileId} 
              fileName={fileName} 
            />
          </div>
        );
      },
    };

    const baseColumns = [checkboxColumn, actionsColumn];

    // Add data columns
    const dataColumns = Object.keys(filesData[0]).map(key => ({
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
          }
        };

        const handleMouseMove = (e) => {
          const tooltip = e.currentTarget.querySelector('.cell-tooltip');
          if (tooltip) {
            const x = e.clientX;
            const y = e.clientY;
            tooltip.style.left = `${x + 10}px`;
            tooltip.style.top = `${y - 10}px`;
          }
        };

        return (
          <div className="cell-content-wrapper">
            <div
              className="cell-content"
              onClick={handleCopy}
              onMouseMove={handleMouseMove}
              title={content}
            >
              <span className="cell-text">{content}</span>
              <span className="cell-tooltip">{content}</span>
            </div>
          </div>
        );
      },
    }));

    return [...baseColumns, ...dataColumns];
  }, [currentMode, filesData]);

  // Handle saving new file type
  const handleSaveFileType = async (fileTypeData) => {
    await createFileType(fileTypeData);
  };

  // Handle saving new file
  const handleSaveFile = async (fileData) => {
    await createFile(fileData);
  };

  // Handle saving new 3D model
  const handleSaveModel = async (modelData) => {
    await createModel(modelData);
  };

  // Handle delete selected items
  const handleDeleteSelected = async (selectedRows) => {
    try {
      let errorMessages = [];

      switch (currentMode) {
        case 'models_3d':
          for (const row of selectedRows) {
            try {
              console.log('Row data:', row); // Debug logging
              console.log('Available fields:', Object.keys(row)); // Debug logging

              // Try different possible field names for MODEL_ID
              const modelId = row.MODEL_ID || row.model_id || row.id;
              if (!modelId) {
                throw new Error(`Не вдалося знайти ID моделі. Доступні поля: ${Object.keys(row).join(', ')}`);
              }

              await deleteModel(modelId);
            } catch (error) {
              const modelId = row.MODEL_ID || row.model_id || row.id || 'невідомий';
              errorMessages.push(`Помилка видалення моделі ${modelId}: ${error.message}`);
            }
          }
          // Refresh data after successful deletions
          await refreshModelsData();
          break;

        case 'files':
          for (const row of selectedRows) {
            try {
              // Try different possible field names for FILE_ID
              const fileId = row.FILE_ID || row.file_id || row.id;
              if (!fileId) {
                throw new Error(`Не вдалося знайти ID файлу. Доступні поля: ${Object.keys(row).join(', ')}`);
              }
              await deleteFile(fileId);
            } catch (error) {
              const fileId = row.FILE_ID || row.file_id || row.id || 'невідомий';
              errorMessages.push(`Помилка видалення файлу ${fileId}: ${error.message}`);
            }
          }
          // Refresh data after successful deletions
          await refreshFilesData();
          break;

        case 'file_types':
          for (const row of selectedRows) {
            try {
              // Try different possible field names
              const id = row.FILE_TYPE_ID || row.file_type_id || row.id;
              if (!id) {
                throw new Error('Не вдалося знайти ID типу файлу');
              }
              await deleteFileType(id);
            } catch (error) {
              errorMessages.push(`Помилка видалення типу файлу: ${error.message}`);
            }
          }
          // Refresh data after successful deletions
          await refreshFileTypesData();
          break;

        default:
          alert(`Видалення для "${getPageTitle()}" не підтримується`);
          return;
      }

      // Show only error messages
      if (errorMessages.length > 0) {
        alert(`Помилки видалення:\n${errorMessages.join('\n')}`);
      }

    } catch (error) {
      alert(`Критична помилка: ${error.message}`);
    }
  };

  if (loading) {
    return <div>Loading {getPageTitle().toLowerCase()}...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="main-page">
      <PageHeader title={getPageTitle()} />
      <div className="main-content">
        <ModeSwitcher
          currentMode={currentMode}
          onModeChange={setCurrentMode}
          modes={modes}
        />

        <UnifiedTable
          data={data}
          title={getPageTitle()}
          loading={loading}
          onAddClick={isAddAvailable() ? handleAddClick : null}
          showAddButton={isAddAvailable()}
          enableRowSelection={true}
          onDeleteSelected={handleDeleteSelected}
          customColumns={currentMode === 'files' ? customFilesColumns : null}
          className="models-table"
        />
      </div>

      {/* Modals */}
      <AddFileTypeModal
        isOpen={showAddFileTypeModal}
        onClose={() => setShowAddFileTypeModal(false)}
        onSave={handleSaveFileType}
      />
      <AddFileModal
        isOpen={showAddFileModal}
        onClose={() => setShowAddFileModal(false)}
        onSave={handleSaveFile}
      />
      <AddModelModal
        isOpen={showAddModelModal}
        onClose={() => setShowAddModelModal(false)}
        onSave={handleSaveModel}
      />

    </div>
  );
}

export default Models3D;
