import React, { useState } from 'react';
import FileInput from './FileInput';
import '../styles/AddModal.css';

function AddModelModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    sh_name: '',
    descr: '',
    file_name: '',
    selectedFile: null,
    file_type_id: null // Will be auto-detected
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
        file_extension: fileExtension // Add file extension for backend validation
      };

      await onSave(modelData);

      // Reset form on success
      setFormData({
        sh_name: '',
        descr: '',
        file_name: '',
        selectedFile: null,
        file_type_id: null
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error saving 3D model:', error);
      setErrors({ submit: 'Помилка при збереженні 3D моделі' });
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
        file_type_id: null
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
