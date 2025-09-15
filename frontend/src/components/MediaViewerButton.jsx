import React, { useState, useEffect } from 'react';
import MediaGalleryModal from './MediaGalleryModal';
import '../styles/TableActions.css';

const MediaViewerButton = ({ modelData }) => {
  const [showModal, setShowModal] = useState(false);
  const [hasMultimedia, setHasMultimedia] = useState(false);
  const [checking, setChecking] = useState(true);

  const API_BASE_URL = 'http://localhost:8000/api';

  // Check if model has multimedia files
  useEffect(() => {
    const checkMultimedia = async () => {
      try {
        const modelId = modelData?.MODEL_ID || modelData?.model_id || modelData?.id;
        if (!modelId) {
          setHasMultimedia(false);
          setChecking(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/multimedia/model/${modelId}/check`);
        if (response.ok) {
          const result = await response.json();
          setHasMultimedia(result.has_multimedia);
        } else {
          setHasMultimedia(false);
        }
      } catch (error) {
        console.error('Error checking multimedia:', error);
        setHasMultimedia(false);
      } finally {
        setChecking(false);
      }
    };

    checkMultimedia();
  }, [modelData]);

  const handleButtonClick = (e) => {
    e.stopPropagation();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Don't render if still checking or no multimedia
  if (checking || !hasMultimedia) {
    return null;
  }

  return (
    <>
      <button 
        className="tiny-import-button media-viewer-button" 
        onClick={handleButtonClick}
        title="Переглянути мультимедіа файли"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
      </button>
      
      {showModal && (
        <MediaGalleryModal
          isOpen={showModal}
          onClose={handleCloseModal}
          modelData={modelData}
        />
      )}
    </>
  );
};

export default MediaViewerButton;
