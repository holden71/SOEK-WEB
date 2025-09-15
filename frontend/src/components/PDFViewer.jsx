import React, { useState } from 'react';

const PDFViewer = ({ pdfFile, onClose }) => {
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

  const downloadPdf = () => {
    if (!pdfFile.FILE_CONTENT_BASE64) return;
    
    const dataUrl = createPdfDataUrl(pdfFile.FILE_CONTENT_BASE64);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = pdfFile.FILE_NAME || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openInNewTab = () => {
    if (!pdfFile.FILE_CONTENT_BASE64) return;
    
    const dataUrl = createPdfDataUrl(pdfFile.FILE_CONTENT_BASE64);
    window.open(dataUrl, '_blank');
  };

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-viewer-header">
        <div className="pdf-info">
          <h4>{pdfFile.MULTIMEDIA_NAME || pdfFile.FILE_NAME}</h4>
          <p className="pdf-details">
            {pdfFile.FILE_NAME} • {pdfFile.FILE_TYPE_NAME}
          </p>
        </div>
        <div className="pdf-controls">
          <button 
            className="pdf-control-btn"
            onClick={downloadPdf}
            title="Завантажити PDF"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            Завантажити
          </button>
          <button 
            className="pdf-control-btn"
            onClick={openInNewTab}
            title="Відкрити в новій вкладці"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
            </svg>
            Відкрити
          </button>
        </div>
      </div>

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
            <div className="pdf-fallback-controls">
              <button onClick={downloadPdf} className="pdf-control-btn">
                Завантажити файл
              </button>
              <button onClick={openInNewTab} className="pdf-control-btn">
                Відкрити в новій вкладці
              </button>
            </div>
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
    </div>
  );
};

export default PDFViewer;
