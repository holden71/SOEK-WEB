import { useState, useEffect } from 'react';

export const useFilesFetching = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch files from backend on component mount
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/api/files');
        if (!response.ok) {
          throw new Error('Failed to fetch files');
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

    fetchFiles();
  }, []);

  const refreshData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/files');
      if (!response.ok) {
        throw new Error('Failed to fetch files');
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

  const deleteFile = async (fileId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete file');
      }

      // Remove the deleted file from local state
      setData(prevData => prevData.filter(file => file.FILE_ID !== fileId));

      return { success: true, message: 'Файл успішно видалений' };
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
    deleteFile
  };
};
