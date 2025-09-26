import { useState, useEffect, useCallback } from 'react';

export const useAllowedExtensions = () => {
  const [allowedExtensions, setAllowedExtensions] = useState([]);
  const [acceptString, setAcceptString] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = '/api';

  const fetchAllowedExtensions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/file_types/extensions/allowed`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setAllowedExtensions(result.allowed_extensions || []);
      setAcceptString(result.accept_string || '');
    } catch (err) {
      console.error('Error fetching allowed extensions:', err);
      setError(err.message);
      setAllowedExtensions([]);
      setAcceptString('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllowedExtensions();
  }, [fetchAllowedExtensions]);

  // Validate file extension
  const validateFileExtension = useCallback((fileName) => {
    if (!fileName || allowedExtensions.length === 0) {
      return { isValid: false, message: 'Файл не вибрано або список дозволених розширень не завантажено' };
    }

    const fileExtension = '.' + fileName.split('.').pop().toLowerCase();
    const isAllowed = allowedExtensions.some(ext => ext.extension.toLowerCase() === fileExtension);

    if (!isAllowed) {
      const allowedList = allowedExtensions.map(ext => ext.extension).join(', ');
      return {
        isValid: false,
        message: `Розширення "${fileExtension}" не дозволено. Дозволені розширення: ${allowedList}`
      };
    }

    return { isValid: true, message: '' };
  }, [allowedExtensions]);

  // Get user-friendly description for extension
  const getExtensionInfo = useCallback((fileName) => {
    if (!fileName || allowedExtensions.length === 0) {
      return null;
    }

    const fileExtension = '.' + fileName.split('.').pop().toLowerCase();
    const extensionInfo = allowedExtensions.find(ext => ext.extension.toLowerCase() === fileExtension);
    
    return extensionInfo || null;
  }, [allowedExtensions]);

  return {
    allowedExtensions,
    acceptString,
    loading,
    error,
    validateFileExtension,
    getExtensionInfo,
    refreshExtensions: fetchAllowedExtensions
  };
};
