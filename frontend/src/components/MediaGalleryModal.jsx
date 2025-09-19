import React, { useState, useEffect } from 'react';
import PDFViewer from './PDFViewer';
import '../styles/MediaGalleryModal.css';

const MediaGalleryModal = ({ isOpen, onClose, modelData }) => {
  const [multimediaFiles, setMultimediaFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = 'http://localhost:8000/api';

  useEffect(() => {
    if (isOpen) {
      fetchMultimediaFiles();
    }
  }, [isOpen, modelData]);

  const fetchMultimediaFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const modelId = modelData?.MODEL_ID || modelData?.model_id || modelData?.id;
      if (!modelId) {
        throw new Error('ID моделі не знайдено');
      }

      const response = await fetch(`${API_BASE_URL}/multimedia/model/${modelId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const allFiles = result.multimedia_files;
      const images = allFiles.filter(file => file.IS_IMAGE);
      const pdfs = allFiles.filter(file => file.IS_PDF);
      
      setMultimediaFiles(allFiles);
      setImageFiles(images);
      setPdfFiles(pdfs);
      
      // Set first file as selected if available
      if (allFiles.length > 0) {
        setSelectedFile(allFiles[0]);
      }
    } catch (err) {
      console.error('Error fetching multimedia files:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const createImageDataUrl = (base64Data, extension) => {
    if (!base64Data) return null;
    
    // Determine MIME type based on extension
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.tiff': 'image/tiff'
    };

    const mimeType = mimeTypes[extension?.toLowerCase()] || 'image/jpeg';
    return `data:${mimeType};base64,${base64Data}`;
  };

  const createPdfBlobUrl = (base64Data) => {
    if (!base64Data) return null;
    
    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create blob and URL
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  };

  const downloadFile = (file) => {
    if (!file.FILE_CONTENT_BASE64) return;
    
    let url;
    if (file.IS_IMAGE) {
      url = createImageDataUrl(file.FILE_CONTENT_BASE64, file.FILE_EXTENSION);
    } else if (file.IS_PDF) {
      url = createPdfBlobUrl(file.FILE_CONTENT_BASE64);
    } else {
      return;
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.download = file.FILE_NAME || 'multimedia_file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL
    if (file.IS_PDF) {
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="media-gallery-overlay" onClick={handleOverlayClick}>
      <div className="media-gallery-modal">
        <div className="media-gallery-header">
          <h3>Мультимедіа для моделі {modelData?.SH_NAME || modelData?.sh_name || 'невідомої'}</h3>
          <button className="close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="media-gallery-content">
          {loading && (
            <div className="media-gallery-loading">
              <div className="spinner"></div>
              <p>Завантаження мультимедіа файлів...</p>
            </div>
          )}

          {error && (
            <div className="media-gallery-error">
              <p>Помилка завантаження: {error}</p>
              <button onClick={fetchMultimediaFiles} className="retry-button">
                Спробувати знову
              </button>
            </div>
          )}

          {!loading && !error && multimediaFiles.length === 0 && (
            <div className="media-gallery-empty">
              <p>Мультимедіа файли не знайдено для цієї моделі</p>
            </div>
          )}

          {!loading && !error && multimediaFiles.length > 0 && (
            <div className="media-gallery-layout">
              {/* Main content display */}
              <div className="main-content-container">
                {selectedFile && (
                  <div className="main-content-wrapper">
                    <div className="media-viewer">
                      {!selectedFile.FILE_CONTENT_BASE64 ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          flexDirection: 'column',
                          gap: '20px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          padding: '40px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '48px', opacity: 0.5 }}>⚠️</div>
                          <div>
                            <h3 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>
                              Файл не містить данних
                            </h3>
                            <p style={{ margin: 0, color: '#6c757d' }}>
                              Файл {selectedFile.FILE_NAME} не має вмісту для відображення
                            </p>
                          </div>
                        </div>
                      ) : selectedFile.IS_IMAGE ? (
                        <img
                          src={createImageDataUrl(selectedFile.FILE_CONTENT_BASE64, selectedFile.FILE_EXTENSION)}
                          alt={selectedFile.MULTIMEDIA_NAME || selectedFile.FILE_NAME}
                          className="main-image"
                        />
                      ) : selectedFile.IS_PDF ? (
                        <PDFViewer 
                          pdfFile={selectedFile}
                        />
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          flexDirection: 'column',
                          gap: '20px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          padding: '40px',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '48px', opacity: 0.5 }}>❓</div>
                          <div>
                            <h3 style={{ margin: '0 0 10px 0', color: '#ffc107' }}>
                              Невідомий тип файлу
                            </h3>
                            <p style={{ margin: 0, color: '#6c757d' }}>
                              Файл {selectedFile.FILE_NAME} має невідомий тип: {selectedFile.FILE_EXTENSION}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Unified info and actions section */}
                    <div className="media-info-actions">
                      <div className="media-info">
                        <h4>{selectedFile.MULTIMEDIA_NAME || selectedFile.FILE_NAME}</h4>
                        <p className="media-details">
                          {selectedFile.FILE_NAME} • {selectedFile.FILE_TYPE_NAME}
                        </p>
                      </div>
                      <div className="media-actions">
                        <button 
                          className="media-action-btn download-btn"
                          onClick={() => downloadFile(selectedFile)}
                          title="Завантажити файл"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                          </svg>
                          Завантажити
                        </button>
                        {selectedFile.IS_PDF && (
                          <button 
                            className="media-action-btn open-tab-btn"
                            onClick={() => {
                              const blobUrl = createPdfBlobUrl(selectedFile.FILE_CONTENT_BASE64);
                              if (blobUrl) {
                                window.open(blobUrl, '_blank');
                                // Clean up after a delay to allow the browser to load
                                setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                              }
                            }}
                            title="Відкрити PDF в новій вкладці"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                            </svg>
                            Відкрити
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Unified thumbnail gallery */}
              {multimediaFiles.length > 0 && (
                <div className={`thumbnail-gallery ${multimediaFiles.length === 1 ? 'single-file' : ''}`}>
                  <div className="thumbnail-grid">
                    {multimediaFiles.map((file) => (
                      <div
                        key={file.MULTIMED_3D_ID}
                        className={`thumbnail-item ${selectedFile?.MULTIMED_3D_ID === file.MULTIMED_3D_ID ? 'selected' : ''}`}
                        onClick={() => handleFileSelect(file)}
                        title={file.MULTIMEDIA_NAME || file.FILE_NAME}
                      >
                        {file.IS_IMAGE ? (
                          <img
                            src={createImageDataUrl(file.FILE_CONTENT_BASE64, file.FILE_EXTENSION)}
                            alt={file.MULTIMEDIA_NAME || file.FILE_NAME}
                            className="thumbnail-image"
                          />
                        ) : file.IS_PDF ? (
                          <div className="thumbnail-pdf">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                            <div className="thumbnail-pdf-name">
                              {file.MULTIMEDIA_NAME || file.FILE_NAME}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaGalleryModal;
