import { useState, useEffect } from 'react';

export const useFileTypesFetching = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch file types from backend on component mount
  useEffect(() => {
    const fetchFileTypes = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/api/file_types');
        if (!response.ok) {
          throw new Error('Failed to fetch file types');
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

    fetchFileTypes();
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/file_types');
      if (!response.ok) {
        throw new Error('Failed to fetch file types');
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

  const createFileType = async (fileTypeData) => {
    try {
      const response = await fetch('http://localhost:8000/api/file_types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fileTypeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create file type');
      }

      // После успешного создания перезагружаем все данные
      await refreshData();

      return response.json();
    } catch (err) {
      console.error('Error creating file type:', err);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    refreshData,
    setData,
    createFileType
  };
};
