import React, { useState, useRef, useEffect } from 'react';
import '../styles/TableActionsMenu.css';

const TableActionsMenu = ({ 
  actions = [], 
  row = null, 
  onMenuItemClick = null,
  lazy = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Load menu items
  const loadMenuItems = async () => {
    if (!lazy) {
      return actions.filter(action => action && (typeof action.condition !== 'function' || action.condition(row)));
    }

    setIsLoading(true);
    
    // Check for async conditions
    const filteredActions = [];
    let hasAsync = false;
    
    for (const action of actions) {
      if (!action) continue;
      
      if (typeof action.condition === 'function') {
        try {
          const result = action.condition(row);
          // Check if it's a Promise (async function)
          if (result instanceof Promise) {
            hasAsync = true;
            const conditionResult = await result;
            if (conditionResult) {
              filteredActions.push(action);
            }
          } else {
            // Sync condition
            if (result) {
              filteredActions.push(action);
            }
          }
        } catch (error) {
          console.error('Error checking action condition:', error);
        }
      } else {
        filteredActions.push(action);
      }
    }
    
    // No artificial delays - show spinner only during real async operations
    
    setIsLoading(false);
    return filteredActions;
  };

  const handleMenuToggle = async (e) => {
    e.stopPropagation();
    
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    // Open menu immediately
    setIsOpen(true);

    // Load menu items if not already loaded or if lazy loading
    if (lazy || menuItems.length === 0) {
      const items = await loadMenuItems();
      setMenuItems(items);
    }
  };

  const handleMenuItemClick = (e, action) => {
    e.stopPropagation();
    setIsOpen(false);
    
    if (action.onClick) {
      action.onClick(e, row);
    } else if (onMenuItemClick) {
      onMenuItemClick(action.key, e, row);
    }
  };

  // Pre-load menu items if not lazy
  useEffect(() => {
    if (!lazy) {
      loadMenuItems().then(setMenuItems);
    }
  }, [actions, row, lazy]);

  return (
    <div className="table-actions-menu">
      <button
        ref={buttonRef}
        className="action-menu-button"
        onClick={handleMenuToggle}
        title="Дії"
      >
        ⋯
      </button>

      {isOpen && (
        <div 
          ref={menuRef} 
          className={`action-dropdown-menu ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? (
            <div className="menu-loading">
              <div className="spinner"></div>
            </div>
          ) : menuItems.length > 0 ? (
            menuItems.map((action, index) => (
              <button
                key={action.key || index}
                className="menu-item"
                onClick={(e) => handleMenuItemClick(e, action)}
                disabled={action.disabled}
              >
                <span className="menu-text">{action.label}</span>
              </button>
            ))
          ) : (
            <div className="no-actions">Немає доступних дій</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TableActionsMenu;
