import React, { useState } from 'react';
import '../styles/TableActions.css';

const FileDownloadButton = ({ fileId, fileName }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.stopPropagation();
    
    if (downloading) return;
    
    setDownloading(true);
    
    try {
      console.log(`Downloading file ID: ${fileId}, fileName: ${fileName}`);
      
      const response = await fetch(`http://localhost:8000/api/files/${fileId}/download`);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      // Get the file as a blob
      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'type:', blob.type);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `file_${fileId}`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Помилка завантаження файлу: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button 
      className="tiny-import-button" 
      onClick={handleDownload}
      disabled={downloading}
      title={downloading ? "Завантаження..." : "Завантажити файл"}
    >
      {downloading ? '⏳' : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 1v8M2 7l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
};

export default FileDownloadButton;
