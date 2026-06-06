import React, { useEffect, useMemo, useState } from 'react';
import { getLocationsAndVehicles } from '../services/api';
import SearchableSelect from './SearchableSelect';

const toId = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
};

const findById = (items = [], key, value) => {
  const normalized = toId(value);
  if (!normalized) return null;
  return items.find((item) => String(item[key]) === normalized) || null;
};

const sortByName = (items = []) => {
  return [...items].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'uz'));
};

export default function LocationSelector({
  label,
  countryValue,
  regionValue,
  cityValue,
  onCountryChange,
  onRegionChange,
  onCityChange,
  required = false,
  staticData: providedStaticData = null,
  variant = 'desktop',
  error = false,
}) {
  const [localStaticData, setLocalStaticData] = useState(null);
  const [loading, setLoading] = useState(!providedStaticData);
  const staticData = providedStaticData || localStaticData;
  const isMobile = variant === 'mobile';
  const groupClassName = isMobile ? 'm-form-group' : 'form-group';
  const labelClassName = `${isMobile ? 'm-form-label' : 'form-label'} ${required ? 'required' : ''}`.trim();
  const rowClassName = isMobile ? undefined : 'form-row';
  const selectClassName = `${isMobile ? 'm-form-select' : 'form-select'} ${error ? 'error' : ''}`.trim();

  useEffect(() => {
    if (providedStaticData) return undefined;

    let mounted = true;
    const loadStaticData = async () => {
      try {
        const response = await getLocationsAndVehicles();
        if (mounted && response.code === 200) {
          setLocalStaticData(response.result);
        }
      } catch (loadError) {
        console.error('Failed to load locations:', loadError);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStaticData();
    return () => {
      mounted = false;
    };
  }, [providedStaticData]);

  const countries = staticData?.countries || [];
  const regions = staticData?.regions || [];
  const cities = staticData?.cities || [];

  const countryOptions = useMemo(() => {
    return sortByName(countries).map((country) => ({
      value: country.countryId,
      label: country.name,
    }));
  }, [countries]);

  const regionOptions = useMemo(() => {
    const selectedCountry = toId(countryValue);
    const source = selectedCountry
      ? regions.filter((region) => String(region.countryId) === selectedCountry)
      : regions;

    return sortByName(source).map((region) => {
      const country = findById(countries, 'countryId', region.countryId);
      return {
        value: region.regionId,
        label: selectedCountry || !country ? region.name : `${region.name} (${country.name})`,
        searchText: country?.name || '',
      };
    });
  }, [countries, countryValue, regions]);

  const cityOptions = useMemo(() => {
    const selectedCountry = toId(countryValue);
    const selectedRegion = toId(regionValue);
    const selectedCountryRegionIds = new Set(
      selectedCountry
        ? regions
            .filter((region) => String(region.countryId) === selectedCountry)
            .map((region) => String(region.regionId))
        : []
    );

    const source = cities.filter((city) => {
      if (selectedRegion) return String(city.regionId) === selectedRegion;
      if (selectedCountry) {
        return String(city.countryId) === selectedCountry || selectedCountryRegionIds.has(String(city.regionId));
      }
      return true;
    });

    return sortByName(source).map((city) => {
      const region = findById(regions, 'regionId', city.regionId);
      const country = findById(countries, 'countryId', city.countryId || region?.countryId);
      const suffix = selectedRegion
        ? ''
        : region
          ? ` (${region.name}${selectedCountry || !country ? '' : `, ${country.name}`})`
          : country && !selectedCountry
            ? ` (${country.name})`
            : '';

      return {
        value: city.cityId,
        label: `${city.name}${suffix}`,
        searchText: `${region?.name || ''} ${country?.name || ''}`,
      };
    });
  }, [cities, countries, countryValue, regionValue, regions]);

  const handleCountryChange = (nextCountryId) => {
    onCountryChange?.(nextCountryId);
    onRegionChange?.('');
    onCityChange?.('');
  };

  const handleRegionChange = (nextRegionId) => {
    const region = findById(regions, 'regionId', nextRegionId);
    onCountryChange?.(region ? toId(region.countryId) : countryValue || '');
    onRegionChange?.(nextRegionId);
    onCityChange?.('');
  };

  const handleCityChange = (nextCityId) => {
    const city = findById(cities, 'cityId', nextCityId);
    const region = city ? findById(regions, 'regionId', city.regionId) : null;
    onCountryChange?.(city ? toId(city.countryId || region?.countryId) : countryValue || '');
    onRegionChange?.(city ? toId(city.regionId) : regionValue || '');
    onCityChange?.(nextCityId);
  };

  if (loading) {
    return <div className={groupClassName}>Yuklanmoqda...</div>;
  }

  return (
    <div className={groupClassName}>
      {label && (
        <label className={labelClassName}>
          {label} {required && !isMobile && <span style={{ color: 'red' }}>*</span>}
        </label>
      )}
      <div className={rowClassName} style={isMobile ? { display: 'grid', gap: 12 } : undefined}>
        <SearchableSelect
          className={selectClassName}
          value={countryValue || ''}
          options={countryOptions}
          placeholder="Davlat"
          searchPlaceholder="Davlat qidirish"
          onChange={handleCountryChange}
        />

        <SearchableSelect
          className={selectClassName}
          value={regionValue || ''}
          options={regionOptions}
          placeholder="Viloyat"
          searchPlaceholder="Viloyat qidirish"
          onChange={handleRegionChange}
        />

        <SearchableSelect
          className={selectClassName}
          value={cityValue || ''}
          options={cityOptions}
          placeholder="Shahar"
          searchPlaceholder="Shahar qidirish"
          onChange={handleCityChange}
        />
      </div>
    </div>
  );
}
