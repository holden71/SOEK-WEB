import React, { useRef } from 'react';

function FileInput({
  label = "Виберіть файл",
  accept = "*",
  value,
  onChange,
  onRemove,
  placeholder = "Файл не вибрано",
  disabled = false,
  required = false,
  error = false
}) {
  const fileInputRef = useRef(null);

  const handleFileSelect = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      onChange(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    if (onRemove) {
      onRemove();
    }
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="form-group">
      <label className={disabled ? "label-inactive" : ""}>
        {label} {required && <span style={{ color: '#dc3545' }}>*</span>}
      </label>
      <div className={`custom-file-input ${error ? 'error' : ''}`}>
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          onChange={handleFileChange}
          required={required}
          className="hidden-file-input"
          disabled={disabled}
        />
        <button
          type="button"
          className="select-file-button"
          onClick={handleFileSelect}
          disabled={disabled}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
            <path d="M8.5 8.5V6.5h2a.5.5 0 0 1 0 1h-2v1.5h2a.5.5 0 0 1 0 1h-2v1.5H10a.5.5 0 0 1 0 1H8.5V14H10a.5.5 0 0 1 0 1H6a.5.5 0 0 1 0-1h1.5v-1.5H6a.5.5 0 0 1 0-1h1.5V10H6a.5.5 0 0 1 0-1h1.5V7.5H6a.5.5 0 0 1 0-1h2V5z"/>
          </svg>
          Вибрати файл
        </button>
        <div className="file-display">
          {value ? (
            <div className="selected-file">
              <span className="file-name">{value.name}</span>
              <button
                type="button"
                className="remove-file-button"
                onClick={handleRemoveFile}
                title="Видалити файл"
              >
                ✕
              </button>
            </div>
          ) : (
            <span className="no-file">
              {disabled ? 'Необхідно обрати тип файлу' : placeholder}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileInput;
