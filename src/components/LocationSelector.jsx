import React, { useEffect, useMemo, useState } from 'react';
import { getLocationsAndVehicles } from '../services/api';
import SearchableSelect from './SearchableSelect';

const EMPTY_LIST = [];

const toId = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
};

export const CUSTOM_LOCATION_PREFIX = '__custom_location__:';

const normalizeCustomLocationText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ').slice(0, 120);
};

export const isCustomLocationValue = (value) => {
  return typeof value === 'string' && value.startsWith(CUSTOM_LOCATION_PREFIX);
};

export const makeCustomLocationValue = (value) => {
  const normalized = normalizeCustomLocationText(value);
  return normalized ? `${CUSTOM_LOCATION_PREFIX}${normalized}` : '';
};

export const getCustomLocationText = (value) => {
  if (!isCustomLocationValue(value)) return '';
  return normalizeCustomLocationText(value.slice(CUSTOM_LOCATION_PREFIX.length));
};

export const toOptionalLocationId = (value) => {
  if (!value || isCustomLocationValue(value)) return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getManualLocationName = (regionValue, cityValue) => {
  return getCustomLocationText(cityValue) || getCustomLocationText(regionValue);
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
  allowCustom = false,
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

  const countries = staticData?.countries || EMPTY_LIST;
  const regions = staticData?.regions || EMPTY_LIST;
  const cities = staticData?.cities || EMPTY_LIST;
  const customRegionName = getCustomLocationText(regionValue);
  const customCityName = getCustomLocationText(cityValue);
  const manualLocationName = getManualLocationName(regionValue, cityValue);
  const isCustomRegion = Boolean(customRegionName);
  const hasSelection = Boolean(countryValue || regionValue || cityValue);

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
    const hasSelectedRegion = selectedRegion && !isCustomLocationValue(selectedRegion);
    const selectedCountryRegionIds = new Set(
      selectedCountry
        ? regions
            .filter((region) => String(region.countryId) === selectedCountry)
            .map((region) => String(region.regionId))
        : []
    );

    const source = cities.filter((city) => {
      if (hasSelectedRegion) return String(city.regionId) === selectedRegion;
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

  const handleRegionCustomCreate = (customName) => {
    const customValue = makeCustomLocationValue(customName);
    if (!customValue) return;
    onRegionChange?.(customValue);
    onCityChange?.('');
  };

  const handleCityCustomCreate = (customName) => {
    const customValue = makeCustomLocationValue(customName);
    if (!customValue) return;
    onCityChange?.(customValue);
  };

  const handleClearAll = () => {
    onCountryChange?.('');
    onRegionChange?.('');
    onCityChange?.('');
  };

  if (loading) {
    return <div className={groupClassName}>Yuklanmoqda...</div>;
  }

  return (
    <div className={groupClassName}>
      {label && (
        <div className="location-selector__heading">
          <label className={labelClassName}>
            {label} {required && !isMobile && <span style={{ color: 'red' }}>*</span>}
          </label>
          {isMobile && hasSelection && (
            <button type="button" className="location-selector__clear-all" onClick={handleClearAll}>
              Hammasini tozalash
            </button>
          )}
        </div>
      )}
      <div className={rowClassName} style={isMobile ? { display: 'grid', gap: 12 } : undefined}>
        <SearchableSelect
          className={selectClassName}
          value={countryValue || ''}
          options={countryOptions}
          placeholder="Davlat"
          searchPlaceholder="Davlat qidirish"
          onChange={handleCountryChange}
          clearable
          clearLabel="Davlatni olib tashlash"
          mobile={isMobile}
          selectionTitle="Davlatni tanlang"
        />

        <SearchableSelect
          className={selectClassName}
          value={regionValue || ''}
          options={regionOptions}
          placeholder="Viloyat"
          searchPlaceholder={allowCustom ? 'Viloyat qidirish yoki yozish' : 'Viloyat qidirish'}
          onChange={handleRegionChange}
          allowCustom={allowCustom}
          selectedLabel={customRegionName}
          onCustomCreate={handleRegionCustomCreate}
          clearable
          clearLabel="Viloyatni olib tashlash"
          mobile={isMobile}
          selectionTitle="Viloyatni tanlang"
        />

        <SearchableSelect
          className={selectClassName}
          value={cityValue || ''}
          options={cityOptions}
          placeholder="Shahar"
          searchPlaceholder={allowCustom ? 'Shahar qidirish yoki yozish' : 'Shahar qidirish'}
          onChange={handleCityChange}
          disabled={isCustomRegion}
          allowCustom={allowCustom && !isCustomRegion}
          selectedLabel={customCityName}
          onCustomCreate={handleCityCustomCreate}
          clearable
          clearLabel="Shaharni olib tashlash"
          mobile={isMobile}
          selectionTitle="Shaharni tanlang"
        />
      </div>
      {isMobile && !hasSelection && (
        <div className="location-selector__hint">
          Shaharni bevosita tanlasangiz, davlat va viloyat avtomatik belgilanadi.
        </div>
      )}
      {allowCustom && manualLocationName && (
        <div style={{
          marginTop: 8,
          color: isMobile ? 'var(--m-text-secondary)' : '#5f6b7a',
          fontSize: isMobile ? 12 : 13,
          lineHeight: 1.4,
        }}>
          {"Qo'lda kiritildi:"} <strong>{manualLocationName}</strong>
        </div>
      )}
    </div>
  );
}
