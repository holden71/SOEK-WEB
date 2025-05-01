import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import '../styles/Layout.css';

function Layout() {
  const location = useLocation();

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="menu-header">
          <h2>SOEK-WEB</h2>
        </div>
        <ul className="menu">
          <li>
            <Link 
              to="/" 
              className={location.pathname === '/' ? 'active' : ''}
            >
              📋 Перелік ЕК
            </Link>
          </li>
          <li>
            <Link 
              to="/import" 
              className={location.pathname === '/import' ? 'active' : ''}
            >
              📥 Імпорт з Excel
            </Link>
          </li>
          <li>
            <Link 
              to="/about" 
              className={location.pathname === '/about' ? 'active' : ''}
            >
              ℹ️ About App
            </Link>
          </li>
          <li>
            <Link 
              to="/help" 
              className={location.pathname === '/help' ? 'active' : ''}
            >
              ❓ Help
            </Link>
          </li>
        </ul>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout; 