import React, { useState } from 'react';
import Model3DDownloadModal from './Model3DDownloadModal';
import '../styles/TableActions.css';

const Model3DDownloadButton = ({ modelData }) => {
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleButtonClick = (e) => {
    e.stopPropagation();
    setShowModal(true);
  };

  const handleDownload = async (includeMultimedia) => {
    setDownloading(true);
    
    try {
      // Get model ID from different possible field names
      const modelId = modelData?.MODEL_ID || modelData?.model_id || modelData?.id;
      
      if (!modelId) {
        throw new Error('ID моделі не знайдено');
      }

      console.log(`Downloading 3D model ID: ${modelId}, includeMultimedia: ${includeMultimedia}`);
      
      // Build the download URL with multimedia parameter
      const downloadUrl = `http://localhost:8000/api/models_3d/${modelId}/download?include_multimedia=${includeMultimedia}`;
      
      console.log(`Making request to: ${downloadUrl}`);
      
      const response = await fetch(downloadUrl);
      
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
      
      // Log Content-Disposition header for debugging
      const disposition = response.headers.get('content-disposition');
      console.log('Content-Disposition:', disposition);
      
      // Get filename from server's Content-Disposition header or use fallback
      let fileName;
      if (includeMultimedia) {
        fileName = `model_${modelId}_with_multimedia.zip`;
      } else {
        // Try to get filename from Content-Disposition header first
        if (disposition) {
          const match = disposition.match(/filename="([^"]*)"/) || disposition.match(/filename=([^;]*)/);
          if (match && match[1]) {
            fileName = match[1];
          }
        }
        // Simple fallback if server didn't provide filename
        if (!fileName) {
          fileName = `model_${modelId}`;
        }
      }
      
      console.log(`Final filename: ${fileName}`);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setShowModal(false);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Помилка завантаження 3D моделі: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleCloseModal = () => {
    if (!downloading) {
      setShowModal(false);
    }
  };

  return (
    <>
      <button 
        className="tiny-import-button" 
        onClick={handleButtonClick}
        disabled={downloading}
        title="Завантажити 3D модель"
      >
        {downloading ? '⏳' : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 1v8M2 7l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      
      <Model3DDownloadModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onDownload={handleDownload}
        modelData={modelData}
        loading={downloading}
      />
    </>
  );
};

export default Model3DDownloadButton;
