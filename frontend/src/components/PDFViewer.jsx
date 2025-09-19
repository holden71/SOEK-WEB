import React, { useState } from 'react';

const PDFViewer = ({ pdfFile }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const createPdfDataUrl = (base64Data) => {
    if (!base64Data) return null;
    return `data:application/pdf;base64,${base64Data}`;
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setError('Не вдалося завантажити PDF файл');
    setLoading(false);
  };

  return (
    <div className="pdf-viewer-content">
      {loading && (
        <div className="pdf-loading">
          <div className="spinner"></div>
          <p>Завантаження PDF...</p>
        </div>
      )}

      {error && (
        <div className="pdf-error">
          <p>{error}</p>
        </div>
      )}

      {pdfFile.FILE_CONTENT_BASE64 && !error && (
        <iframe
          src={createPdfDataUrl(pdfFile.FILE_CONTENT_BASE64)}
          className="pdf-iframe"
          title={pdfFile.MULTIMEDIA_NAME || pdfFile.FILE_NAME}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
    </div>
  );
};

export default PDFViewer;
