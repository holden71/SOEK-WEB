import React, { useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import UnifiedTable from '../components/UnifiedTable';
import ModeSwitcher from '../components/ModeSwitcher';
import AddFileTypeModal from '../components/AddFileTypeModal';
import AddFileModal from '../components/AddFileModal';
import AddModelModal from '../components/AddModelModal';
import FileDownloadButton from '../components/FileDownloadButton';
import Model3DDownloadButton from '../components/Model3DDownloadButton';
import MediaViewerButton from '../components/MediaViewerButton';
import TableActionsMenu from '../components/TableActionsMenu';
import MediaGalleryModal from '../components/MediaGalleryModal';
import Model3DDownloadModal from '../components/Model3DDownloadModal';
import { use3DModelsFetching } from '../hooks/use3DModelsFetching';
import { useFilesFetching } from '../hooks/useFilesFetching';
import { useFileTypesFetching } from '../hooks/useFileTypesFetching';
import { useMultimediaFetching } from '../hooks/useMultimediaFetching';
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

  const {
    data: multimediaData,
    loading: multimediaLoading,
    error: multimediaError,
    deleteMultimedia,
    refreshData: refreshMultimediaData
  } = useMultimediaFetching();

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
      case 'multimedia':
        refreshMultimediaData();
        break;
      default:
        break;
    }
  }, [currentMode]); // Only depend on currentMode to avoid infinite loops

  // Modal states
  const [showAddFileTypeModal, setShowAddFileTypeModal] = useState(false);
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  
  // Model actions modal states
  const [showMediaGalleryModal, setShowMediaGalleryModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [currentModelData, setCurrentModelData] = useState(null);
  const [downloading, setDownloading] = useState(false);

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
    },
    {
      key: 'multimedia',
      label: 'Мультимедія',
      description: 'Перегляд та управління мультімедіа файлами'
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
        return { data: multimediaData, loading: multimediaLoading, error: multimediaError };
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
    // Multimedia mode only for viewing and deleting, no adding
  };

  // Handle media viewer action
  const handleViewMedia = (e, row) => {
    e.stopPropagation();
    setCurrentModelData(row.original);
    setShowMediaGalleryModal(true);
  };

  // Handle download action
  const handleDownload = (e, row) => {
    e.stopPropagation();
    setCurrentModelData(row.original);
    setShowDownloadModal(true);
  };

  // Handle actual model download
  const handleModelDownload = async (includeMultimedia) => {
    setDownloading(true);
    
    try {
      const modelId = currentModelData?.MODEL_ID || currentModelData?.model_id || currentModelData?.id;
      
      if (!modelId) {
        throw new Error('ID моделі не знайдено');
      }

      const downloadUrl = `/api/models_3d/${modelId}/download?include_multimedia=${includeMultimedia}`;
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition');
      
      let fileName;
      if (includeMultimedia) {
        fileName = `model_${modelId}_with_multimedia.zip`;
      } else {
        if (disposition) {
          const match = disposition.match(/filename="([^"]*)"/) || disposition.match(/filename=([^;]*)/);
          if (match && match[1]) {
            fileName = match[1];
          }
        }
        if (!fileName) {
          fileName = `model_${modelId}`;
        }
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setShowDownloadModal(false);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Помилка завантаження 3D моделі: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  // Handle file download
  const handleFileDownload = async (fileId, fileName) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `file_${fileId}`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Помилка завантаження файлу: ${error.message}`);
    }
  };

  // Define custom columns for 3D models table
  const customModelsColumns = useMemo(() => {
    if (currentMode !== 'models_3d' || modelsData.length === 0) return null;

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
        const modelData = row.original;
        
        const actions = [
          {
            key: 'view_media',
            label: 'Переглянути мультимедіа',
            onClick: handleViewMedia,
            condition: async (row) => {
              try {
                const modelId = modelData.MODEL_ID || modelData.model_id || modelData.id;
                if (!modelId) return false;
                
                const response = await fetch(`/api/multimedia/model/${modelId}/check`);
                if (response.ok) {
                  const result = await response.json();
                  return result.has_multimedia && result.multimedia_count > 0;
                }
                return false;
              } catch (error) {
                console.error('Error checking multimedia:', error);
                return false;
              }
            }
          },
          {
            key: 'download',
            label: 'Завантажити модель',
            onClick: handleDownload
          }
        ];

        return (
          <TableActionsMenu 
            actions={actions}
            row={row}
            lazy={true}
          />
        );
      },
    };

    const baseColumns = [checkboxColumn, actionsColumn];

    // Add data columns
    const dataColumns = Object.keys(modelsData[0]).map(key => ({
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
  }, [currentMode, modelsData]);

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
        const fileData = row.original;
        
        const actions = [
          {
            key: 'download',
            label: 'Завантажити файл',
            onClick: (e, row) => {
              e.stopPropagation();
              const fileId = fileData.FILE_ID || fileData.file_id;
              const fileName = fileData.FILE_NAME || fileData.file_name;
              
              // Handle file download logic
              handleFileDownload(fileId, fileName);
            }
          }
        ];

        return (
          <TableActionsMenu 
            actions={actions}
            row={row}
            lazy={false}
          />
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

  // Define custom columns for multimedia table - simplified version
  const customMultimediaColumns = useMemo(() => {
    if (currentMode !== 'multimedia') return null;
    
    // If no data, return empty array (table will show "No data" message)
    if (!multimediaData || multimediaData.length === 0) {
      return [];
    }

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

    // Simple data columns without actions column
    const dataColumns = Object.keys(multimediaData[0]).map(key => ({
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

        return (
          <div className="cell-content-wrapper">
            <div
              className="cell-content"
              onClick={handleCopy}
              title={content}
            >
              <span className="cell-text">{content}</span>
            </div>
          </div>
        );
      },
    }));

    return [checkboxColumn, ...dataColumns];
  }, [currentMode, multimediaData]);

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

        case 'multimedia':
          for (const row of selectedRows) {
            try {
              // Try different possible field names for MULTIMED_3D_ID
              const multimedId = row.MULTIMED_3D_ID || row.multimed_3d_id || row.id;
              if (!multimedId) {
                throw new Error(`Не вдалося знайти ID мультимедіа запису. Доступні поля: ${Object.keys(row).join(', ')}`);
              }
              await deleteMultimedia(multimedId);
            } catch (error) {
              const multimedId = row.MULTIMED_3D_ID || row.multimed_3d_id || row.id || 'невідомий';
              errorMessages.push(`Помилка видалення мультимедіа ${multimedId}: ${error.message}`);
            }
          }
          // Refresh data after successful deletions
          await refreshMultimediaData();
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
          customColumns={
            currentMode === 'models_3d' 
              ? customModelsColumns 
              : currentMode === 'files' 
                ? customFilesColumns 
                : currentMode === 'multimedia'
                  ? customMultimediaColumns
                  : null
          }
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

      {/* Model Actions Modals */}
      {showMediaGalleryModal && (
        <MediaGalleryModal
          isOpen={showMediaGalleryModal}
          onClose={() => {
            setShowMediaGalleryModal(false);
            setCurrentModelData(null);
          }}
          modelData={currentModelData}
        />
      )}

      <Model3DDownloadModal
        isOpen={showDownloadModal}
        onClose={() => {
          if (!downloading) {
            setShowDownloadModal(false);
            setCurrentModelData(null);
          }
        }}
        onDownload={handleModelDownload}
        modelData={currentModelData}
        loading={downloading}
      />

    </div>
  );
}

export default Models3D;
