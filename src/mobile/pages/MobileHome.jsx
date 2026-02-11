/**
 * Mobile Home Page
 * Content-first cargo feed with collapsed filters
 * Supports driver context for offer functionality
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useStaticData } from '../../context/StaticDataContext';
import { searchCargos, getUserMe } from '../../services/api';
import { useMobileAuth } from '../context/MobileAuthContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import CargoListItem from '../components/CargoListItem';
import { ListSkeleton } from '../components/MobileLoading';
import PullToRefresh from '../components/PullToRefresh';
import Pagination from '../components/Pagination';

export default function MobileHome() {
  const location = useLocation();
  const { staticData } = useStaticData();
  const { isAuthenticated } = useMobileAuth();

  // Check for driver context - MUST use same keys as Desktop SearchPage.jsx
  // Desktop uses: { fromDriver: true, driverId, driverName, filters }
  const fromDriver = location.state?.fromDriver === true;
  const driverId = location.state?.driverId || null;
  const driverName = location.state?.driverName || null;
  const driverFilters = location.state?.filters || {};

  // Internal dispatcher check
  const [isInternalDispatcher, setIsInternalDispatcher] = useState(false);

  // Filter state - pre-fill from driver filters if available (matches Desktop SearchPage.jsx)
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

  // Load user data to check internal dispatcher status
  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated]);

  const loadUserData = async () => {
    try {
      const response = await getUserMe();
      if (response.code === 200 && response.result) {
        setIsInternalDispatcher(response.result.isInternalDispatcher === true);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  // Data state
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // UI state
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Build active filter chips - matches Desktop SearchPage.jsx pattern
  const buildActiveFilters = useCallback((filterObj) => {
    const chips = [];
    // From location chips
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
    // To location chips
    if (filterObj.toCountry) {
      const country = staticData?.countries?.find((c) => String(c.countryId) === filterObj.toCountry);
      chips.push({ key: 'toCountry', label: `→ ${country?.name || filterObj.toCountry}` });
    }
    if (filterObj.toRegion) {
      const region = staticData?.regions?.find((r) => String(r.regionId) === filterObj.toRegion || r.code === filterObj.toRegion);
      chips.push({ key: 'toRegion', label: `→ ${region?.name || filterObj.toRegion}` });
    }
    if (filterObj.toCity) {
      const city = staticData?.cities?.find((c) => String(c.cityId) === filterObj.toCity);
      chips.push({ key: 'toCity', label: `→ ${city?.name || filterObj.toCity}` });
    }
    // Vehicle type
    if (filterObj.vehicleType) {
      const vehicle = staticData?.vehicleTypes?.find((v) => v.code === filterObj.vehicleType || v.name === filterObj.vehicleType);
      chips.push({ key: 'vehicleType', label: vehicle?.name || filterObj.vehicleType });
    }
    // Weight range
    if (filterObj.minWeight || filterObj.maxWeight) {
      const min = filterObj.minWeight || '0';
      const max = filterObj.maxWeight || '∞';
      chips.push({ key: 'weight', label: `${min}-${max}t` });
    }
    return chips;
  }, [staticData]);

  // Load cargos
  const loadCargos = useCallback(async (pageNum = 0, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }
      setLoading(true);

      // MUST match Desktop SearchPage.jsx searchCargos call EXACTLY
      const response = await searchCargos({
        fromCountry: filters.fromCountry || undefined,
        fromRegion: filters.fromRegion || undefined,
        fromCity: filters.fromCity || undefined,
        toCountry: filters.toCountry || undefined,
        toRegion: filters.toRegion || undefined,
        toCity: filters.toCity || undefined,
        vehicleType: filters.vehicleType || undefined,
        minWeight: filters.minWeight || undefined,
        maxWeight: filters.maxWeight || undefined,
        page: pageNum,
      });

      if (response.code === 200) {
        const newCargos = response.result || [];
        setCargos(newCargos);
        // Calculate total pages (assuming 20 items per page)
        // If we get full page, assume there's at least one more
        const hasNextPage = newCargos.length >= 20;
        if (hasNextPage && pageNum >= totalPages - 1) {
          setTotalPages(pageNum + 2);
        } else if (!hasNextPage && newCargos.length > 0) {
          setTotalPages(pageNum + 1);
        } else if (newCargos.length === 0 && pageNum === 0) {
          setTotalPages(1);
        }
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to load cargos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, totalPages]);

  // Initial load
  useEffect(() => {
    loadCargos(0);
  }, []);

  // Handle filter apply
  const handleApplyFilters = () => {
    setActiveFilters(buildActiveFilters(filters));
    setFilterSheetOpen(false);
    setTotalPages(1);
    loadCargos(0);
  };

  // Handle filter reset - includes all filter keys (matches Desktop)
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
  };

  // Remove single filter - matches Desktop cascade pattern
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
    setTotalPages(1);
    loadCargos(0);
  };

  // Page change handler
  const handlePageChange = useCallback((newPage) => {
    if (!loading && !refreshing) {
      loadCargos(newPage);
    }
  }, [loading, refreshing, loadCargos]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setTotalPages(1);
    await loadCargos(0, true);
  }, [loadCargos]);

  return (
    <>
      <TopBar
        title="YukBor"
        rightIcon="🔍"
        onRightAction={() => setFilterSheetOpen(true)}
      />

      <main className="m-content">
        <PullToRefresh onRefresh={handleRefresh} disabled={loading && page === 0}>
          {/* Active filter chips */}
          {activeFilters.length > 0 && (
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

          {/* Driver context banner - matches Desktop pattern */}
          {fromDriver && driverName && (
            <div style={{ padding: '12px 16px', background: '#d1ecf1', marginBottom: 0, fontSize: 14, color: '#0c5460' }}>
              <strong>👤 {driverName}</strong> uchun yuk qidirilmoqda
            </div>
          )}

          {/* Cargo list */}
          {loading && page === 0 ? (
            <ListSkeleton count={6} />
          ) : cargos.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-icon">📦</div>
              <h3 className="m-empty-title">Yuklar topilmadi</h3>
              <p className="m-empty-text">
                Filterlarni o'zgartiring yoki keyinroq qaytib keling
              </p>
              <button className="m-btn m-btn-primary" onClick={() => setFilterSheetOpen(true)}>
                Filterlar
              </button>
            </div>
          ) : (
            <>
              <div className="m-card m-card-list">
                {cargos.map((cargo, index) => (
                  <CargoListItem
                    key={cargo.id || cargo._id || index}
                    cargo={cargo}
                    showOfferButton={fromDriver && isInternalDispatcher}
                    driverId={driverId}
                    isInternalDispatcher={isInternalDispatcher}
                  />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                loading={loading}
              />
            </>
          )}
        </PullToRefresh>
      </main>

      {/* Filter Bottom Sheet */}
      <BottomSheet
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Filterlar"
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
          <label className="m-form-label">Vazn oralig'i (tonna)</label>
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
    </>
  );
}
