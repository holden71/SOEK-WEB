import { useState, useEffect } from 'react';

export const use3DModelsFetching = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch 3D models from backend on component mount
  useEffect(() => {
    const fetch3DModels = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/api/models_3d');
        if (!response.ok) {
          throw new Error('Failed to fetch 3D models');
        }
        const result = await response.json();
        const processedData = result.map(item => item.data);
        setData(processedData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetch3DModels();
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/models_3d');
      if (!response.ok) {
        throw new Error('Failed to fetch 3D models');
      }
      const result = await response.json();
      const processedData = result.map(item => item.data);
      setData(processedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteModel = async (modelId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/models_3d/${modelId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete 3D model');
      }

      // Remove the deleted model from local state
      setData(prevData => prevData.filter(model => model.MODEL_ID !== modelId));

      return { success: true, message: '3D модель успішно видалена' };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refreshData,
    setData,
    deleteModel
  };
};
