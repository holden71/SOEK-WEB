import React, { useState, useEffect } from 'react';
import MediaGalleryModal from './MediaGalleryModal';
import '../styles/AddModal.css';

function ViewModelsModal({ isOpen, onClose, ekId, elementData }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [selectedModelData, setSelectedModelData] = useState(null);

  useEffect(() => {
    if (isOpen && ekId) {
      fetchModels();
    }
  }, [isOpen, ekId]);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ek_models/by_ek/${ekId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // EK not found or no models - treat as empty list
          setModels([]);
          return;
        }
        
        // Try to get error details from response
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Check if API endpoint exists.');
      }
      
      const modelsData = await response.json();
      setModels(Array.isArray(modelsData) ? modelsData : []);
      
    } catch (error) {
      console.error('Error fetching models:', error);
      
      // Handle JSON parsing errors specifically
      if (error.message.includes('Unexpected token')) {
        setError('API endpoint not available. Please check server configuration.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewModel = (model) => {
    setSelectedModelData({
      ...model,
      elementData: elementData,
      ekId: ekId
    });
    setShowMediaGallery(true);
  };

  const handleDeleteLink = async (ek3dId) => {
    if (!confirm('Ви впевнені, що хочете видалити прив\'язку цієї моделі до елемента?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/ek_models/${ek3dId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete model link');
      }
      
      // Refresh models list
      await fetchModels();
      
    } catch (error) {
      console.error('Error deleting model link:', error);
      alert(`Помилка видалення прив'язки: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>3D Моделі для елемента #{ekId}</h2>
            <button className="close-button" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            <div className="element-info">
              <p><strong>EK_ID:</strong> {ekId}</p>
              {elementData?.NAME && <p><strong>Назва:</strong> {elementData.NAME}</p>}
              {elementData?.IDEN && <p><strong>Ідентифікатор:</strong> {elementData.IDEN}</p>}
            </div>

            {loading && <div className="loading">Завантаження моделей...</div>}
            
            {error && <div className="error-message">Помилка: {error}</div>}
            
            {!loading && !error && models.length === 0 && (
              <div className="no-models">
                <p>До цього елемента не прив'язано жодної 3D моделі.</p>
                <p>Використовуйте пункт "Завантажити 3D модель" для додавання нової моделі.</p>
              </div>
            )}
            
            {!loading && !error && models.length > 0 && (
              <div className="models-list">
                <h3>Прив'язані 3D моделі ({models.length})</h3>
                
                {models.map((model) => (
                  <div key={model.EK_3D_ID} className="model-item">
                    <div className="model-info">
                      <div className="model-title">
                        <strong>{model.MODEL_SH_NAME || 'Без назви'}</strong>
                      </div>
                      
                      <div className="model-details">
                        <span className="model-field">
                          <strong>Файл:</strong> {model.MODEL_FILE_NAME || 'N/A'}
                        </span>
                        
                        <span className="model-field">
                          <strong>Тип:</strong> {model.FILE_TYPE_NAME || 'N/A'}
                        </span>
                        
                        {model.MODEL_DESCR && (
                          <span className="model-field">
                            <strong>Опис:</strong> {model.MODEL_DESCR}
                          </span>
                        )}
                        
                        <span className="model-field">
                          <strong>Model ID:</strong> {model.MODEL_ID}
                        </span>
                      </div>
                    </div>
                    
                    <div className="model-actions">
                      <button 
                        className="view-button"
                        onClick={() => handleViewModel(model)}
                        title="Переглянути модель та мультимедіа"
                      >
                        Переглянути
                      </button>
                      <button 
                        className="delete-link-button"
                        onClick={() => handleDeleteLink(model.EK_3D_ID)}
                        title="Видалити прив'язку"
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Gallery Modal */}
      {showMediaGallery && (
        <MediaGalleryModal
          isOpen={showMediaGallery}
          onClose={() => {
            setShowMediaGallery(false);
            setSelectedModelData(null);
          }}
          modelData={selectedModelData}
        />
      )}
    </>
  );
}

export default ViewModelsModal;
