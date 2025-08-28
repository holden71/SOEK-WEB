import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Main from './pages/Main';
import About from './pages/About';
import Help from './pages/Help';
import Import from './pages/Import';
import Models3D from './pages/Models3D';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Main />} />
          <Route path="models-3d" element={<Models3D />} />
          <Route path="about" element={<About />} />
          <Route path="help" element={<Help />} />
          <Route path="import" element={<Import />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;