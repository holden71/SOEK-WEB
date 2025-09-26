import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import '../styles/UnifiedTable.css';

const UnifiedTable = ({
  data,
  title,
  loading = false,
  onAddClick,
  showAddButton = false,
  showActions = false,
  customColumns = null,
  className = '',
  enableRowSelection = false,
  onDeleteSelected,
  ...props
}) => {
  // Table state
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Generate columns from data if not provided
  const columns = useMemo(() => {
    if (customColumns) return customColumns;

    if (data.length === 0) return [];

    // Add checkbox column if row selection is enabled
    const checkboxColumn = enableRowSelection ? [{
      id: 'select',
      header: ({ table }) => {
        const isAllSelected = table.getIsAllRowsSelected();
        const isSomeSelected = table.getIsSomeRowsSelected();

        return (
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={table.getToggleAllRowsSelectedHandler()}
            ref={(el) => {
              if (el) el.indeterminate = isSomeSelected && !isAllSelected;
            }}
          />
        );
      },
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      size: 40,
      enableSorting: false,
      enableFiltering: false,
    }] : [];

    const baseColumns = Object.keys(data[0]).map(key => ({
      accessorKey: key,
      header: key,
      cell: info => {
        const content = info.getValue()?.toString() || '';

        const handleCopy = async (e) => {
          const element = e.currentTarget;
          try {
            await navigator.clipboard.writeText(content);
            // Добавляем класс для анимации ячейки
            setTimeout(() => {
              element.classList.add('copied');

              // Создаем label для уведомления
              const label = document.createElement('span');
              label.className = 'copy-label';
              label.textContent = '📋 Скопійовано!';
              label.style.position = 'fixed';
              label.style.zIndex = '9999';

              // Позиционируем label относительно курсора
              const rect = element.getBoundingClientRect();
              label.style.left = (rect.left + rect.width / 2) + 'px';
              label.style.top = (rect.top - 40) + 'px';
              label.style.transform = 'translateX(-50%)';

              document.body.appendChild(label);

              // Убираем анимацию через 800ms
              setTimeout(() => {
                element.classList.remove('copied');
                if (document.body.contains(label)) {
                  document.body.removeChild(label);
                }
              }, 800);
            }, 10);
          } catch (error) {
            console.error('Failed to copy text:', error);
            // Показываем ошибку копирования
            setTimeout(() => {
              element.classList.add('copy-error');

              const label = document.createElement('span');
              label.className = 'copy-label error';
              label.textContent = '❌ Помилка';
              label.style.position = 'fixed';
              label.style.zIndex = '9999';

              const rect = element.getBoundingClientRect();
              label.style.left = (rect.left + rect.width / 2) + 'px';
              label.style.top = (rect.top - 40) + 'px';
              label.style.transform = 'translateX(-50%)';

              document.body.appendChild(label);

              setTimeout(() => {
                element.classList.remove('copy-error');
                if (document.body.contains(label)) {
                  document.body.removeChild(label);
                }
              }, 1000);
            }, 10);
          }
        };

        const handleMouseMove = (e) => {
          const tooltip = e.currentTarget.querySelector('.cell-tooltip');
          if (tooltip) {
            const x = e.clientX;
            const y = e.clientY;
            tooltip.style.left = `${x + 10}px`;
            tooltip.style.top = `${y - 10}px`;
          }
        };

        return (
          <div className="cell-content-wrapper">
            <div
              className="cell-content"
              onClick={handleCopy}
              onMouseMove={handleMouseMove}
              title={content}
            >
              <span className="cell-text">{content}</span>
              <span className="cell-tooltip">{content}</span>
            </div>
          </div>
        );
      },
    }));

    return [...checkboxColumn, ...baseColumns];
  }, [data, customColumns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    enableRowSelection: enableRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId);
      return value?.toString().toLowerCase().includes(filterValue.toLowerCase());
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Handle delete selected rows
  const handleDeleteSelected = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (onDeleteSelected) {
      const selectedRows = table.getSelectedRowModel().rows.map(row => row.original);
      await onDeleteSelected(selectedRows);
      setRowSelection({});
    }
    setShowDeleteModal(false);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
  };

  const renderNoDataMessage = () => {
    const hasData = data && data.length > 0;
    const hasFilter = Boolean(globalFilter);
    const hasFilteredRows = table.getRowModel().rows.length > 0;

    if (loading) {
      return (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
        </div>
      );
    }

    if (hasData && hasFilter && !hasFilteredRows) {
      return "Пошук не дав результатів";
    }

    if (!hasData) {
      return `Немає даних про ${title?.toLowerCase() || 'записи'}`;
    }

    return null;
  };

  return (
    <div className={`unified-table ${className}`}>
      {/* Table Header with Search, Selection Info and Add Button */}
      <div className="table-header">
        <div className="table-header-content">
          {/* Search always visible */}
          <div className="table-search">
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Пошук у таблиці..."
              className="search-input"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter('')}
                className="clear-search"
                title="Очистити пошук"
              >
                ✕
              </button>
            )}
          </div>

          {/* Selection info when rows are selected */}
          {enableRowSelection && Object.keys(rowSelection).length > 0 && (
            <div className="selection-info">
              <span className="selected-count">
                Вибрано {Object.keys(rowSelection).length} рядків
              </span>
              <div className="selection-actions">
                <button
                  onClick={handleDeleteSelected}
                  className="delete-selected-button"
                  title="Видалити вибрані рядки"
                >
                  🗑️ Видалити
                </button>
                <button
                  onClick={() => setRowSelection({})}
                  className="clear-selection-button"
                  title="Очистити вибір"
                >
                  ✕ Скасувати
                </button>
              </div>
            </div>
          )}

          {/* Add button always visible if enabled */}
          {showAddButton && onAddClick && (
            <button
              onClick={onAddClick}
              className="add-button"
              title="Додати новий запис"
            >
              ➕ Додати
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-scroll-container">
          <table>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: ' 🔼',
                        desc: ' 🔽',
                      }[header.column.getIsSorted()] ?? null}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            {table.getRowModel().rows.length > 0 ? (
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className={row.getIsSelected() ? 'selected-row' : ''}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : (
              <tbody>
                <tr>
                  <td colSpan={columns.length}>
                    <div className="no-results">
                      {renderNoDataMessage()}
                    </div>
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* Pagination */}
      {table.getRowModel().rows.length > 0 && (
        <div className="table-pagination">
          <div className="pagination-controls">
            <div className="pagination-buttons">
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                title="First page"
              >
                {'<<'}
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                title="Previous page"
              >
                {'<'}
              </button>
              <span className="page-info">
                Сторінка{' '}
                <strong>
                  {table.getState().pagination.pageIndex + 1} з{' '}
                  {table.getPageCount()}
                </strong>
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                title="Next page"
              >
                {'>'}
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                title="Last page"
              >
                {'>>'}
              </button>
            </div>
            <div className="pagination-right">
              <input
                type="number"
                min="1"
                max={table.getPageCount()}
                defaultValue={table.getState().pagination.pageIndex + 1}
                onChange={e => {
                  const inputValue = Number(e.target.value);
                  const totalPages = table.getPageCount();

                  if (inputValue >= 1 && inputValue <= totalPages) {
                    table.setPageIndex(inputValue - 1);
                  } else if (inputValue > totalPages) {
                    e.target.value = totalPages;
                    table.setPageIndex(totalPages - 1);
                  } else if (inputValue < 1 && e.target.value !== '') {
                    e.target.value = 1;
                    table.setPageIndex(0);
                  }
                }}
                onBlur={e => {
                  const inputValue = Number(e.target.value);
                  const totalPages = table.getPageCount();

                  if (!e.target.value || inputValue < 1) {
                    e.target.value = 1;
                    table.setPageIndex(0);
                  } else if (inputValue > totalPages) {
                    e.target.value = totalPages;
                    table.setPageIndex(totalPages - 1);
                  }
                }}
                className="page-input"
                title={`Перейти на страницу (1-${table.getPageCount()})`}
              />
              <select
                value={table.getState().pagination.pageSize}
                onChange={e => table.setPageSize(Number(e.target.value))}
                title="Rows per page"
              >
                {[10, 20, 30, 40, 50].map(pageSize => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-header">
              <h3>Підтвердження видалення</h3>
            </div>
            <div className="delete-modal-body">
              <p>Ви впевнені, що хочете видалити {Object.keys(rowSelection).length} вибраних рядків?</p>
              <p className="delete-warning">Цю дію неможливо буде скасувати.</p>
            </div>
            <div className="delete-modal-footer">
              <button
                onClick={cancelDelete}
                className="cancel-delete-button"
              >
                Скасувати
              </button>
              <button
                onClick={confirmDelete}
                className="confirm-delete-button"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedTable;
