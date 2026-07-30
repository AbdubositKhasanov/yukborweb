/**
 * Mobile Home Page
 * Content-first cargo feed with text search + collapsed advanced filters
 * Pagination matches Desktop SearchPage.jsx pattern exactly
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStaticData } from '../../context/StaticDataContext';
import {
  searchCargos,
  textSearchCargos,
  searchPlatformCargos,
  searchDispatcherCargos,
  createHarbinger,
  getUserMe,
} from '../../services/api';
import { useMobileAuth } from '../context/MobileAuthContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import CargoListItem from '../components/CargoListItem';
import { ListSkeleton } from '../components/MobileLoading';
import PullToRefresh from '../components/PullToRefresh';
import ClubMembershipModal from '../../components/ClubMembershipModal';
import CargoOwnerToggle from '../../components/CargoOwnerToggle';
import LocationSelector from '../../components/LocationSelector';
import { showError, showSuccess } from '../../utils/toast';
import { sortCargosByMatch } from '../../utils/cargoMatch';

const SENDER_FILTER_STORAGE_KEY = 'cargoSenderFilter';
const MOBILE_CARGO_FEED_STATE_KEY = 'mobileCargoFeedState';
const MOBILE_CARGO_FEED_RESTORE_KEY = 'mobileCargoFeedRestorePending';
const SENDER_FILTERS = ['all', 'cargo_owner_only'];

function normalizeSenderFilter(value) {
  return SENDER_FILTERS.includes(value) ? value : 'cargo_owner_only';
}

function readMobileCargoFeedState() {
  try {
    if (sessionStorage.getItem(MOBILE_CARGO_FEED_RESTORE_KEY) !== 'true') return null;
    const raw = sessionStorage.getItem(MOBILE_CARGO_FEED_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  } finally {
    try {
      sessionStorage.removeItem(MOBILE_CARGO_FEED_RESTORE_KEY);
      sessionStorage.removeItem(MOBILE_CARGO_FEED_STATE_KEY);
    } catch (_) {
      // ignore
    }
  }
}

function writeMobileCargoFeedState(state) {
  try {
    sessionStorage.setItem(MOBILE_CARGO_FEED_STATE_KEY, JSON.stringify(state));
    sessionStorage.setItem(MOBILE_CARGO_FEED_RESTORE_KEY, 'true');
  } catch (_) {
    // ignore
  }
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

export default function MobileHome({ internalOnly = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { staticData } = useStaticData();
  const { isAuthenticated, userRole, isInternalDispatcher } = useMobileAuth();

  // Check for driver context - MUST use same keys as Desktop SearchPage.jsx
  const fromDriver = location.state?.fromDriver === true;
  const driverId = location.state?.driverId || null;
  const driverReference = location.state?.driverReference || driverId;
  const driverName = location.state?.driverName || null;
  const driverFilters = location.state?.filters || {};
  const restoredFeedState = useMemo(() => readMobileCargoFeedState(), []);

  // Permissions check
  const [permissions, setPermissions] = useState(null);
  const [featureLimits, setFeatureLimits] = useState(null);

  // Search mode: 'simple' (text) or 'advanced' (filters)
  const [searchMode, setSearchMode] = useState(restoredFeedState?.searchMode || (fromDriver ? 'advanced' : 'simple'));
  const [textQuery, setTextQuery] = useState(restoredFeedState?.textQuery || '');

  // Filter state - pre-fill from driver filters if available
  const [filters, setFilters] = useState(() => ({
    fromCountry: driverFilters.fromCountry?.toString() || '',
    fromRegion: driverFilters.fromRegion?.toString() || '',
    fromCity: driverFilters.fromCity?.toString() || '',
    toCountry: '',
    toRegion: '',
    toCity: '',
    vehicleType: driverFilters.vehicleTypeId?.toString() || '',
    minWeight: '',
    maxWeight: driverFilters.maxWeight?.toString() || '',
    ...(restoredFeedState?.filters && typeof restoredFeedState.filters === 'object' ? restoredFeedState.filters : {}),
  }));
  const [activeFilters, setActiveFilters] = useState(() => (
    Array.isArray(restoredFeedState?.activeFilters) ? restoredFeedState.activeFilters : []
  ));
  const [searchTrigger, setSearchTrigger] = useState(0);

  // Data state - matches Desktop SearchPage.jsx exactly
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(() => {
    const restoredPage = Number(restoredFeedState?.page);
    return Number.isFinite(restoredPage) && restoredPage > 0 ? restoredPage : 0;
  });
  const [hasMore, setHasMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasSearched, setHasSearched] = useState(restoredFeedState?.hasSearched === true);
  const [searchSnapshotKey, setSearchSnapshotKey] = useState(restoredFeedState?.searchSnapshotKey || '');
  const [creatingHarbinger, setCreatingHarbinger] = useState(false);
  const [harbingerCreatedForCurrentSearch, setHarbingerCreatedForCurrentSearch] = useState(
    restoredFeedState?.harbingerCreatedForCurrentSearch === true
  );
  const [showClubModal, setShowClubModal] = useState(false);
  const [senderFilter, setSenderFilter] = useState(() => normalizeSenderFilter(restoredFeedState?.senderFilter));

  // UI state
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Load user data
  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!staticData?.vehicleTypes || !driverFilters.vehicleTypeId) return;
    setFilters((prev) => {
      if (prev.vehicleType !== driverFilters.vehicleTypeId.toString()) return prev;
      const vehicle = staticData.vehicleTypes.find(
        (item) => String(item.id) === driverFilters.vehicleTypeId.toString()
      );
      return vehicle ? { ...prev, vehicleType: vehicle.name } : prev;
    });
  }, [staticData, driverFilters.vehicleTypeId]);

  const loadUserData = async () => {
    try {
      const response = await getUserMe();
      if (response.code === 200 && response.result) {
        setPermissions(response.result.permissions || null);
        setFeatureLimits(response.result.featureLimits || null);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  // Build active filter chips
  const buildActiveFilters = useCallback((filterObj) => {
    const chips = [];
    if (filterObj.fromCountry) {
      const country = staticData?.countries?.find((c) => String(c.countryId) === filterObj.fromCountry);
      chips.push({ key: 'fromCountry', label: country?.name || filterObj.fromCountry });
    }
    if (filterObj.fromRegion) {
      const region = staticData?.regions?.find((r) => String(r.regionId) === filterObj.fromRegion || r.code === filterObj.fromRegion);
      chips.push({ key: 'fromRegion', label: region?.name || filterObj.fromRegion });
    }
    if (filterObj.fromCity) {
      const city = staticData?.cities?.find((c) => String(c.cityId) === filterObj.fromCity);
      chips.push({ key: 'fromCity', label: city?.name || filterObj.fromCity });
    }
    if (filterObj.toCountry) {
      const country = staticData?.countries?.find((c) => String(c.countryId) === filterObj.toCountry);
      chips.push({ key: 'toCountry', label: `\u2192 ${country?.name || filterObj.toCountry}` });
    }
    if (filterObj.toRegion) {
      const region = staticData?.regions?.find((r) => String(r.regionId) === filterObj.toRegion || r.code === filterObj.toRegion);
      chips.push({ key: 'toRegion', label: `\u2192 ${region?.name || filterObj.toRegion}` });
    }
    if (filterObj.toCity) {
      const city = staticData?.cities?.find((c) => String(c.cityId) === filterObj.toCity);
      chips.push({ key: 'toCity', label: `\u2192 ${city?.name || filterObj.toCity}` });
    }
    if (filterObj.vehicleType) {
      const vehicle = staticData?.vehicleTypes?.find(
        (v) =>
          v.code === filterObj.vehicleType ||
          v.name === filterObj.vehicleType ||
          String(v.id) === String(filterObj.vehicleType)
      );
      chips.push({ key: 'vehicleType', label: vehicle?.name || filterObj.vehicleType });
    }
    if (filterObj.minWeight || filterObj.maxWeight) {
      const min = filterObj.minWeight || '0';
      const max = filterObj.maxWeight || '\u221E';
      chips.push({ key: 'weight', label: `${min}-${max}t` });
    }
    return chips;
  }, [staticData]);

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
  }, [filters, senderFilter]);

  // Load cargos - branches based on search mode
  const loadCargos = useCallback(async () => {
    setLoading(true);
    setHasMore(false);

    try {
      let response;
      const selectedOrderType = orderTypeParam(senderFilter);
      const searchParams = {
        fromCountry: filters.fromCountry || undefined,
        fromRegion: filters.fromRegion || undefined,
        fromCity: filters.fromCity || undefined,
        toCountry: filters.toCountry || undefined,
        toRegion: filters.toRegion || undefined,
        toCity: filters.toCity || undefined,
        vehicleType: filters.vehicleType || undefined,
        minWeight: filters.minWeight || undefined,
        maxWeight: filters.maxWeight || undefined,
        matchMode: fromDriver ? 'driver' : undefined,
        orderType: internalOnly ? undefined : selectedOrderType,
        page,
        ...(searchMode === 'simple' && textQuery.trim() ? { query: textQuery.trim() } : {}),
      };
      if (internalOnly) {
        response = await searchPlatformCargos(searchParams);
      } else if (fromDriver && isInternalDispatcher) {
        response = await searchDispatcherCargos(searchParams);
      } else if (searchMode === 'simple' && textQuery.trim()) {
        response = await textSearchCargos(textQuery.trim(), page, selectedOrderType);
      } else {
        response = await searchCargos(searchParams);
      }

      if (response.code === 200) {
        if (fromDriver && isInternalDispatcher && !internalOnly) {
          const internal = response.result?.internalLoads || [];
          const other = response.result?.otherLoads || [];
          if (internal.length === 0 && other.length === 0 && page > 0) {
            setPage((current) => Math.max(0, current - 1));
            return;
          }
          setCargos(sortCargosByMatch([...internal, ...other]));
          setHasMore(response.result?.hasMore === true);
        } else {
          const cargoPage = normalizeCargoPage(response.result);
          if (cargoPage.items.length === 0 && page > 0) {
            setPage((current) => Math.max(0, current - 1));
            return;
          }
          setCargos(fromDriver ? sortCargosByMatch(cargoPage.items) : cargoPage.items);
          setHasMore(cargoPage.hasMore);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      setHasMore(false);
      console.error('Failed to load cargos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, page, searchMode, textQuery, senderFilter, internalOnly, fromDriver, isInternalDispatcher]);

  const handleAssigned = (cargoId) => {
    setCargos((items) => items.filter((cargo) => cargo.id !== cargoId));
  };

  // Initial load
  useEffect(() => {
    if (isInitialLoad) {
      loadCargos();
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, loadCargos]);

  // Pagination + search trigger — har qanday page o'zgarishda (0 ga qaytganda ham) reload
  useEffect(() => {
    if (!isInitialLoad) {
      loadCargos();
    }
  }, [page, searchTrigger]);

  const handleSenderFilterChange = (value) => {
    const nextValue = normalizeSenderFilter(value);
    setSenderFilter(nextValue);
    try {
      localStorage.setItem(SENDER_FILTER_STORAGE_KEY, nextValue);
      localStorage.setItem('cargoOwnerOnly', nextValue === 'cargo_owner_only' ? 'true' : 'false');
    } catch (_) {
      // ignore
    }
    setPage(0);
    setIsInitialLoad(false);
    setSearchTrigger((t) => t + 1);
  };

  const handleOpenCargo = useCallback((cargo) => {
    const cargoId = cargo?.id || cargo?._id;
    if (!cargoId) return;

    writeMobileCargoFeedState({
      searchMode,
      textQuery,
      filters,
      activeFilters,
      page,
      hasSearched,
      searchSnapshotKey,
      harbingerCreatedForCurrentSearch,
      senderFilter,
    });
    navigate(`/mobile/cargo/${cargoId}`);
  }, [
    activeFilters,
    filters,
    harbingerCreatedForCurrentSearch,
    hasSearched,
    navigate,
    page,
    searchMode,
    searchSnapshotKey,
    senderFilter,
    textQuery,
  ]);

  // Text search handler
  const handleTextSearch = () => {
    if (!textQuery.trim() || textQuery.trim().length < 3) return;
    setSearchMode('simple');
    setActiveFilters([]);
    setHasSearched(false);
    setHarbingerCreatedForCurrentSearch(false);
    setPage(0);
    setIsInitialLoad(false);
    setSearchTrigger((t) => t + 1);
  };

  // Clear text search — filtrsiz barcha yuklarni ko'rsatish
  const handleClearTextSearch = () => {
    setTextQuery('');
    setSearchMode('simple');
    setPage(0);
    setCargos([]);
    setIsInitialLoad(true);
  };

  const handleClearDriverContext = () => {
    setFilters({
      fromCountry: '',
      fromRegion: '',
      fromCity: '',
      toCountry: '',
      toRegion: '',
      toCity: '',
      vehicleType: '',
      minWeight: '',
      maxWeight: '',
    });
    setActiveFilters([]);
    setSearchMode('simple');
    setTextQuery('');
    setPage(0);
    setCargos([]);
    setHasMore(false);
    setHasSearched(false);
    setSearchSnapshotKey('');
    setHarbingerCreatedForCurrentSearch(false);
    setIsInitialLoad(false);
    navigate('/mobile', { replace: true, state: null });
    setSearchTrigger((t) => t + 1);
  };

  // Handle filter apply from BottomSheet
  const handleApplyFilters = () => {
    setSearchMode('advanced');
    setTextQuery('');

    const currentSearchState = { ...filters, senderFilter };
    const currentSearchKey = buildSearchKey(currentSearchState);
    if (currentSearchKey !== searchSnapshotKey) {
      setHarbingerCreatedForCurrentSearch(false);
    }

    setActiveFilters(buildActiveFilters(filters));
    setFilterSheetOpen(false);
    setSearchSnapshotKey(currentSearchKey);
    setHasSearched(hasSelectedSearchOptions(currentSearchState));
    setPage(0);
    setIsInitialLoad(false);
    setSearchTrigger((t) => t + 1);
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setFilters({
      fromCountry: '',
      fromRegion: '',
      fromCity: '',
      toCountry: '',
      toRegion: '',
      toCity: '',
      vehicleType: '',
      minWeight: '',
      maxWeight: '',
    });
    handleSenderFilterChange('cargo_owner_only');
    setActiveFilters([]);
    setHasSearched(false);
    setSearchSnapshotKey('');
    setHarbingerCreatedForCurrentSearch(false);
  };

  // Remove single filter
  const handleRemoveFilter = (key) => {
    const newFilters = { ...filters };
    if (key === 'weight') {
      newFilters.minWeight = '';
      newFilters.maxWeight = '';
    } else if (key === 'fromCountry') {
      newFilters.fromCountry = '';
      newFilters.fromRegion = '';
      newFilters.fromCity = '';
    } else if (key === 'fromRegion') {
      newFilters.fromRegion = '';
      newFilters.fromCity = '';
    } else if (key === 'toCountry') {
      newFilters.toCountry = '';
      newFilters.toRegion = '';
      newFilters.toCity = '';
    } else if (key === 'toRegion') {
      newFilters.toRegion = '';
      newFilters.toCity = '';
    } else {
      newFilters[key] = '';
    }
    setFilters(newFilters);
    setActiveFilters(buildActiveFilters(newFilters));
    const currentSearchState = { ...newFilters, senderFilter };
    const currentSearchKey = buildSearchKey(currentSearchState);
    if (currentSearchKey !== searchSnapshotKey) {
      setHarbingerCreatedForCurrentSearch(false);
    }
    setSearchSnapshotKey(currentSearchKey);
    setHasSearched(hasSelectedSearchOptions(currentSearchState));
    setPage(0);
    setIsInitialLoad(true); // Trigger reload
  };

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    await loadCargos();
  }, [loadCargos]);

  const handleCreateHarbingerFromFilters = async () => {
    if (!isAuthenticated) {
      navigate('/mobile', { replace: true });
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

      let cityId = parseOptionalInt(filters.fromCity);
      let regionId = parseOptionalInt(filters.fromRegion);
      let countryId = parseOptionalInt(filters.fromCountry);

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
          vehicle.name === filters.vehicleType ||
          vehicle.code === filters.vehicleType ||
          String(vehicle.id) === String(filters.vehicleType)
      );

      const parsedMinWeight = filters.minWeight ? parseFloat(filters.minWeight) : null;
      const parsedMaxWeight = filters.maxWeight ? parseFloat(filters.maxWeight) : null;

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
        showSuccess("Tanlangan qidiruv filterlari bo\u2019yicha xabarchi yaratildi");
      } else {
        showError(response.message || 'Xabarchi yaratishda xatolik');
      }
    } catch (error) {
      showError(error.response?.data?.message || error.message || 'Xatolik yuz berdi');
    } finally {
      setCreatingHarbinger(false);
    }
  };
  const canCreateOrder = isAuthenticated && ['logist', 'factory'].includes(userRole);

  return (
    <>
      <TopBar title={internalOnly ? 'Ichki yuklar' : 'YukBor'} />

      <main className="m-content">
        {canCreateOrder && !internalOnly && (
          <div style={{ padding: '10px 12px', background: 'var(--m-card-bg)', borderBottom: '1px solid var(--m-border)' }}>
            <button
              className="m-btn m-btn-primary m-btn-full m-btn-lg"
              onClick={() => navigate('/mobile/create-order')}
              style={{ justifyContent: 'center' }}
            >
              + Yuk qo'shish
            </button>
          </div>
        )}

        {/* Text search bar */}
        <div style={{
          padding: '8px 12px',
          background: 'var(--m-card-bg)',
          borderBottom: '1px solid var(--m-border)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              className="m-form-input"
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              placeholder="Qidirish... (masalan: toshkent farg'ona)"
              onKeyDown={(e) => { if (e.key === 'Enter') handleTextSearch(); }}
              style={{ width: '100%', margin: 0, paddingRight: textQuery ? '32px' : undefined }}
            />
            {textQuery && (
              <button
                type="button"
                onClick={handleClearTextSearch}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#999',
                  padding: '2px 4px',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>
          <button
            className="m-btn m-btn-primary"
            onClick={handleTextSearch}
            disabled={!textQuery.trim() || textQuery.trim().length < 3 || loading}
            style={{ padding: '8px 14px', whiteSpace: 'nowrap', fontSize: '13px' }}
          >
            🔍
          </button>
          <button
            className="m-btn m-btn-secondary"
            onClick={() => setFilterSheetOpen(true)}
            style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontSize: '13px' }}
            title="Kengaytirilgan qidiruv"
          >
            ⚙️
          </button>
        </div>

        {!internalOnly && (
          <div style={{ padding: '10px 12px' }}>
            <CargoOwnerToggle
              value={senderFilter}
              onValueChange={handleSenderFilterChange}
            />
          </div>
        )}

        <PullToRefresh onRefresh={handleRefresh} disabled={loading}>
          {/* Active filter chips - faqat advanced mode da */}
          {searchMode === 'advanced' && activeFilters.length > 0 && (
            <div className="m-chips">
              {activeFilters.map((chip) => (
                <button
                  key={chip.key}
                  className="m-chip active"
                  onClick={() => handleRemoveFilter(chip.key)}
                >
                  {chip.label}
                  <span className="m-chip-remove">✕</span>
                </button>
              ))}
            </div>
          )}

          {/* Simple search query chip */}
          {searchMode === 'simple' && textQuery.trim() && cargos.length > 0 && (
            <div className="m-chips" style={{ padding: '8px 12px' }}>
              <span
                className="m-chip active"
                style={{ cursor: 'default' }}
              >
                🔍 {textQuery}
              </span>
            </div>
          )}

          {/* Driver context banner */}
          {fromDriver && (
            <div style={{ padding: '12px 16px', background: '#d1ecf1', marginBottom: 0, fontSize: 14, color: '#0c5460' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>👤 {driverName || 'Tanlangan transport'}</strong> uchun yuk qidirilmoqda
                  <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.4 }}>
                    Shahar, qayerga manzili va tonna bo&apos;yicha eng mos yuklar yuqorida chiqadi.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearDriverContext}
                  aria-label="Tanlangan transportni olib tashlash va oddiy qidiruvga qaytish"
                  title="Transportni olib tashlash"
                  style={{
                    width: 30,
                    height: 30,
                    border: '1px solid #9fcbd2',
                    borderRadius: '50%',
                    background: '#fff',
                    color: '#0c5460',
                    cursor: 'pointer',
                    fontSize: 18,
                    fontWeight: 700,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Harbinger card - faqat advanced mode da */}
          {searchMode === 'advanced' && hasSearched && !loading && cargos.length === 0 && page === 0 && (
            <div
              className="m-card"
              style={{
                margin: '12px 12px 0',
                padding: '14px',
                border: '1px solid var(--m-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: 14, color: 'var(--m-text-secondary)', lineHeight: 1.45 }}>
                Shu filterlar asosida yangi buyurtma tushsa sizga xabar beraylikmi?
              </div>
              <button
                type="button"
                className="m-btn m-btn-success m-btn-full"
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

          {/* Cargo list */}
          {loading && cargos.length === 0 ? (
            <ListSkeleton count={6} />
          ) : cargos.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-icon">📦</div>
              <h3 className="m-empty-title">Yuklar topilmadi</h3>
              <p className="m-empty-text">
                {searchMode === 'simple' && textQuery.trim()
                  ? `"${textQuery}" bo\u2019yicha yuk topilmadi. Boshqa so\u2019z bilan qidirib ko\u2019ring.`
                  : filters.vehicleType
                    ? `"${filters.vehicleType}" turi bo\u2019yicha yuk topilmadi. Boshqa turni tanlang.`
                    : 'Filterlarni o\u2019zgartiring yoki keyinroq qaytib keling'}
              </p>
              {searchMode !== 'simple' && (
                <button className="m-btn m-btn-primary" onClick={() => setFilterSheetOpen(true)}>
                  Filterlar
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="m-card m-card-list">
                {cargos.map((cargo, index) => (
                  <CargoListItem
                    key={cargo.id || cargo._id || index}
                    cargo={cargo}
                    onClick={handleOpenCargo}
                    showOfferButton={fromDriver && (isInternalDispatcher || !!permissions?.offerToDriver)}
                    driverId={driverId}
                    driverReference={driverReference}
                    canOffer={isInternalDispatcher || !!permissions?.offerToDriver}
                    assignDirectly={fromDriver && isInternalDispatcher}
                    showAssignToDriverButton={internalOnly}
                    onAssigned={handleAssigned}
                  />
                ))}
              </div>

              {/* Pagination */}
              {(page > 0 || hasMore) && <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 12,
                padding: '16px',
                borderTop: '1px solid var(--m-border)',
              }}>
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0 || loading}
                  style={{
                    padding: '10px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    border: '1px solid var(--m-border)',
                    borderRadius: 8,
                    background: page === 0 ? 'var(--m-bg)' : 'var(--m-card-bg)',
                    color: page === 0 ? 'var(--m-text-muted)' : 'var(--m-text)',
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                    opacity: page === 0 ? 0.5 : 1,
                  }}
                >
                  ← Oldingi
                </button>

                <span style={{
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--m-text)',
                }}>
                  Sahifa {page + 1}
                </span>

                {hasMore && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={loading}
                    style={{
                      padding: '10px 16px',
                      fontSize: 14,
                      fontWeight: 500,
                      border: '1px solid var(--m-border)',
                      borderRadius: 8,
                      background: 'var(--m-card-bg)',
                      color: 'var(--m-text)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    Keyingi →
                  </button>
                )}
              </div>}

              {/* Loading indicator for pagination */}
              {loading && (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <span className="m-spinner" style={{ width: 24, height: 24 }} />
                </div>
              )}
            </>
          )}
        </PullToRefresh>
      </main>

      {/* Filter Bottom Sheet (Kengaytirilgan qidiruv) */}
      <BottomSheet
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Kengaytirilgan qidiruv"
        footer={
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="m-btn m-btn-secondary"
              style={{ flex: 1 }}
              onClick={handleResetFilters}
            >
              Tozalash
            </button>
            <button
              className="m-btn m-btn-primary"
              style={{ flex: 2 }}
              onClick={handleApplyFilters}
            >
              Qidirish
            </button>
          </div>
        }
      >
        <LocationSelector
          label="Qayerdan"
          countryValue={filters.fromCountry}
          regionValue={filters.fromRegion}
          cityValue={filters.fromCity}
          onCountryChange={(value) => setFilters((prev) => ({ ...prev, fromCountry: value }))}
          onRegionChange={(value) => setFilters((prev) => ({ ...prev, fromRegion: value }))}
          onCityChange={(value) => setFilters((prev) => ({ ...prev, fromCity: value }))}
          staticData={staticData}
          variant="mobile"
        />

        <LocationSelector
          label="Qayerga"
          countryValue={filters.toCountry}
          regionValue={filters.toRegion}
          cityValue={filters.toCity}
          onCountryChange={(value) => setFilters((prev) => ({ ...prev, toCountry: value }))}
          onRegionChange={(value) => setFilters((prev) => ({ ...prev, toRegion: value }))}
          onCityChange={(value) => setFilters((prev) => ({ ...prev, toCity: value }))}
          staticData={staticData}
          variant="mobile"
        />

        <div className="m-form-group">
          <label className="m-form-label">Transport turi</label>
          <select
            className="m-form-select"
            value={filters.vehicleType}
            onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })}
          >
            <option value="">Barchasi</option>
            {staticData?.vehicleTypes?.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="m-form-group">
          <label className="m-form-label">Vazn oralig&apos;i (tonna)</label>
          <div className="m-form-row">
            <input
              type="number"
              className="m-form-input"
              placeholder="Min"
              value={filters.minWeight}
              onChange={(e) => setFilters({ ...filters, minWeight: e.target.value })}
              inputMode="decimal"
            />
            <input
              type="number"
              className="m-form-input"
              placeholder="Max"
              value={filters.maxWeight}
              onChange={(e) => setFilters({ ...filters, maxWeight: e.target.value })}
              inputMode="decimal"
            />
          </div>
        </div>
      </BottomSheet>

      <ClubMembershipModal
        isOpen={showClubModal}
        onClose={() => setShowClubModal(false)}
        featureKey="createHarbinger"
        message="Tanlangan qidiruv bo'yicha avtomatik xabarchi yaratish uchun premium tarif kerak."
        currentLimit={featureLimits?.createHarbinger}
      />
    </>
  );
}
