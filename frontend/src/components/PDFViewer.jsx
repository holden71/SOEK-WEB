import React, { useMemo, useEffect } from 'react';

const PDFViewer = ({ pdfFile }) => {
  const pdfUrl = useMemo(() => {
    if (!pdfFile.FILE_CONTENT_BASE64) return null;
    
    // Convert base64 to binary
    const binaryString = atob(pdfFile.FILE_CONTENT_BASE64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create blob and URL
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }, [pdfFile.FILE_CONTENT_BASE64]);

  // Cleanup blob URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (!pdfFile.FILE_CONTENT_BASE64) {
    return (
      <div className="pdf-viewer-content">
        <div className="pdf-error">
          <p>PDF файл не містить данних для відображення</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-content">
      <iframe
        src={pdfUrl}
        width="100%"
        height="100%"
        style={{
          border: 'none',
          minHeight: '600px'
        }}
        title={pdfFile.MULTIMEDIA_NAME || pdfFile.FILE_NAME}
      />
    </div>
  );
};

export default PDFViewer;
