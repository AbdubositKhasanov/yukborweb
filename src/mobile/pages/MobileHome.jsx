/**
 * Mobile Home Page
 * Content-first cargo feed with text search + collapsed advanced filters
 * Pagination matches Desktop SearchPage.jsx pattern exactly
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStaticData } from '../../context/StaticDataContext';
import { searchCargos, textSearchCargos, createHarbinger, getUserMe } from '../../services/api';
import { useMobileAuth } from '../context/MobileAuthContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import CargoListItem from '../components/CargoListItem';
import { ListSkeleton } from '../components/MobileLoading';
import PullToRefresh from '../components/PullToRefresh';
import ClubMembershipModal from '../../components/ClubMembershipModal';
import { showError, showSuccess } from '../../utils/toast';

export default function MobileHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { staticData } = useStaticData();
  const { isAuthenticated } = useMobileAuth();

  // Check for driver context - MUST use same keys as Desktop SearchPage.jsx
  const fromDriver = location.state?.fromDriver === true;
  const driverId = location.state?.driverId || null;
  const driverName = location.state?.driverName || null;
  const driverFilters = location.state?.filters || {};

  // Permissions check
  const [permissions, setPermissions] = useState(null);

  // Search mode: 'simple' (text) or 'advanced' (filters)
  const [searchMode, setSearchMode] = useState(fromDriver ? 'advanced' : 'simple');
  const [textQuery, setTextQuery] = useState('');

  // Filter state - pre-fill from driver filters if available
  const [filters, setFilters] = useState({
    fromCountry: driverFilters.fromCountry?.toString() || '',
    fromRegion: driverFilters.fromRegion?.toString() || '',
    fromCity: driverFilters.fromCity?.toString() || '',
    toCountry: '',
    toRegion: '',
    toCity: '',
    vehicleType: driverFilters.vehicleTypeId?.toString() || '',
    minWeight: '',
    maxWeight: driverFilters.maxWeight?.toString() || '',
  });
  const [activeFilters, setActiveFilters] = useState([]);
  const [searchTrigger, setSearchTrigger] = useState(0);

  // Data state - matches Desktop SearchPage.jsx exactly
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchSnapshotKey, setSearchSnapshotKey] = useState('');
  const [creatingHarbinger, setCreatingHarbinger] = useState(false);
  const [harbingerCreatedForCurrentSearch, setHarbingerCreatedForCurrentSearch] = useState(false);
  const [showClubModal, setShowClubModal] = useState(false);

  // UI state
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Load user data
  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated]);

  const loadUserData = async () => {
    try {
      const response = await getUserMe();
      if (response.code === 200 && response.result) {
        setPermissions(response.result.permissions || null);
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
      const vehicle = staticData?.vehicleTypes?.find((v) => v.code === filterObj.vehicleType || v.name === filterObj.vehicleType);
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
        searchState.maxWeight
    );
  };

  // Load cargos - branches based on search mode
  const loadCargos = useCallback(async () => {
    setLoading(true);

    try {
      let response;
      if (searchMode === 'simple' && textQuery.trim()) {
        response = await textSearchCargos(textQuery.trim(), page);
      } else {
        response = await searchCargos({
          fromCountry: filters.fromCountry || undefined,
          fromRegion: filters.fromRegion || undefined,
          fromCity: filters.fromCity || undefined,
          toCountry: filters.toCountry || undefined,
          toRegion: filters.toRegion || undefined,
          toCity: filters.toCity || undefined,
          vehicleType: filters.vehicleType || undefined,
          minWeight: filters.minWeight || undefined,
          maxWeight: filters.maxWeight || undefined,
          page,
        });
      }

      if (response.code === 200) {
        setCargos(response.result || []);
      }
    } catch (error) {
      console.error('Failed to load cargos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, page, searchMode, textQuery]);

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

  // Handle filter apply from BottomSheet
  const handleApplyFilters = () => {
    setSearchMode('advanced');
    setTextQuery('');

    const currentSearchKey = buildSearchKey(filters);
    if (currentSearchKey !== searchSnapshotKey) {
      setHarbingerCreatedForCurrentSearch(false);
    }

    setActiveFilters(buildActiveFilters(filters));
    setFilterSheetOpen(false);
    setSearchSnapshotKey(currentSearchKey);
    setHasSearched(hasSelectedSearchOptions(filters));
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
    const currentSearchKey = buildSearchKey(newFilters);
    if (currentSearchKey !== searchSnapshotKey) {
      setHarbingerCreatedForCurrentSearch(false);
    }
    setSearchSnapshotKey(currentSearchKey);
    setHasSearched(hasSelectedSearchOptions(newFilters));
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
      navigate('/mobile/login', { state: { from: { pathname: location.pathname } } });
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

  return (
    <>
      <TopBar title="YukBor" />

      <main className="m-content">
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
          {fromDriver && driverName && (
            <div style={{ padding: '12px 16px', background: '#d1ecf1', marginBottom: 0, fontSize: 14, color: '#0c5460' }}>
              <strong>👤 {driverName}</strong> uchun yuk qidirilmoqda
            </div>
          )}

          {/* Harbinger card - faqat advanced mode da */}
          {searchMode === 'advanced' && hasSearched && (
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
                    showOfferButton={fromDriver && !!permissions?.offerToDriver}
                    driverId={driverId}
                    canOffer={!!permissions?.offerToDriver}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div style={{
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
              </div>

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
        <div className="m-form-group">
          <label className="m-form-label">Qayerdan</label>
          <select
            className="m-form-select"
            value={filters.fromRegion}
            onChange={(e) => setFilters({ ...filters, fromRegion: e.target.value })}
          >
            <option value="">Viloyatni tanlang</option>
            {staticData?.regions?.map((region) => (
              <option key={region.regionId} value={region.regionId}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

        <div className="m-form-group">
          <label className="m-form-label">Qayerga</label>
          <select
            className="m-form-select"
            value={filters.toRegion}
            onChange={(e) => setFilters({ ...filters, toRegion: e.target.value })}
          >
            <option value="">Viloyatni tanlang</option>
            {staticData?.regions?.map((region) => (
              <option key={region.regionId} value={region.regionId}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

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

      <ClubMembershipModal isOpen={showClubModal} onClose={() => setShowClubModal(false)} />
    </>
  );
}
