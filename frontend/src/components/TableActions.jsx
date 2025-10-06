import React from 'react';
import TableActionsMenu from './TableActionsMenu';

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

const TableActions = ({ 
  row, 
  data, 
  onImportClick, 
  onAnalysisClick,
  onAddModelClick,
  onViewModelsClick 
}) => {
  const actions = [
    {
      key: 'analysis',
      label: 'Аналіз спектрів',
      onClick: onAnalysisClick
    },
    {
      key: 'view_models',
      label: 'Переглянути 3D модель',
      onClick: onViewModelsClick,
      condition: async (row) => {
        if (!onViewModelsClick) return false;

        const ekId = row?.original?.EK_ID || row?.original?.ek_id;
        if (!ekId) return false;

        return await checkElementModels(ekId);
      }
    },
    {
      key: 'add_model',
      label: 'Завантажити 3D модель',
      onClick: onAddModelClick,
      condition: () => !!onAddModelClick
    },
    {
      key: 'import',
      label: 'Імпорт характеристик',
      onClick: onImportClick
    }
  ];

  return (
    <TableActionsMenu 
      actions={actions}
      row={row}
      lazy={true}
    />
  );
};

export default TableActions;