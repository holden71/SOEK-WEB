import React, { useState } from 'react';
import FileInput from './FileInput';
import '../styles/AddModal.css';

function AddFileModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    file_name: '',
    descr: '',
    sh_descr: '',
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
  };



  const validateForm = () => {
    const newErrors = {};

    if (!formData.selectedFile) {
      newErrors.selectedFile = 'Файл обов\'язковий';
    }

    if (!formData.file_name.trim()) {
      newErrors.file_name = 'Ім\'я файлу обов\'язкове';
    }

    // Описания теперь необязательные
    // if (!formData.descr.trim()) {
    //   newErrors.descr = 'Опис файлу обов\'язковий';
    // }

    // if (!formData.sh_descr.trim()) {
    //   newErrors.sh_descr = 'Короткий опис обов\'язковий';
    // }

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

      const fileData = {
        file_name: formData.file_name,
        descr: formData.descr,
        sh_descr: formData.sh_descr,
        file_content: Array.from(new Uint8Array(fileContent)), // Convert to array for JSON serialization
        file_extension: fileExtension // Add file extension for backend validation
      };

      await onSave(fileData);

      // Reset form on success
      setFormData({
        file_name: '',
        descr: '',
        sh_descr: '',
        selectedFile: null,
        file_type_id: null
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error saving file:', error);

      // Check if it's a file type not found error
      let errorMessage = 'Помилка при збереженні файлу';
      if (error.message && error.message.includes('не знайдено в базі даних')) {
        const extension = formData.selectedFile ? '.' + formData.selectedFile.name.split('.').pop() : '';
        errorMessage = `Тип файлу з розширенням "${extension}" не знайдено в базі даних. Спочатку додайте відповідний тип файлу.`;
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
    return "Оберіть файл будь-якого типу";
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        file_name: '',
        descr: '',
        sh_descr: '',
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
          <h2>📁 Додати файл</h2>
          <button
            className="close-button"
            onClick={handleClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">

          <FileInput
            label="Виберіть файл"
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
            <label htmlFor="file_name">Ім'я файлу *</label>
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



          <div className="form-group">
            <label htmlFor="descr">Опис файлу</label>
            <textarea
              id="descr"
              name="descr"
              value={formData.descr}
              onChange={handleInputChange}
              placeholder="Введіть опис файлу (опціонально)"
              rows="3"
              className={errors.descr ? 'error' : ''}
              disabled={loading}
            />
            {errors.descr && <span className="error-message">{errors.descr}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="sh_descr">Короткий опис</label>
            <input
              type="text"
              id="sh_descr"
              name="sh_descr"
              value={formData.sh_descr}
              onChange={handleInputChange}
              placeholder="Введіть короткий опис файлу (опціонально)"
              className={errors.sh_descr ? 'error' : ''}
              disabled={loading}
            />
            {errors.sh_descr && <span className="error-message">{errors.sh_descr}</span>}
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

export default AddFileModal;
