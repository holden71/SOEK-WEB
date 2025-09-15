import { useState, useCallback } from 'react';

export const useMultimediaFetching = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = 'http://localhost:8000/api';

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching multimedia data...');
      const response = await fetch(`${API_BASE_URL}/multimedia`);
      console.log('Multimedia response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      console.log('Multimedia response data:', result);
      
      // Extract data from response format
      const extractedData = result.map(item => item.data || item);
      console.log('Extracted multimedia data:', extractedData);
      
      setData(extractedData);
    } catch (err) {
      console.error('Error fetching multimedia data:', err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteMultimedia = useCallback(async (multimedId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/multimedia/${multimedId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // Remove the deleted multimedia from local state
      setData(prevData => prevData.filter(item => {
        const id = item.MULTIMED_3D_ID || item.multimed_3d_id;
        return id !== multimedId;
      }));

      return { success: true };
    } catch (err) {
      console.error('Error deleting multimedia:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    refreshData,
    deleteMultimedia
  };
};
