import React, { useState } from 'react';
import FileInput from './FileInput';
import '../styles/AddModal.css';

function AddModelModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    sh_name: '',
    descr: '',
    file_name: '',
    selectedFile: null,
    file_type_id: null, // Will be auto-detected
    multimediaFiles: [] // Array of multimedia files
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Handle multimedia file selection
  const handleMultimediaFileAdd = (file) => {
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
        selectedFile: null,
        file_name: ''
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
    }

    if (!formData.file_name.trim()) {
      newErrors.file_name = 'Ім\'я файлу обов\'язкове';
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
        file_name: formData.file_name,
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

      await onSave(modelData);

      // Reset form on success
      setFormData({
        sh_name: '',
        descr: '',
        file_name: '',
        selectedFile: null,
        file_type_id: null,
        multimediaFiles: []
      });
      setErrors({});
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
    return "*"; // Accept all file types
  };

  // Helper function to get placeholder text
  const getFilePlaceholder = () => {
    return "Оберіть файл моделі будь-якого типу";
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        sh_name: '',
        descr: '',
        file_name: '',
        selectedFile: null,
        file_type_id: null,
        multimediaFiles: []
      });
      setErrors({});
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
                selectedFile: file,
                file_name: file.name
              }));
            }}
            onRemove={() => {
              setFormData(prev => ({
                ...prev,
                selectedFile: null,
                file_name: ''
              }));
            }}
            placeholder={getFilePlaceholder()}
            disabled={loading}
            required={true}
            error={!!errors.selectedFile}
          />
          {errors.selectedFile && <span className="error-message">{errors.selectedFile}</span>}

          <div className="form-group">
            <label htmlFor="file_name">Ім'я файлу моделі *</label>
            <input
              type="text"
              id="file_name"
              name="file_name"
              value={formData.file_name}
              onChange={handleInputChange}
              placeholder="Ім'я файлу буде заповнено автоматично"
              className={errors.file_name ? 'error' : ''}
              disabled={loading}
            />
            {errors.file_name && <span className="error-message">{errors.file_name}</span>}
          </div>

          {/* Multimedia Files Section */}
          <div className="form-group">
            <label>Мультімедіа файли (опціонально)</label>            
            <div className="custom-file-input">
              <input
                type="file"
                accept="image/*,video/*"
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
                    {loading ? 'Необхідно обрати тип файлу' : 'Оберіть файли мультимедіа'}
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
