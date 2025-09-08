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
        console.log('Raw API response:', result); // Debug logging
        console.log('First item structure:', result[0]); // Debug logging
        const processedData = result.map(item => item.data);
        console.log('Processed data:', processedData); // Debug logging
        console.log('First processed item:', processedData[0]); // Debug logging
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

      return { success: true, message: '3D модель та пов\'язаний файл успішно видалені' };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const createModel = async (modelData) => {
    try {
      const response = await fetch('http://localhost:8000/api/models_3d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create 3D model');
      }

      const result = await response.json();
      console.log('Create model API response:', result);
      const createdModel = result.data;
      console.log('Created model data:', createdModel);

      // Instead of manually adding to local state, refresh data from server
      // This ensures data consistency and proper formatting
      await refreshData();

      return { success: true, message: '3D модель успішно створена', data: createdModel };
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
    deleteModel,
    createModel
  };
};
