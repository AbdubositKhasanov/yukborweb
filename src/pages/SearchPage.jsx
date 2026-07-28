import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  searchCargos,
  textSearchCargos,
  searchDispatcherCargos,
  createHarbinger,
  getUserMe,
} from '../services/api';
import { useStaticData } from '../context/StaticDataContext';
import CargoCard from '../components/CargoCard';
import CargoOwnerToggle from '../components/CargoOwnerToggle';
import ClubMembershipModal from '../components/ClubMembershipModal';
import LocationSelector from '../components/LocationSelector';
import { showError, showSuccess } from '../utils/toast';

const SENDER_FILTER_STORAGE_KEY = 'cargoSenderFilter';
const SENDER_FILTERS = ['all', 'cargo_owner_only'];

function initialSenderFilter() {
  return 'cargo_owner_only';
}

function orderTypeParam(senderFilter) {
  return senderFilter === 'all' ? undefined : senderFilter;
}

function normalizeCargoPage(result) {
  if (Array.isArray(result)) return { items: result, hasMore: false };
  return {
    items: Array.isArray(result?.items) ? result.items : [],
    hasMore: result?.hasMore === true,
  };
}

export default function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const driverData = location.state || {};
  const fromDriver = driverData.fromDriver || false;
  const driverId = driverData.driverId || null;
  const driverReference = driverData.driverReference || driverId;
  const driverName = driverData.driverName || null;
  const initialFilters = driverData.filters || {};

  const { staticData, loading: staticLoading } = useStaticData();
  const [cargos, setCargos] = useState([]);
  const [internalCargos, setInternalCargos] = useState([]);
  const [otherCargos, setOtherCargos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [featureLimits, setFeatureLimits] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isInternalDispatcher, setIsInternalDispatcher] = useState(false);
  const [userDataLoaded, setUserDataLoaded] = useState(!fromDriver);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [creatingHarbinger, setCreatingHarbinger] = useState(false);
  const [showClubModal, setShowClubModal] = useState(false);
  const [searchSnapshotKey, setSearchSnapshotKey] = useState('');
  const [harbingerCreatedForCurrentSearch, setHarbingerCreatedForCurrentSearch] = useState(false);

  // Search mode: 'simple' (text search) or 'advanced' (filter-based)
  const [searchMode, setSearchMode] = useState(fromDriver ? 'advanced' : 'simple');
  const [textQuery, setTextQuery] = useState('');
  const [searchTrigger, setSearchTrigger] = useState(0);

  // Filter states
  const [fromCountry, setFromCountry] = useState(initialFilters.fromCountry?.toString() || '');
  const [fromRegion, setFromRegion] = useState(initialFilters.fromRegion?.toString() || '');
  const [fromCity, setFromCity] = useState(initialFilters.fromCity?.toString() || '');
  const [toCountry, setToCountry] = useState('');
  const [toRegion, setToRegion] = useState('');
  const [toCity, setToCity] = useState('');
  const [vehicleType, setVehicleType] = useState(initialFilters.vehicleType || '');
  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState(initialFilters.maxWeight?.toString() || '');
  const [senderFilter, setSenderFilter] = useState(initialSenderFilter);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!localStorage.getItem('authToken')) return;

    try {
      const response = await getUserMe();
      if (response.code === 200 && response.result) {
        setPermissions(response.result.permissions || null);
        setFeatureLimits(response.result.featureLimits || null);
        const normalizedRole = String(response.result.type || '').toLowerCase();
        setUserRole(normalizedRole === 'zavod' ? 'factory' : normalizedRole);
        setIsInternalDispatcher(response.result.isInternalDispatcher === true);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setUserDataLoaded(true);
    }
  };

  // Set vehicle type from vehicleTypeId when staticData is loaded
  useEffect(() => {
    if (staticData && initialFilters.vehicleTypeId) {
      const vehicleTypeId = initialFilters.vehicleTypeId;
      const foundVehicleType = staticData.vehicleTypes?.find(v => v.id === vehicleTypeId);

      if (foundVehicleType) {
        setVehicleType(foundVehicleType.name);
      }
    }
  }, [staticData, initialFilters.vehicleTypeId]);

  // Initial load - wait for filters to be set before loading
  useEffect(() => {
    if (isInitialLoad && staticData && userDataLoaded) {
      if (fromDriver) {
        // For driver flow: wait for vehicleType to be set (if vehicleTypeId exists)
        if (initialFilters.vehicleTypeId) {
          // Has vehicleTypeId - wait for vehicleType to be set
          if (vehicleType) {
            loadCargos();
            setIsInitialLoad(false);
          }
        } else {
          // No vehicleTypeId - load immediately
          loadCargos();
          setIsInitialLoad(false);
        }
      } else {
        // Non-driver flow - load immediately (shows all cargos)
        loadCargos();
        setIsInitialLoad(false);
      }
    }
  }, [staticData, vehicleType, fromDriver, initialFilters.vehicleTypeId, isInitialLoad, userDataLoaded]);

  // Pagination + search trigger — har qanday page o'zgarishda (0 ga qaytganda ham) reload
  useEffect(() => {
    if (!isInitialLoad) {
      if (searchMode === 'simple' && textQuery.trim()) {
        loadTextSearch();
      } else {
        loadCargos();
      }
    }
  }, [page, searchTrigger]);

  const loadCargos = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasMore(false);

    try {
      const filters = {
        fromCountry: fromCountry || undefined,
        fromRegion: fromRegion || undefined,
        fromCity: fromCity || undefined,
        toCountry: toCountry || undefined,
        toRegion: toRegion || undefined,
        toCity: toCity || undefined,
        vehicleType: vehicleType || undefined,
        minWeight: minWeight || undefined,
        maxWeight: maxWeight || undefined,
        orderType: orderTypeParam(senderFilter),
        page
      };

      const response = fromDriver && isInternalDispatcher
        ? await searchDispatcherCargos(filters)
        : await searchCargos(filters);
      if (response.code === 200) {
        if (fromDriver && isInternalDispatcher) {
          const internal = response.result?.internalLoads || [];
          const other = response.result?.otherLoads || [];
          if (internal.length === 0 && other.length === 0 && page > 0) {
            setPage((current) => Math.max(0, current - 1));
            return;
          }
          setInternalCargos(internal);
          setOtherCargos(other);
          setCargos([...internal, ...other]);
          setHasMore(response.result?.hasMore === true);
        } else {
          const cargoPage = normalizeCargoPage(response.result);
          if (cargoPage.items.length === 0 && page > 0) {
            setPage((current) => Math.max(0, current - 1));
            return;
          }
          setInternalCargos([]);
          setOtherCargos([]);
          setCargos(cargoPage.items);
          setHasMore(cargoPage.hasMore);
        }
      } else {
        setHasMore(false);
        setError(response.message || 'Yuklar topilmadi');
      }
    } catch (err) {
      setHasMore(false);
      setError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromCountry, fromRegion, fromCity, toCountry, toRegion, toCity, vehicleType, minWeight, maxWeight, senderFilter, page, fromDriver, isInternalDispatcher]);

  const loadTextSearch = useCallback(async () => {
    if (!textQuery.trim()) return;
    setLoading(true);
    setError(null);
    setHasMore(false);

    try {
      const response = fromDriver && isInternalDispatcher
        ? await searchDispatcherCargos({
          query: textQuery.trim(),
          page,
          orderType: orderTypeParam(senderFilter),
        })
        : await textSearchCargos(textQuery.trim(), page, orderTypeParam(senderFilter));
      if (response.code === 200) {
        if (fromDriver && isInternalDispatcher) {
          const internal = response.result?.internalLoads || [];
          const other = response.result?.otherLoads || [];
          if (internal.length === 0 && other.length === 0 && page > 0) {
            setPage((current) => Math.max(0, current - 1));
            return;
          }
          setInternalCargos(internal);
          setOtherCargos(other);
          setCargos([...internal, ...other]);
          setHasMore(response.result?.hasMore === true);
        } else {
          const cargoPage = normalizeCargoPage(response.result);
          if (cargoPage.items.length === 0 && page > 0) {
            setPage((current) => Math.max(0, current - 1));
            return;
          }
          setInternalCargos([]);
          setOtherCargos([]);
          setCargos(cargoPage.items);
          setHasMore(cargoPage.hasMore);
        }
      } else {
        setHasMore(false);
        setError(response.message || 'Yuklar topilmadi');
      }
    } catch (err) {
      setHasMore(false);
      setError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [textQuery, page, senderFilter, fromDriver, isInternalDispatcher]);

  const handleAssigned = (cargoId) => {
    setCargos((items) => items.filter((cargo) => cargo.id !== cargoId));
    setInternalCargos((items) => items.filter((cargo) => cargo.id !== cargoId));
    setOtherCargos((items) => items.filter((cargo) => cargo.id !== cargoId));
  };

  const buildSearchKey = (searchState) => {
    return JSON.stringify({
      fromCountry: searchState.fromCountry || '',
      fromRegion: searchState.fromRegion || '',
      fromCity: searchState.fromCity || '',
      toCountry: searchState.toCountry || '',
      toRegion: searchState.toRegion || '',
      toCity: searchState.toCity || '',
      vehicleType: searchState.vehicleType || '',
      minWeight: searchState.minWeight || '',
      maxWeight: searchState.maxWeight || '',
      senderFilter: searchState.senderFilter || 'all',
    });
  };

  const hasSelectedSearchOptions = (searchState) => {
    return Boolean(
      searchState.fromCountry ||
        searchState.fromRegion ||
        searchState.fromCity ||
        searchState.toCountry ||
        searchState.toRegion ||
        searchState.toCity ||
        searchState.vehicleType ||
        searchState.minWeight ||
        searchState.maxWeight ||
        (searchState.senderFilter || 'all') !== 'all'
    );
  };

  useEffect(() => {
    setHarbingerCreatedForCurrentSearch(false);
  }, [
    fromCountry,
    fromRegion,
    fromCity,
    toCountry,
    toRegion,
    toCity,
    vehicleType,
    minWeight,
    maxWeight,
    senderFilter,
  ]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (searchMode === 'simple' && textQuery.trim()) {
      loadTextSearch();
    } else {
      loadCargos();
    }
  };

  const handleTextSearch = (e) => {
    e.preventDefault();
    if (!textQuery.trim() || textQuery.trim().length < 3) return;
    setPage(0);
    setHasSearched(false);
    setIsInitialLoad(false);
    setSearchTrigger((t) => t + 1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const currentSearchState = {
      fromCountry,
      fromRegion,
      fromCity,
      toCountry,
      toRegion,
      toCity,
      vehicleType,
      minWeight,
      maxWeight,
      senderFilter,
    };
    const currentSearchKey = buildSearchKey(currentSearchState);

    if (currentSearchKey !== searchSnapshotKey) {
      setHarbingerCreatedForCurrentSearch(false);
    }

    setSearchSnapshotKey(currentSearchKey);
    setPage(0);
    setHasSearched(hasSelectedSearchOptions(currentSearchState));
    setIsInitialLoad(false);
    setSearchTrigger((t) => t + 1);
  };

  const handleReset = () => {
    setFromCountry('');
    setFromRegion('');
    setFromCity('');
    setToCountry('');
    setToRegion('');
    setToCity('');
    setVehicleType('');
    setMinWeight('');
    setMaxWeight('');
    handleSenderFilterChange('cargo_owner_only');
    setPage(0);
    setHasSearched(false);
    setSearchSnapshotKey('');
    setHarbingerCreatedForCurrentSearch(false);
    setIsInitialLoad(false);
    setSearchTrigger((t) => t + 1);
  };

  const handleSenderFilterChange = (value) => {
    const nextValue = SENDER_FILTERS.includes(value) ? value : 'cargo_owner_only';
    setSenderFilter(nextValue);
    try {
      localStorage.setItem(SENDER_FILTER_STORAGE_KEY, nextValue);
      localStorage.setItem('cargoOwnerOnly', nextValue === 'cargo_owner_only' ? 'true' : 'false');
    } catch (_) {
      // storage mavjud bo'lmasa — silently o'tkazib yuborish
    }
    setPage(0);
    setSearchTrigger((t) => t + 1);
  };

  const handleClearTextSearch = () => {
    setTextQuery('');
    setSearchMode('simple');
    setPage(0);
    setCargos([]);
    setIsInitialLoad(true);
  };

  const handleSwitchMode = (mode) => {
    if (mode === searchMode) return;
    setSearchMode(mode);
    setPage(0);
    setCargos([]);
    setError(null);
    setHasSearched(false);
    setHarbingerCreatedForCurrentSearch(false);
    if (mode === 'simple') {
      setTextQuery('');
    }
    setIsInitialLoad(false);
    setSearchTrigger((t) => t + 1);
  };

  const handleCreateHarbingerFromFilters = async () => {
    if (!localStorage.getItem('authToken')) {
      navigate('/login');
      return;
    }

    if (!permissions?.createHarbinger) {
      setShowClubModal(true);
      return;
    }

    if (!hasSearched || !searchSnapshotKey || harbingerCreatedForCurrentSearch) {
      return;
    }

    setCreatingHarbinger(true);

    try {
      const parseOptionalInt = (value) => {
        if (value === '' || value === null || value === undefined) return null;
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? null : parsed;
      };

      let cityId = parseOptionalInt(fromCity);
      let regionId = parseOptionalInt(fromRegion);
      let countryId = parseOptionalInt(fromCountry);

      if (cityId && (!regionId || !countryId)) {
        const city = staticData?.cities?.find((item) => item.cityId === cityId);
        if (city) {
          regionId = regionId ?? city.regionId;
          countryId = countryId ?? city.countryId;
        }
      }

      if (regionId && !countryId) {
        const region = staticData?.regions?.find((item) => item.regionId === regionId);
        if (region) {
          countryId = region.countryId;
        }
      }

      if (countryId && regionId === null) {
        regionId = 0;
      }
      if (regionId !== null && cityId === null) {
        cityId = 0;
      }

      if (!countryId) {
        showError('Xabarchi yaratish uchun kamida "Qayerdan" filtri tanlanishi kerak');
        return;
      }

      const selectedVehicleType = staticData?.vehicleTypes?.find(
        (vehicle) =>
          vehicle.name === vehicleType ||
          vehicle.code === vehicleType ||
          String(vehicle.id) === String(vehicleType)
      );

      const parsedMinWeight = minWeight ? parseFloat(minWeight) : null;
      const parsedMaxWeight = maxWeight ? parseFloat(maxWeight) : null;

      const harbingerData = {
        fromLocation: {
          cityId,
          regionId,
          countryId,
        },
        minWeight: Number.isNaN(parsedMinWeight) ? null : parsedMinWeight,
        maxWeight: Number.isNaN(parsedMaxWeight) ? null : parsedMaxWeight,
        vehicleTypeId: selectedVehicleType?.id || null,
        orderTypePreference: senderFilter === 'all' ? 'any' : senderFilter,
      };

      const response = await createHarbinger(harbingerData);
      if (response.code === 200) {
        setHarbingerCreatedForCurrentSearch(true);
        showSuccess('Tanlangan qidiruv filterlari bo\u2019yicha xabarchi yaratildi');
      } else {
        showError(response.message || 'Xabarchi yaratishda xatolik');
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setCreatingHarbinger(false);
    }
  };

  const filteredFromRegions = staticData?.regions.filter(
    r => r.countryId === parseInt(fromCountry)
  ) || [];

  const filteredFromCities = staticData?.cities.filter(
    c => c.regionId === parseInt(fromRegion)
  ) || [];

  const filteredToRegions = staticData?.regions.filter(
    r => r.countryId === parseInt(toCountry)
  ) || [];

  const filteredToCities = staticData?.cities.filter(
    c => c.regionId === parseInt(toRegion)
  ) || [];
  const canCreateOrder = Boolean(
    localStorage.getItem('authToken') && ['logist', 'factory'].includes(userRole)
  );

  return (
    <div className="container">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h1 className="page-title" style={{ margin: 0 }}>Yuklar qidirish</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {canCreateOrder && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/create-order')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
              Yuk qo'shish
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '14px',
              minWidth: 'auto'
            }}
            title="Yangilash"
          >
            <span style={{
              display: 'inline-block',
              animation: refreshing ? 'spin 1s linear infinite' : 'none'
            }}>🔄</span>
            {!refreshing && <span>Yangilash</span>}
          </button>
        </div>
      </div>

      {/* Login CTA for unauthenticated users */}
      {!localStorage.getItem('authToken') && (
        <div style={{
          background: 'linear-gradient(135deg, #08142c 0%, #1a3a5c 100%)',
          color: 'white',
          padding: '20px 24px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
              YukBor platformasiga xush kelibsiz!
            </div>
            <div style={{ fontSize: '13px', opacity: 0.85 }}>
              E'lon berish va barcha imkoniyatlardan foydalanish uchun tizimga kiring
            </div>
          </div>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'white',
              color: '#08142c',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Kirish
          </button>
        </div>
      )}

      {/* Search Mode Toggle */}
      <div style={{
        display: 'flex',
        gap: '0',
        marginBottom: '20px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #ddd',
      }}>
        <button
          onClick={() => handleSwitchMode('simple')}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            background: searchMode === 'simple' ? '#0088cc' : '#f5f5f5',
            color: searchMode === 'simple' ? '#fff' : '#555',
            transition: 'all 0.2s',
          }}
        >
          🔍 Qidirish
        </button>
        <button
          onClick={() => handleSwitchMode('advanced')}
          style={{
            flex: 1,
            padding: '10px 16px',
            border: 'none',
            borderLeft: '1px solid #ddd',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            background: searchMode === 'advanced' ? '#0088cc' : '#f5f5f5',
            color: searchMode === 'advanced' ? '#fff' : '#555',
            transition: 'all 0.2s',
          }}
        >
          ⚙️ Kengaytirilgan qidiruv
        </button>
      </div>

      {fromDriver && driverName && (
        <div style={{
          padding: '15px',
          backgroundColor: '#d1ecf1',
          border: '1px solid #bee5eb',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#0c5460'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '16px' }}>
              👤 {driverName} uchun mos yuklar qidirilmoqda
            </strong>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '13px', fontStyle: 'italic' }}>
            Filter&apos;lar haydovchi ma&apos;lumotlariga asosan to&apos;ldirildi. O&apos;zgartirishingiz mumkin.
          </p>
        </div>
      )}

      {/* Simple Text Search */}
      {searchMode === 'simple' && (
        <div className="search-filters" style={{ marginBottom: '20px' }}>
          <form onSubmit={handleTextSearch} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                placeholder="Masalan: toshkent farg'ona tent"
                style={{ width: '100%', paddingRight: textQuery ? '36px' : undefined }}
              />
              {textQuery && (
                <button
                  type="button"
                  onClick={handleClearTextSearch}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#999',
                    padding: '2px 6px',
                    lineHeight: 1,
                  }}
                  title="Tozalash"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!textQuery.trim() || textQuery.trim().length < 3 || loading}
            >
              Qidirish
            </button>
          </form>
          {textQuery.trim().length > 0 && textQuery.trim().length < 3 && (
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Kamida 3 ta belgi kiriting
            </div>
          )}
          <div style={{ marginTop: '12px' }}>
            <CargoOwnerToggle
              value={senderFilter}
              onValueChange={handleSenderFilterChange}
            />
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      {searchMode === 'advanced' && (
        <div className="search-filters">
          <h3 className="filters-title">Filterlar</h3>
          <form onSubmit={handleSearch}>
            <LocationSelector
              label="Qayerdan"
              countryValue={fromCountry}
              regionValue={fromRegion}
              cityValue={fromCity}
              onCountryChange={setFromCountry}
              onRegionChange={setFromRegion}
              onCityChange={setFromCity}
              staticData={staticData}
            />

            <LocationSelector
              label="Qayerga"
              countryValue={toCountry}
              regionValue={toRegion}
              cityValue={toCity}
              onCountryChange={setToCountry}
              onRegionChange={setToRegion}
              onCityChange={setToCity}
              staticData={staticData}
            />

            {/* Vehicle Type and Weight */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Transport turi</label>
                <select
                  className="form-select"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                >
                  <option value="">Hammasi</option>
                  {staticData?.vehicleTypes.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.name}>
                      {vehicle.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Min og&apos;irligi (t)</label>
                <input
                  type="number"
                  className="form-input"
                  value={minWeight}
                  onChange={(e) => setMinWeight(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max og&apos;irligi (t)</label>
                <input
                  type="number"
                  className="form-input"
                  value={maxWeight}
                  onChange={(e) => setMaxWeight(e.target.value)}
                  placeholder="10000"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <CargoOwnerToggle
                value={senderFilter}
                onValueChange={handleSenderFilterChange}
              />
            </div>

            <div className="btn-group">
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                Tozalash
              </button>
              <button type="submit" className="btn btn-primary">
                Qidirish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Harbinger card - faqat advanced mode da */}
      {searchMode === 'advanced' && hasSearched && !loading && cargos.length === 0 && page === 0 && (
        <div
          className="card"
          style={{
            marginBottom: '20px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ color: '#555', lineHeight: '1.5' }}>
            Shu filterlar bo&apos;yicha yangi buyurtma tushsa sizga xabar beraylikmi?
          </div>
          <button
            type="button"
            className="btn btn-success"
            onClick={handleCreateHarbingerFromFilters}
            disabled={
              creatingHarbinger ||
              !searchSnapshotKey ||
              harbingerCreatedForCurrentSearch
            }
          >
            {creatingHarbinger
              ? 'Yaratilmoqda...'
              : harbingerCreatedForCurrentSearch
                ? 'Xabarchi yaratildi'
                : 'Xabarchi yaratish'}
          </button>
        </div>
      )}

      {/* Results */}
      {loading && <div className="loading">Yuklanmoqda...</div>}

      {error && <div className="error-message">{error}</div>}

      {!loading && !error && cargos.length === 0 && (
        <div className="empty-state">
          {searchMode === 'simple' && textQuery.trim()
            ? `"${textQuery}" bo\u2019yicha yuk topilmadi. Boshqa so\u2019z bilan qidirib ko\u2019ring.`
            : vehicleType
              ? `"${vehicleType}" turi bo\u2019yicha yuk topilmadi. Boshqa turni tanlang yoki filterni tozalang.`
              : 'Hech qanday yuk topilmadi'}
        </div>
      )}

      {!loading && !error && cargos.length > 0 && (
        <>
          {fromDriver && isInternalDispatcher ? (
            <>
              <section style={{ marginBottom: 28 }}>
                <h2 style={{ fontSize: 20, color: '#92400e', marginBottom: 12 }}>
                  ⭐ Ichki yuklar ({internalCargos.length})
                </h2>
                {internalCargos.length > 0 ? (
                  <div className="grid">
                    {internalCargos.map((cargo) => (
                      <CargoCard
                        key={cargo.id}
                        cargo={cargo}
                        showOfferButton
                        driverId={driverId}
                        driverReference={driverReference}
                        canOffer
                        assignDirectly
                        onAssigned={handleAssigned}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: 20 }}>Mos ichki yuk topilmadi</div>
                )}
              </section>

              <section>
                <h2 style={{ fontSize: 20, color: '#475569', marginBottom: 12 }}>
                  Boshqa yuklar ({otherCargos.length})
                </h2>
                {otherCargos.length > 0 ? (
                  <div className="grid">
                    {otherCargos.map((cargo) => (
                      <CargoCard
                        key={cargo.id}
                        cargo={cargo}
                        showOfferButton
                        driverId={driverId}
                        driverReference={driverReference}
                        canOffer
                        assignDirectly
                        onAssigned={handleAssigned}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: 20 }}>Mos boshqa yuk topilmadi</div>
                )}
              </section>
            </>
          ) : (
            <div className="grid">
              {cargos.map(cargo => (
                <CargoCard
                  key={cargo.id}
                  cargo={cargo}
                  showOfferButton={fromDriver}
                  driverId={driverId}
                  driverReference={driverReference}
                  canOffer={!!permissions?.offerToDriver}
                  showOfferToDriverButton={!!permissions?.offerToDriver && !fromDriver}
                />
              ))}
            </div>
          )}

          {(page > 0 || hasMore) && <div className="pagination">
            <button
              className="pagination-button"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
            >
              <span>←</span>
              <span>Oldingi</span>
            </button>
            <span className="pagination-info">Sahifa {page + 1}</span>
            {hasMore && (
              <button
                className="pagination-button"
                onClick={() => setPage(p => p + 1)}
                disabled={loading}
              >
                <span>Keyingi</span>
                <span>→</span>
              </button>
            )}
          </div>}
        </>
      )}

      <ClubMembershipModal
        isOpen={showClubModal}
        onClose={() => setShowClubModal(false)}
        featureKey="createHarbinger"
        message="Tanlangan qidiruv bo'yicha avtomatik xabarchi yaratish uchun premium tarif kerak."
        currentLimit={featureLimits?.createHarbinger}
      />
    </div>
  );
}
