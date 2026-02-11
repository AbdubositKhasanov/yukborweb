/**
 * Mobile Transport Search Page
 * Content-first transport list with collapsed filters
 * Supports offer functionality when coming from order
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStaticData } from '../../context/StaticDataContext';
import { searchTransports, offerForDriver } from '../../services/api';
import { formatTimeAgo } from '../../utils/formatTime';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import MobileLoading, { ListSkeleton } from '../components/MobileLoading';

export default function MobileTransportSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { staticData } = useStaticData();

  // If coming from order, pre-fill filters
  const fromOrder = location.state?.order;

  // Filter state - matches Desktop BrowseTransportsPage.jsx
  const [filters, setFilters] = useState({
    fromCountry: fromOrder?.fromCountry?.toString() || '',
    fromRegion: fromOrder?.fromRegion?.toString() || '',
    fromCity: fromOrder?.fromCity?.toString() || '',
    vehicleType: fromOrder?.vehicleType || '',
    maxWeight: fromOrder?.weight?.toString() || '',
  });
  const [activeFilters, setActiveFilters] = useState([]);

  // Data state
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // UI state
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Offer state
  const [offerSheet, setOfferSheet] = useState({ open: false, transport: null });
  const [offering, setOffering] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [offerError, setOfferError] = useState('');

  // Handle offer to transport
  const handleOfferClick = (e, transport) => {
    e.stopPropagation();
    setOfferSheet({ open: true, transport });
    setOfferError('');
    setOfferSuccess(false);
  };

  const handleSendOffer = async () => {
    const transport = offerSheet.transport;
    if (!transport || !fromOrder) return;

    const orderId = fromOrder.id || fromOrder._id;
    const driverId = transport.chatId;
    const price = fromOrder.priceUzs || 0;

    if (!orderId || !driverId) {
      setOfferError('Ma\'lumotlar yetarli emas');
      return;
    }

    if (price <= 0) {
      setOfferError('Buyurtma narxi noto\'g\'ri');
      return;
    }

    try {
      setOffering(true);
      setOfferError('');
      const response = await offerForDriver(driverId, orderId, price);

      if (response.code === 200) {
        setOfferSuccess(true);
        setTimeout(() => {
          setOfferSheet({ open: false, transport: null });
          setOfferSuccess(false);
        }, 1500);
      } else {
        setOfferError(response.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      setOfferError('Xatolik yuz berdi');
    } finally {
      setOffering(false);
    }
  };

  // Build active filter chips - matches Desktop pattern
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
    if (filterObj.vehicleType) {
      const vehicle = staticData?.vehicleTypes?.find((v) => v.code === filterObj.vehicleType || v.name === filterObj.vehicleType);
      chips.push({ key: 'vehicleType', label: vehicle?.name || filterObj.vehicleType });
    }
    if (filterObj.maxWeight) {
      chips.push({ key: 'maxWeight', label: `${filterObj.maxWeight}t+` });
    }
    return chips;
  }, [staticData]);

  // Load transports
  const loadTransports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setPage(0);
      }
      setLoading(true);

      // MUST match Desktop BrowseTransportsPage.jsx searchTransports call EXACTLY
      const response = await searchTransports({
        fromCountry: filters.fromCountry || undefined,
        fromRegion: filters.fromRegion || undefined,
        fromCity: filters.fromCity || undefined,
        vehicleType: filters.vehicleType || undefined,
        maxWeight: filters.maxWeight || undefined,
        page: isRefresh ? 0 : page,
      });

      if (response.code === 200) {
        const newTransports = response.result || [];
        if (isRefresh || page === 0) {
          setTransports(newTransports);
        } else {
          setTransports((prev) => [...prev, ...newTransports]);
        }
        setHasMore(newTransports.length >= 20);
      }
    } catch (error) {
      console.error('Failed to load transports:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  // Initial load
  useEffect(() => {
    loadTransports(true);
    if (fromOrder) {
      setActiveFilters(buildActiveFilters(filters));
    }
  }, []);

  // Handle filter apply
  const handleApplyFilters = () => {
    setActiveFilters(buildActiveFilters(filters));
    setFilterSheetOpen(false);
    setPage(0);
    setTransports([]);
    loadTransports(true);
  };

  // Handle filter reset - matches Desktop
  const handleResetFilters = () => {
    setFilters({
      fromCountry: '',
      fromRegion: '',
      fromCity: '',
      vehicleType: '',
      maxWeight: '',
    });
    setActiveFilters([]);
  };

  // Remove single filter - matches Desktop pattern
  const handleRemoveFilter = (key) => {
    const newFilters = { ...filters };
    if (key === 'fromCountry') {
      // Clear cascade
      newFilters.fromCountry = '';
      newFilters.fromRegion = '';
      newFilters.fromCity = '';
    } else if (key === 'fromRegion') {
      newFilters.fromRegion = '';
      newFilters.fromCity = '';
    } else {
      newFilters[key] = '';
    }
    setFilters(newFilters);
    setActiveFilters(buildActiveFilters(newFilters));
    loadTransports(true);
  };

  const handleTransportClick = (transport) => {
    navigate(`/mobile/transport/${transport.id || transport._id}`, {
      state: { order: fromOrder }
    });
  };

  // Format transport display
  const formatLocation = (transport) => {
    return transport.fromCity || transport.fromRegion || 'Noma\'lum';
  };

  return (
    <>
      <TopBar
        title={fromOrder ? 'Transport topish' : 'Transportlar'}
        showBack={!!fromOrder}
        rightIcon="🔍"
        onRightAction={() => setFilterSheetOpen(true)}
      />

      <main className="m-content">
        {/* Order info if from order */}
        {fromOrder && (
          <div style={{ padding: '12px 16px', background: '#e3f2fd', fontSize: 14 }}>
            📦 {fromOrder.cargoName || fromOrder.cargo_name} uchun transport qidirish
          </div>
        )}

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

        {/* Transport list */}
        {loading && page === 0 ? (
          <ListSkeleton count={6} />
        ) : transports.length === 0 ? (
          <div className="m-empty">
            <div className="m-empty-icon">🚚</div>
            <h3 className="m-empty-title">Transportlar topilmadi</h3>
            <p className="m-empty-text">Filterlarni o'zgartiring</p>
            <button className="m-btn m-btn-primary" onClick={() => setFilterSheetOpen(true)}>
              Filterlar
            </button>
          </div>
        ) : (
          <div className="m-card m-card-list">
            {transports.map((transport, index) => (
              <div
                key={transport.id || transport._id || index}
                className="m-list-item m-card-tap"
                onClick={() => handleTransportClick(transport)}
              >
                <div className={`m-status-dot ${transport.isActive ? 'online' : 'offline'}`} />
                <div className="m-list-item-content">
                  <p className="m-list-item-title">
                    {transport.vehicleType || 'Transport'}
                    {transport.maxWeight && ` ${transport.maxWeight}t`}
                  </p>
                  <p className="m-list-item-subtitle">
                    📍 {formatLocation(transport)}
                  </p>
                  {transport.stateNumber && (
                    <div className="m-list-item-meta">
                      <span>🔢 {transport.stateNumber}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {fromOrder ? (
                    <button
                      className="m-btn m-btn-success"
                      onClick={(e) => handleOfferClick(e, transport)}
                      style={{ padding: '6px 12px', fontSize: 13, minHeight: 32 }}
                    >
                      📨 Taklif
                    </button>
                  ) : (
                    <>
                      <span style={{ fontSize: 13, color: 'var(--m-text-muted)' }}>
                        {formatTimeAgo(transport.createdAt || transport.created_at).split(' ')[0]}
                      </span>
                      <span className="m-list-item-arrow">→</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Offer Bottom Sheet */}
        <BottomSheet
          isOpen={offerSheet.open}
          onClose={() => {
            setOfferSheet({ open: false, transport: null });
            setOfferError('');
          }}
          title="📨 Haydovchiga taklif"
          footer={
            <button
              className="m-btn m-btn-success m-btn-full m-btn-lg"
              onClick={handleSendOffer}
              disabled={offering || offerSuccess}
            >
              {offering ? 'Yuborilmoqda...' : offerSuccess ? '✓ Yuborildi!' : 'Taklif yuborish'}
            </button>
          }
        >
          {offerSheet.transport && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ marginBottom: 16, padding: 12, background: 'var(--m-bg)', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {offerSheet.transport.vehicleType || 'Transport'}
                  {offerSheet.transport.maxWeight && ` ${offerSheet.transport.maxWeight}t`}
                </div>
                <div style={{ fontSize: 14, color: 'var(--m-text-secondary)' }}>
                  📍 {formatLocation(offerSheet.transport)}
                </div>
                {offerSheet.transport.stateNumber && (
                  <div style={{ fontSize: 14, color: 'var(--m-text-secondary)', marginTop: 4 }}>
                    🔢 {offerSheet.transport.stateNumber}
                  </div>
                )}
              </div>

              <div style={{ padding: 12, background: '#e3f2fd', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: '#1565c0' }}>
                  <strong>📦 Yuk:</strong> {fromOrder.cargoName || fromOrder.cargo_name}
                </div>
                <div style={{ fontSize: 14, color: '#1565c0', marginTop: 4 }}>
                  <strong>💰 Narx:</strong> {fromOrder.priceUzs?.toLocaleString()} so'm
                </div>
              </div>

              {offerError && (
                <div style={{ padding: 12, background: '#f8d7da', borderRadius: 8, color: '#721c24', marginBottom: 16 }}>
                  {offerError}
                </div>
              )}

              {offerSuccess && (
                <div style={{ padding: 12, background: '#d4edda', borderRadius: 8, color: '#155724', textAlign: 'center' }}>
                  ✓ Taklif muvaffaqiyatli yuborildi!
                </div>
              )}
            </div>
          )}
        </BottomSheet>

        {loading && page > 0 && <MobileLoading />}
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
          <label className="m-form-label">Joylashuv</label>
          <select
            className="m-form-select"
            value={filters.fromRegion}
            onChange={(e) => setFilters({ ...filters, fromRegion: e.target.value })}
          >
            <option value="">Barchasi</option>
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
          <label className="m-form-label">Minimal yuk sig'imi (tonna)</label>
          <input
            type="number"
            className="m-form-input"
            placeholder="0"
            value={filters.maxWeight}
            onChange={(e) => setFilters({ ...filters, maxWeight: e.target.value })}
            inputMode="decimal"
          />
        </div>
      </BottomSheet>
    </>
  );
}
