import React from 'react';
import '../styles/Model3DDownloadModal.css';

const Model3DDownloadModal = ({ 
  isOpen, 
  onClose, 
  onDownload, 
  modelData,
  loading = false 
}) => {
  if (!isOpen) return null;

  const handleDownloadOnly = () => {
    onDownload(false); // Only 3D model file
  };

  const handleDownloadWithMultimedia = () => {
    onDownload(true); // 3D model + multimedia files
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="download-modal-overlay" onClick={handleOverlayClick}>
      <div className="download-modal">
        <div className="download-modal-header">
          <h3>Завантаження 3D моделі</h3>
          <button 
            className="close-button" 
            onClick={onClose}
            title="Закрити"
          >
            ✕
          </button>
        </div>
        
        <div className="download-modal-body">
          <div className="model-info">
            <p><strong>Модель:</strong> {modelData?.SH_NAME || modelData?.sh_name || 'Невідома модель'}</p>
            {modelData?.DESCR && <p><strong>Опис:</strong> {modelData.DESCR}</p>}
          </div>
          
          <div className="download-question">
            <p>Чи потрібно завантажити також мультимедійні файли?</p>
          </div>
          
          <div className="download-options">
            <button 
              className="download-option-button model-only"
              onClick={handleDownloadOnly}
              disabled={loading}
              title="Завантажити тільки файл 3D моделі"
            >
              {loading ? (
                <span className="loading-spinner-small"></span>
              ) : (
                <span className="button-content">
                  <span className="button-icon">📦</span>
                  <span className="button-text">Тільки модель</span>
                </span>
              )}
            </button>
            
            <button 
              className="download-option-button with-multimedia"
              onClick={handleDownloadWithMultimedia}
              disabled={loading}
              title="Завантажити 3D модель разом з усіма мультимедійними файлами"
            >
              {loading ? (
                <span className="loading-spinner-small"></span>
              ) : (
                <span className="button-content">
                  <span className="button-icon">📁</span>
                  <span className="button-text">З мультимедіа</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Model3DDownloadModal;
