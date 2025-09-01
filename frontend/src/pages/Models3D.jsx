import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import UnifiedTable from '../components/UnifiedTable';
import ModeSwitcher from '../components/ModeSwitcher';
import AddFileTypeModal from '../components/AddFileTypeModal';
import AddFileModal from '../components/AddFileModal';
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

  // Modal states
  const [showAddFileTypeModal, setShowAddFileTypeModal] = useState(false);
  const [showAddFileModal, setShowAddFileModal] = useState(false);

  // Define available modes
  const modes = [
    {
      key: 'models_3d',
      label: '3D Моделі',
      icon: '🏗️',
      description: 'Перегляд та управління 3D моделями'
    },
    {
      key: 'files',
      label: 'Файли',
      icon: '📁',
      description: 'Перегляд та управління файлами'
    },
    {
      key: 'file_types',
      label: 'Типи файлів',
      icon: '🏷️',
      description: 'Перегляд та управління типами файлів'
    },
    {
      key: 'multimedia',
      label: 'Мультимедія',
      icon: '🎬',
      description: 'Мультимедійні файли (в розробці)'
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
      case 'multimedia':
        return { data: [], loading: false, error: null };
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
        // Refresh file types data before opening modal
        refreshFileTypesData();
        setShowAddFileModal(true);
        break;
      case 'models_3d':
      case 'multimedia':
        // TODO: Implement add functionality for other modes
        alert(`Функціонал додавання для "${getPageTitle()}" знаходиться в розробці`);
        break;
      default:
        break;
    }
  };

  // Check if add functionality is available for current mode
  const isAddAvailable = () => {
    return currentMode === 'file_types' || currentMode === 'files';
  };

  // Handle saving new file type
  const handleSaveFileType = async (fileTypeData) => {
    await createFileType(fileTypeData);
  };

  // Handle saving new file
  const handleSaveFile = async (fileData) => {
    await createFile(fileData);
  };

  // Handle delete selected items
  const handleDeleteSelected = async (selectedRows) => {
    try {
      let errorMessages = [];

      switch (currentMode) {
        case 'models_3d':
          for (const row of selectedRows) {
            try {
              await deleteModel(row.MODEL_ID);
            } catch (error) {
              errorMessages.push(`Помилка видалення моделі ${row.MODEL_ID}: ${error.message}`);
            }
          }
          // Refresh data after successful deletions
          await refreshModelsData();
          break;

        case 'files':
          for (const row of selectedRows) {
            try {
              await deleteFile(row.FILE_ID);
            } catch (error) {
              errorMessages.push(`Помилка видалення файлу ${row.FILE_ID}: ${error.message}`);
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

        {currentMode === 'multimedia' ? (
          <div className="multimedia-placeholder">
            <h3>🎬 Мультимедія</h3>
            <p>Цей розділ знаходиться в розробці</p>
          </div>
        ) : (
          <>
            <UnifiedTable
              data={data}
              title={getPageTitle()}
              loading={loading}
              onAddClick={isAddAvailable() ? handleAddClick : null}
              showAddButton={isAddAvailable()}
              enableRowSelection={true}
              onDeleteSelected={handleDeleteSelected}
              className="models-table"
            />
          </>
        )}
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
        fileTypes={fileTypesData}
      />


    </div>
  );
}

export default Models3D;
