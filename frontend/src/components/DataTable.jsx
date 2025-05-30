import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import TableActions from './TableActions';
import '../styles/DataTable.css';
import '../styles/Pagination.css';

const DataTable = ({ 
  data, 
  searching, 
  hasSearched, 
  onImportClick, 
  onAnalysisClick,
  globalFilter,
  setGlobalFilter,
  sorting,
  setSorting
}) => {
  const handleCopyContent = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    
    return [
      {
        id: 'actions',
        header: '',
        size: 80,
        maxSize: 80,
        minSize: 80,
        cell: ({ row }) => (
          <TableActions 
            row={row}
            data={data}
            onImportClick={onImportClick}
            onAnalysisClick={onAnalysisClick}
          />
        ),
      },
      ...Object.keys(data[0]).map(key => ({
        accessorKey: key,
        header: key,
        cell: info => {
          const content = info.getValue()?.toString() || '';
          
          const handleMouseMove = (e) => {
            const tooltip = e.currentTarget.querySelector('.cell-tooltip');
            if (tooltip) {
              const x = e.clientX;
              const y = e.clientY;
              tooltip.style.left = `${x + 10}px`;
              tooltip.style.top = `${y - 10}px`;
            }
          };

          const handleCopy = async (e) => {
            const element = e.currentTarget;
            await handleCopyContent(content);
            element.classList.add('copied');
            const label = document.createElement('span');
            label.className = 'copy-label';
            label.textContent = '📋';
            element.appendChild(label);
            setTimeout(() => {
              element.classList.remove('copied');
              element.removeChild(label);
            }, 500);
          };

          return (
            <div className="cell-content-wrapper">
              <div 
                className="cell-content"
                onClick={handleCopy}
                onMouseMove={handleMouseMove}
              >
                <span className="cell-text">{content}</span>
                <span className="cell-tooltip">{content}</span>
              </div>
            </div>
          );
        },
      })),
    ];
  }, [data, onImportClick, onAnalysisClick]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
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

  const renderNoDataMessage = () => {
    if (searching) {
      return null;
    }

    const hasData = data && data.length > 0;
    const hasFilter = Boolean(globalFilter);
    const hasFilteredRows = table.getRowModel().rows.length > 0;

    if (hasData && hasFilter && !hasFilteredRows) {
      return "Пошук не дав результатів";
    }

    if (!hasSearched) {
      return "Виберіть параметри та натисніть \"Пошук\" для відображення даних";
    }

    if (hasSearched && !hasData) {
      return "Пошук не дав результатів";
    }

    return null;
  };

  if (data.length === 0 && !searching && !hasSearched) {
    return (
      <div className="no-results">
        {renderNoDataMessage()}
      </div>
    );
  }

  return (
    <>
      <div className="table-search">
        <input
          type="text"
          value={globalFilter ?? ''}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
          }}
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

      <div className="results">
        <div className="table-container">
          <div className="table-scroll-container" id="table-scroll-container">
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
                  <tr key={row.id}>
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
        
        {table.getRowModel().rows.length > 0 && (
          <div className="table-horizontal-scroll" id="table-horizontal-scroll">
            <div className="table-horizontal-scroll-content" id="table-horizontal-scroll-content"></div>
          </div>
        )}

        {table.getRowModel().rows.length > 0 && (
          <div className="pagination">
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
                  onChange={e => {
                    table.setPageSize(Number(e.target.value))
                  }}
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
      </div>
    </>
  );
};

export default DataTable; 