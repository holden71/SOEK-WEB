import React, { useState, useEffect } from 'react';
import PDFViewer from './PDFViewer';
import '../styles/MediaGalleryModal.css';

const MediaGalleryModal = ({ isOpen, onClose, modelData }) => {
  const [multimediaFiles, setMultimediaFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [activeTab, setActiveTab] = useState('images'); // 'images' or 'pdfs'
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
      
      // Set active tab based on available content
      if (images.length > 0) {
        setActiveTab('images');
        setSelectedImage(images[0]);
      } else if (pdfs.length > 0) {
        setActiveTab('pdfs');
        setSelectedPdf(pdfs[0]);
      }
      
      // Set first image as selected if available
      if (images.length > 0) {
        setSelectedImage(images[0]);
      }
      
      // Set first PDF as selected if available
      if (pdfs.length > 0) {
        setSelectedPdf(pdfs[0]);
      }
    } catch (err) {
      console.error('Error fetching multimedia files:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (image) => {
    setSelectedImage(image);
  };

  const handlePdfSelect = (pdf) => {
    setSelectedPdf(pdf);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
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
            <>
              {/* Tabs */}
              <div className="media-gallery-tabs">
                {imageFiles.length > 0 && (
                  <button
                    className={`tab-button ${activeTab === 'images' ? 'active' : ''}`}
                    onClick={() => handleTabChange('images')}
                  >
                    Зображення ({imageFiles.length})
                  </button>
                )}
                {pdfFiles.length > 0 && (
                  <button
                    className={`tab-button ${activeTab === 'pdfs' ? 'active' : ''}`}
                    onClick={() => handleTabChange('pdfs')}
                  >
                    PDF ({pdfFiles.length})
                  </button>
                )}
              </div>

              {/* Tab Content */}
              {activeTab === 'images' && imageFiles.length > 0 && (
            <div className="media-gallery-layout">
              {/* Main image display */}
              <div className="main-image-container">
                {selectedImage && (
                  <div className="main-image-wrapper">
                    <img
                      src={createImageDataUrl(selectedImage.FILE_CONTENT_BASE64, selectedImage.FILE_EXTENSION)}
                      alt={selectedImage.MULTIMEDIA_NAME || selectedImage.FILE_NAME}
                      className="main-image"
                    />
                    <div className="main-image-info">
                      <h4>{selectedImage.MULTIMEDIA_NAME || selectedImage.FILE_NAME}</h4>
                      <p className="image-details">
                        {selectedImage.FILE_NAME} • {selectedImage.FILE_TYPE_NAME}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail gallery */}
              {imageFiles.length > 1 && (
                <div className="thumbnail-gallery">
                  <div className="thumbnail-grid">
                    {imageFiles.map((file, index) => (
                      <div
                        key={file.MULTIMED_3D_ID}
                        className={`thumbnail-item ${selectedImage?.MULTIMED_3D_ID === file.MULTIMED_3D_ID ? 'selected' : ''}`}
                        onClick={() => handleImageSelect(file)}
                        title={file.MULTIMEDIA_NAME || file.FILE_NAME}
                      >
                        <img
                          src={createImageDataUrl(file.FILE_CONTENT_BASE64, file.FILE_EXTENSION)}
                          alt={file.MULTIMEDIA_NAME || file.FILE_NAME}
                          className="thumbnail-image"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
              )}

              {/* PDF Tab Content */}
              {activeTab === 'pdfs' && pdfFiles.length > 0 && (
                <div className="pdf-gallery-layout">
                  {selectedPdf && (
                    <PDFViewer 
                      pdfFile={selectedPdf} 
                      onClose={onClose}
                    />
                  )}
                  
                  {/* PDF list */}
                  {pdfFiles.length > 1 && (
                    <div className="pdf-list">
                      <h4>Доступні PDF файли:</h4>
                      <div className="pdf-items">
                        {pdfFiles.map((file) => (
                          <div
                            key={file.MULTIMED_3D_ID}
                            className={`pdf-item ${selectedPdf?.MULTIMED_3D_ID === file.MULTIMED_3D_ID ? 'selected' : ''}`}
                            onClick={() => handlePdfSelect(file)}
                          >
                            <div className="pdf-icon">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                              </svg>
                            </div>
                            <div className="pdf-info">
                              <div className="pdf-name">{file.MULTIMEDIA_NAME || file.FILE_NAME}</div>
                              <div className="pdf-details">{file.FILE_NAME}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaGalleryModal;
