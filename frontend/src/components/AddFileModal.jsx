import React, { useState } from 'react';
import FileInput from './FileInput';
import '../styles/AddModal.css';

function AddFileModal({ isOpen, onClose, onSave, fileTypes }) {
  const [formData, setFormData] = useState({
    file_type_id: '',
    file_name: '',
    descr: '',
    sh_descr: '',
    selectedFile: null
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

    if (!formData.file_type_id) {
      newErrors.file_type_id = 'Тип файлу обов\'язковий';
    }

    if (!formData.selectedFile) {
      newErrors.selectedFile = 'Файл обов\'язковий';
    } else if (formData.file_type_id && fileTypes) {
      // Validate file extension matches selected file type
      const selectedFileType = fileTypes.find(
        ft => (ft.FILE_TYPE_ID || ft.file_type_id) == formData.file_type_id
      );
      
      if (selectedFileType) {
        const expectedExtension = selectedFileType.DEF_EXT || selectedFileType.def_ext;
        if (expectedExtension) {
          const fileName = formData.selectedFile.name.toLowerCase();
          const fileExtension = '.' + fileName.split('.').pop();
          
          if (fileExtension !== expectedExtension.toLowerCase()) {
            newErrors.selectedFile = `Файл повинен мати розширення ${expectedExtension}`;
          }
        }
      }
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

      const fileData = {
        file_type_id: parseInt(formData.file_type_id),
        file_name: formData.file_name,
        descr: formData.descr,
        sh_descr: formData.sh_descr,
        file_content: Array.from(new Uint8Array(fileContent)) // Convert to array for JSON serialization
      };

      await onSave(fileData);

      // Reset form on success
      setFormData({
        file_type_id: '',
        file_name: '',
        descr: '',
        sh_descr: '',
        selectedFile: null
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error saving file:', error);
      setErrors({ submit: 'Помилка при збереженні файлу' });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get accepted file types based on selected file type
  const getAcceptedFileTypes = () => {
    if (!formData.file_type_id || !fileTypes) return "*";
    
    const selectedFileType = fileTypes.find(
      ft => (ft.FILE_TYPE_ID || ft.file_type_id) == formData.file_type_id
    );
    
    if (selectedFileType) {
      const extension = selectedFileType.DEF_EXT || selectedFileType.def_ext;
      if (extension) {
        // Return the extension for the accept attribute
        return extension;
      }
    }
    
    return "*";
  };

  // Helper function to get placeholder text based on selected file type
  const getFilePlaceholder = () => {
    if (!formData.file_type_id) {
      return "Спочатку оберіть тип файлу";
    }
    
    const selectedFileType = fileTypes?.find(
      ft => (ft.FILE_TYPE_ID || ft.file_type_id) == formData.file_type_id
    );
    
    if (selectedFileType) {
      const extension = selectedFileType.DEF_EXT || selectedFileType.def_ext;
      if (extension) {
        return `Оберіть файл з розширенням ${extension}`;
      }
    }
    
    return "Файл не вибрано";
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        file_type_id: '',
        file_name: '',
        descr: '',
        sh_descr: '',
        selectedFile: null
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
          <div className="form-group">
            <label htmlFor="file_type_id">Тип файлу *</label>
            <select
              id="file_type_id"
              name="file_type_id"
              value={formData.file_type_id}
              onChange={handleInputChange}
              className={errors.file_type_id ? 'error' : ''}
              disabled={loading}
            >
              <option value="">Оберіть тип файлу</option>
              {fileTypes && fileTypes.length > 0 ? (
                fileTypes.map(fileType => (
                  <option key={fileType.FILE_TYPE_ID || fileType.file_type_id} value={fileType.FILE_TYPE_ID || fileType.file_type_id}>
                    {fileType.DISPLAY_NAME || fileType.display_name || fileType.NAME || fileType.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>Завантаження типів файлів...</option>
              )}
            </select>
            {errors.file_type_id && <span className="error-message">{errors.file_type_id}</span>}
          </div>

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
            disabled={loading || !formData.file_type_id}
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
