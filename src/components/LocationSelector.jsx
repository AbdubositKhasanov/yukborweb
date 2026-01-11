import React, { useEffect, useState } from 'react';
import { getLocationsAndVehicles } from '../services/api';

export default function LocationSelector({ 
  label, 
  countryValue, 
  regionValue, 
  cityValue,
  onCountryChange,
  onRegionChange,
  onCityChange,
  required = false
}) {
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
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Yuklanmoqda...</div>;
  }

  const filteredRegions = staticData?.regions.filter(
    r => r.countryId === parseInt(countryValue)
  ) || [];

  const filteredCities = staticData?.cities.filter(
    c => c.regionId === parseInt(regionValue)
  ) || [];

  return (
    <div className="form-group">
      <label className="form-label">
        {label} {required && <span style={{ color: 'red' }}>*</span>}
      </label>
      <div className="form-row">
        <select
          className="form-select"
          value={countryValue || ''}
          onChange={(e) => {
            onCountryChange(e.target.value);
            onRegionChange('');
            onCityChange('');
          }}
          required={required}
        >
          <option value="">Davlatni tanlang</option>
          {staticData?.countries.map(country => (
            <option key={country.countryId} value={country.countryId}>
              {country.name}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={regionValue || ''}
          onChange={(e) => {
            onRegionChange(e.target.value);
            onCityChange('');
          }}
          disabled={!countryValue}
          required={required}
        >
          <option value="">Viloyatni tanlang</option>
          {filteredRegions.map(region => (
            <option key={region.regionId} value={region.regionId}>
              {region.name}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={cityValue || ''}
          onChange={(e) => onCityChange(e.target.value)}
          disabled={!regionValue}
          required={false}
        >
          <option value="">Shaharni tanlang</option>
          {filteredCities.map(city => (
            <option key={city.cityId} value={city.cityId}>
              {city.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
