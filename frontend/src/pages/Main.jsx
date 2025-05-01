import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import PageHeader from '../components/PageHeader';
import '../styles/Main.css';

function Main() {
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedT, setSelectedT] = useState('');
  const [data, setData] = useState([]);
  const [plants, setPlants] = useState([]);
  const [units, setUnits] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    
    return Object.keys(data[0]).map(key => ({
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
          <div 
            className="cell-content-wrapper"
          >
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
    }));
  }, [data]);

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

  // Fetch plants from backend on component mount
  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/plants');
        if (!response.ok) {
          throw new Error('Failed to fetch plants');
        }
        const data = await response.json();
        setPlants(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPlants();
  }, []);

  // Fetch units when plant is selected
  useEffect(() => {
    const fetchUnits = async () => {
      if (!selectedPlant) {
        setUnits([]);
        return;
      }

      try {
        const response = await fetch(`http://localhost:8000/api/units?plant_id=${selectedPlant}`);
        if (!response.ok) {
          throw new Error('Failed to fetch units');
        }
        const data = await response.json();
        setUnits(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchUnits();
  }, [selectedPlant]);

  // Fetch terms when unit is selected
  useEffect(() => {
    const fetchTerms = async () => {
      if (!selectedPlant || !selectedUnit) {
        setTerms([]);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:8000/api/terms?plant_id=${selectedPlant}&unit_id=${selectedUnit}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch terms');
        }
        const data = await response.json();
        setTerms(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchTerms();
  }, [selectedPlant, selectedUnit]);

  const handlePlantChange = (e) => {
    setSelectedPlant(e.target.value);
    setSelectedUnit('');
    setSelectedT('');
    setHasSearched(false);
  };

  const handleUnitChange = (e) => {
    setSelectedUnit(e.target.value);
    setSelectedT('');
    setHasSearched(false);
  };

  const handleTChange = (e) => {
    setSelectedT(e.target.value);
    setHasSearched(false);
  };

  const handleSearch = async () => {
    try {
      setSearching(true);
      setHasSearched(true);
      const response = await fetch(
        `http://localhost:8000/api/search?plant_id=${selectedPlant}&unit_id=${selectedUnit}&t_id=${selectedT}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      
      const result = await response.json();
      const processedData = result.map(item => item.data);
      setData(processedData);
      setGlobalFilter('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const getUnitDefaultText = () => {
    if (!selectedPlant) return "Необхідно обрати станцію";
    return "Оберіть енергоблок";
  };

  const getTDefaultText = () => {
    if (!selectedPlant) return "Необхідно обрати станцію";
    if (!selectedUnit) return "Необхідно обрати енергоблок";
    return "Оберіть перелік";
  };

  const isSearchEnabled = selectedPlant && selectedUnit && selectedT;

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

  const handleCopyContent = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (loading) {
    return <div>Loading plants...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="main-page">
      <PageHeader title="Перелік ЕК" />
      <div className="main-content">
        <div className="filters-container">
          <div className="filters">
            <div className="filter-group">
              <label htmlFor="plant">Станція:</label>
              <select
                id="plant"
                value={selectedPlant}
                onChange={handlePlantChange}
              >
                <option value="">Оберіть станцію</option>
                {plants.map(plant => (
                  <option key={plant.plant_id} value={plant.plant_id}>{plant.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="unit">Енергоблок:</label>
              <select
                id="unit"
                value={selectedUnit}
                onChange={handleUnitChange}
                disabled={!selectedPlant}
              >
                <option value="">{getUnitDefaultText()}</option>
                {units.map(unit => (
                  <option key={unit.unit_id} value={unit.unit_id}>{unit.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="t">Перелік:</label>
              <select
                id="t"
                value={selectedT}
                onChange={handleTChange}
                disabled={!selectedPlant || !selectedUnit}
              >
                <option value="">{getTDefaultText()}</option>
                {terms.map(term => (
                  <option key={term.term_id} value={term.term_id}>{term.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="search-button">
            <button
              onClick={handleSearch}
              disabled={!isSearchEnabled || searching}
              className={!isSearchEnabled ? 'disabled' : ''}
            >
              {searching ? (
                <div className="spinner"></div>
              ) : (
                'Пошук'
              )}
            </button>
          </div>

          {data.length > 0 || searching ? (
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
                          defaultValue={table.getState().pagination.pageIndex + 1}
                          onChange={e => {
                            const page = e.target.value ? Number(e.target.value) - 1 : 0
                            table.setPageIndex(page)
                          }}
                          className="page-input"
                          title="Go to page"
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
          ) : !loading && !error ? (
            <div className="no-results">
              {renderNoDataMessage()}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Main; 