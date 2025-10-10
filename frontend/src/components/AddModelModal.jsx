import React, { useState, useEffect } from 'react';
import FileInput from './FileInput';
import { useAllowedExtensions } from '../hooks/useAllowedExtensions';
import '../styles/AddModal.css';

function AddModelModal({ isOpen, onClose, onSave, elementData, sameTypeCount = 0 }) {
  const [formData, setFormData] = useState({
    sh_name: '',
    descr: '',
    selectedFile: null,
    file_type_id: null, // Will be auto-detected
    multimediaFiles: [] // Array of multimedia files
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [applyToAllTypes, setApplyToAllTypes] = useState(false);

  // Get allowed extensions
  const { allowedExtensions, acceptString, validateFileExtension, getExtensionInfo, refreshExtensions } = useAllowedExtensions();

  // Refresh extensions when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshExtensions();
    }
  }, [isOpen, refreshExtensions]);

  // Handle multimedia file selection
  const handleMultimediaFileAdd = (file) => {
    // Validate multimedia file extension before adding
    const validation = validateFileExtension(file.name);
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }

    setFormData(prev => ({
      ...prev,
      multimediaFiles: [...prev.multimediaFiles, file]
    }));
  };

  // Remove multimedia file
  const handleMultimediaFileRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      multimediaFiles: prev.multimediaFiles.filter((_, i) => i !== index)
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // If file type changes, clear selected file
    if (name === 'file_type_id') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        selectedFile: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.sh_name.trim()) {
      newErrors.sh_name = 'Коротка назва моделі обов\'язкова';
    }

    if (!formData.selectedFile) {
      newErrors.selectedFile = 'Файл моделі обов\'язковий';
    } else {
      // Validate main model file extension
      const validation = validateFileExtension(formData.selectedFile.name);
      if (!validation.isValid) {
        newErrors.selectedFile = validation.message;
      }
    }

    // Validate multimedia files extensions
    for (let i = 0; i < formData.multimediaFiles.length; i++) {
      const file = formData.multimediaFiles[i];
      const validation = validateFileExtension(file.name);
      if (!validation.isValid) {
        newErrors[`multimediaFile_${i}`] = `Мультимедіа файл "${file.name}": ${validation.message}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Read file content as bytes
      const fileContent = await formData.selectedFile.arrayBuffer();

      // Get file extension
      const fileName = formData.selectedFile.name.toLowerCase();
      const fileExtension = '.' + fileName.split('.').pop();

      const modelData = {
        sh_name: formData.sh_name,
        descr: formData.descr,
        file_name: formData.selectedFile.name, // Use selected file name automatically
        file_content: Array.from(new Uint8Array(fileContent)), // Convert to array for JSON serialization
        file_extension: fileExtension, // Add file extension for backend validation
        multimedia_files: await Promise.all(formData.multimediaFiles.map(async (file) => {
          const multimediaContent = await file.arrayBuffer();
          const multimediaExtension = '.' + file.name.split('.').pop().toLowerCase();
          return {
            sh_name: file.name.split('.')[0], // Name without extension
            file_name: file.name,
            file_content: Array.from(new Uint8Array(multimediaContent)),
            file_extension: multimediaExtension
          };
        }))
      };

      await onSave(modelData, applyToAllTypes);

      // Reset form on success
      setFormData({
        sh_name: '',
        descr: '',
        selectedFile: null,
        file_type_id: null,
        multimediaFiles: []
      });
      setErrors({});
      setApplyToAllTypes(false);
      onClose();
    } catch (error) {
      console.error('Error saving 3D model:', error);

      // Check if it's a file type not found error
      let errorMessage = 'Помилка при збереженні 3D моделі';
      if (error.message && error.message.includes('не знайдено в базі даних')) {
        const extension = formData.selectedFile ? '.' + formData.selectedFile.name.split('.').pop() : '';
        errorMessage = `Тип файлу з розширенням "${extension}" не знайдено в базі даних. Спочатку додайте відповідний тип файлу для 3D моделей.`;
      }

      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get accepted file types
  const getAcceptedFileTypes = () => {
    return acceptString || "*";
  };

  // Helper function to get placeholder text
  const getFilePlaceholder = () => {
    if (allowedExtensions.length === 0) {
      return "Завантаження дозволених типів файлів...";
    }
    
    const extList = allowedExtensions.map(ext => ext.extension).join(', ');
    return `Оберіть файл моделі з дозволеними розширеннями: ${extList}`;
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        sh_name: '',
        descr: '',
        selectedFile: null,
        file_type_id: null,
        multimediaFiles: []
      });
      setErrors({});
      setApplyToAllTypes(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>📐 Додати 3D модель</h2>
          <button
            className="close-button"
            onClick={handleClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {elementData && (
            <div className="element-info-section">
              <div className="element-name">
                {elementData.NAME || elementData.name || 'Елемент'}
              </div>
              {(elementData.PTYPE_TXT || elementData.ptype_txt || elementData.Ptype_Txt) && (
                <div className="element-type">
                  Тип: {elementData.PTYPE_TXT || elementData.ptype_txt || elementData.Ptype_Txt}
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="sh_name">Коротка назва моделі *</label>
            <input
              type="text"
              id="sh_name"
              name="sh_name"
              value={formData.sh_name}
              onChange={handleInputChange}
              placeholder="Введіть коротку назву моделі"
              className={errors.sh_name ? 'error' : ''}
              disabled={loading}
            />
            {errors.sh_name && <span className="error-message">{errors.sh_name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="descr">Опис моделі</label>
            <textarea
              id="descr"
              name="descr"
              value={formData.descr}
              onChange={handleInputChange}
              placeholder="Введіть опис моделі (опціонально)"
              rows="3"
              className={errors.descr ? 'error' : ''}
              disabled={loading}
            />
            {errors.descr && <span className="error-message">{errors.descr}</span>}
          </div>


          <FileInput
            label="Виберіть файл моделі"
            accept={getAcceptedFileTypes()}
            value={formData.selectedFile}
            onChange={(file) => {
              setFormData(prev => ({
                ...prev,
                selectedFile: file
              }));
            }}
            onRemove={() => {
              setFormData(prev => ({
                ...prev,
                selectedFile: null
              }));
            }}
            placeholder={getFilePlaceholder()}
            disabled={loading}
            required={true}
            error={!!errors.selectedFile}
          />
          {errors.selectedFile && <span className="error-message">{errors.selectedFile}</span>}

          {/* Additional Files Section */}
          <div className="form-group">
            <label>Мультімедіа файли (опціонально)</label>            
            <div className="custom-file-input">
              <input
                type="file"
                accept={acceptString || "*"}
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  files.forEach(file => {
                    handleMultimediaFileAdd(file);
                  });
                  e.target.value = ''; // Reset input
                }}
                disabled={loading}
                className="hidden-file-input"
                id="multimedia-files-input"
              />
              <button
                type="button"
                className="select-file-button"
                onClick={() => document.getElementById('multimedia-files-input').click()}
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                  <path d="M8.5 8.5V6.5h2a.5.5 0 0 1 0 1h-2v1.5h2a.5.5 0 0 1 0 1h-2v1.5H10a.5.5 0 0 1 0 1H8.5V14H10a.5.5 0 0 1 0 1H6a.5.5 0 0 1 0-1h1.5v-1.5H6a.5.5 0 0 1 0-1h1.5V10H6a.5.5 0 0 1 0-1h1.5V7.5H6a.5.5 0 0 1 0-1h2V5z"/>
                </svg>
                Вибрати файли
              </button>
              <div className="file-display">
                {formData.multimediaFiles.length > 0 ? (
                  <span className="no-file">
                    Обрано файлів: {formData.multimediaFiles.length}
                  </span>
                ) : (
                  <span className="no-file">
                    {allowedExtensions.length > 0 
                      ? `Оберіть додаткові файли (${allowedExtensions.map(ext => ext.extension).join(', ')})`
                      : "Завантаження дозволених типів файлів..."}
                  </span>
                )}
              </div>
            </div>

            {formData.multimediaFiles.length > 0 && (
              <div className="multimedia-files-list">
                <h4>Обрані мультімедіа файли:</h4>
                {formData.multimediaFiles.map((file, index) => (
                  <div key={index} className="multimedia-file-item">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button
                      type="button"
                      onClick={() => handleMultimediaFileRemove(index)}
                      className="remove-file-btn"
                      disabled={loading}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {errors.submit && (
            <div className="error-message submit-error">{errors.submit}</div>
          )}

          {sameTypeCount > 1 && (
            <div className="form-group">
              <label>Додаткові параметри</label>
              <div className="checkbox-container">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={applyToAllTypes}
                    onChange={(e) => setApplyToAllTypes(e.target.checked)}
                    disabled={loading}
                  />
                  <span className="checkbox-checkmark"></span>
                  <span className="checkbox-text-main">
                    Застосувати для всіх елементів типу{' '}
                    <span className="checkbox-text-info">({sameTypeCount} шт.)</span>
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
              disabled={loading}
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="save-button"
              disabled={loading}
            >
              {loading ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddModelModal;
