import React from 'react';
import '../styles/PageHeader.css';

function PageHeader({ title }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
    </header>
  );
}

export default PageHeader; 