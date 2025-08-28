import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import UnifiedTable from '../components/UnifiedTable';
import ModeSwitcher from '../components/ModeSwitcher';
import AddFileTypeModal from '../components/AddFileTypeModal';
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
    error: modelsError
  } = use3DModelsFetching();

  const {
    data: filesData,
    loading: filesLoading,
    error: filesError
  } = useFilesFetching();

  const {
    data: fileTypesData,
    loading: fileTypesLoading,
    error: fileTypesError,
    createFileType
  } = useFileTypesFetching();

  // Modal states
  const [showAddFileTypeModal, setShowAddFileTypeModal] = useState(false);

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
      case 'models_3d':
      case 'files':
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
    return currentMode === 'file_types'; // Пока только для типов файлов
  };

  // Handle saving new file type
  const handleSaveFileType = async (fileTypeData) => {
    await createFileType(fileTypeData);
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
    </div>
  );
}

export default Models3D;
