import { useState, useEffect } from 'react';

export const useDataFetching = () => {
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
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch plants from backend on component mount
  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const response = await fetch('/api/plants');
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
        const response = await fetch(`/api/units?plant_id=${selectedPlant}`);
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
          `/api/terms?plant_id=${selectedPlant}&unit_id=${selectedUnit}`
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
        `/api/search?plant_id=${selectedPlant}&unit_id=${selectedUnit}&t_id=${selectedT}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      
      const result = await response.json();
      const processedData = result.map(item => item.data);
      setData(processedData);
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

  return {
    // State
    selectedPlant,
    selectedUnit,
    selectedT,
    data,
    plants,
    units,
    terms,
    loading,
    searching,
    error,
    hasSearched,
    
    // Actions
    handlePlantChange,
    handleUnitChange,
    handleTChange,
    handleSearch,
    
    // Helpers
    getUnitDefaultText,
    getTDefaultText,
    isSearchEnabled,
    
    // Setters for external use
    setData
  };
}; 