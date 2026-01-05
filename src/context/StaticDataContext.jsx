import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLocationsAndVehicles } from '../services/api';

const StaticDataContext = createContext(null);

export function StaticDataProvider({ children }) {
  const [staticData, setStaticData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaticData();
  }, []);

  const loadStaticData = async () => {
    try {
      const response = await getLocationsAndVehicles();
      if (response.code === 200) {
        setStaticData(response.result);
      }
    } catch (error) {
      console.error('Failed to load static data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaticDataContext.Provider value={{ staticData, loading }}>
      {children}
    </StaticDataContext.Provider>
  );
}

export function useStaticData() {
  const context = useContext(StaticDataContext);
  if (!context) {
    throw new Error('useStaticData must be used within StaticDataProvider');
  }
  return context;
}
