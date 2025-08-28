import React, { useState } from 'react';
import '../styles/AddModal.css';

function AddFileTypeModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    descr: '',
    def_ext: ''
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

    if (!formData.name.trim()) {
      newErrors.name = 'Назва обов\'язкова';
    }

    if (!formData.descr.trim()) {
      newErrors.descr = 'Опис обов\'язковий';
    }

    if (!formData.def_ext.trim()) {
      newErrors.def_ext = 'Розширення за замовченням обов\'язкове';
    } else if (!formData.def_ext.startsWith('.')) {
      newErrors.def_ext = 'Розширення повинно починатися з точки (наприклад: .txt)';
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
      await onSave(formData);
      // Reset form on success
      setFormData({
        name: '',
        descr: '',
        def_ext: ''
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error saving file type:', error);
      setErrors({ submit: 'Помилка при збереженні типу файлу' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        descr: '',
        def_ext: ''
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
          <h2>🏷️ Додати тип файлу</h2>
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
            <label htmlFor="name">Назва *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Введіть назву типу файлу"
              className={errors.name ? 'error' : ''}
              disabled={loading}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="descr">Опис *</label>
            <textarea
              id="descr"
              name="descr"
              value={formData.descr}
              onChange={handleInputChange}
              placeholder="Введіть опис типу файлу"
              rows="3"
              className={errors.descr ? 'error' : ''}
              disabled={loading}
            />
            {errors.descr && <span className="error-message">{errors.descr}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="def_ext">Розширення за замовченням *</label>
            <input
              type="text"
              id="def_ext"
              name="def_ext"
              value={formData.def_ext}
              onChange={handleInputChange}
              placeholder="наприклад: .txt"
              className={errors.def_ext ? 'error' : ''}
              disabled={loading}
            />
            {errors.def_ext && <span className="error-message">{errors.def_ext}</span>}
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

export default AddFileTypeModal;
