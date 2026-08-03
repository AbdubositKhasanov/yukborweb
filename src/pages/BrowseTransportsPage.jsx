import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { searchTransports, searchInternalTransports, getLocationsAndVehicles, getTransportDetails, getUserMe, offerForDriver } from '../services/api';
import { formatTimeAgo } from '../utils/formatTime';
import { openPremiumUpgrade } from '../utils/premiumUpgrade';
import { showError } from '../utils/toast';
import LocationSelector from '../components/LocationSelector';
import ReminderComposer from '../components/ReminderComposer';
import InternalTransportEditModal from '../components/InternalTransportEditModal';

const PHONE_UPGRADE_MESSAGE = 'Transport telefon raqamini ko\'rish uchun faol tarif kerak yoki bepul limitingiz tugagan.';

export default function BrowseTransportsPage() {
  const location = useLocation();
  const orderData = location.state || {};
  const fromOrder = orderData.fromOrder || false;
  const fromNeedProfile = orderData.fromNeedProfile || false;
  const orderId = orderData.orderId || null;
  const orderInfo = orderData.orderInfo || null;
  const needInfo = orderData.needInfo || null;
  const initialFilters = orderData.filters || {};

  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [staticData, setStaticData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userAccessLoading, setUserAccessLoading] = useState(Boolean(localStorage.getItem('authToken')));
  const [reminderSubject, setReminderSubject] = useState(null);

  // Filter states
  const [fromCountry, setFromCountry] = useState(initialFilters.fromCountry?.toString() || '');
  const [fromRegion, setFromRegion] = useState(initialFilters.fromRegion?.toString() || '');
  const [fromCity, setFromCity] = useState(initialFilters.fromCity?.toString() || '');
  const [vehicleType, setVehicleType] = useState(initialFilters.vehicleType || '');
  const [maxWeight, setMaxWeight] = useState(initialFilters.maxWeight?.toString() || '');

  useEffect(() => {
    loadStaticData();
    loadCurrentUser();
    if (fromOrder) {
      // Auto-search when coming from order
      loadTransports();
    }
  }, []);

  const loadCurrentUser = async () => {
    if (!localStorage.getItem('authToken')) {
      setUserAccessLoading(false);
      return;
    }
    try {
      const response = await getUserMe();
      if (response.code === 200) setCurrentUser(response.result || null);
    } catch (error) {
      console.error('Failed to load current user:', error);
    } finally {
      setUserAccessLoading(false);
    }
  };

  useEffect(() => {
    if (!fromOrder) {
      loadTransports();
    }
  }, [page]);

  useEffect(() => {
    if (currentUser?.isInternalDispatcher === true || currentUser?.isAdmin === true) {
      loadTransports();
    }
  }, [currentUser?.isInternalDispatcher, currentUser?.isAdmin]);

  const loadStaticData = async () => {
    try {
      const response = await getLocationsAndVehicles();
      if (response.code === 200) {
        setStaticData(response.result);
      }
    } catch (error) {
      console.error('Failed to load static data:', error);
    }
  };

  const loadTransports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = {
        fromCountry: fromCountry || undefined,
        fromRegion: fromRegion || undefined,
        fromCity: fromCity || undefined,
        vehicleType: vehicleType || undefined,
        maxWeight: maxWeight || undefined,
        page
      };

      const canManageTransports = currentUser?.isInternalDispatcher === true || currentUser?.isAdmin === true;
      const response = canManageTransports
        ? await searchInternalTransports(filters)
        : await searchTransports(filters);
      if (response.code === 200) {
        setTransports(response.result);
      } else {
        setError(response.message || 'Transportlar topilmadi');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromCountry, fromRegion, fromCity, vehicleType, maxWeight, page, currentUser]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTransports();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    loadTransports();
  };

  const handleReset = () => {
    setFromCountry('');
    setFromRegion('');
    setFromCity('');
    setVehicleType('');
    setMaxWeight('');
    setPage(0);
  };

  const handleTransportUpdated = (updated) => {
    if (!updated?.id) return;
    setTransports((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
  };

  const filteredFromRegions = staticData?.regions.filter(
    r => r.countryId === parseInt(fromCountry)
  ) || [];
  
  const filteredFromCities = staticData?.cities.filter(
    c => c.regionId === parseInt(fromRegion)
  ) || [];

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
        <h1 className="page-title" style={{ margin: 0 }}>Transport qidirish</h1>
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

      {fromOrder && orderInfo && (
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
              🚚 Yukingiz uchun mos haydovchilar qidirilmoqda
            </strong>
          </div>
          <div style={{ 
            fontSize: '14px', 
            padding: '10px', 
            backgroundColor: 'rgba(255,255,255,0.5)', 
            borderRadius: '4px',
            marginTop: '8px'
          }}>
            <p style={{ margin: '4px 0' }}>
              <strong>Yuk:</strong> {orderInfo.cargoName || 'Nomi yo\'q'}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Marshrut:</strong> {orderInfo.fromCity} → {orderInfo.toCity}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Og'irlik:</strong> {orderInfo.weightKg} t
            </p>
            {orderInfo.vehicleType && (
              <p style={{ margin: '4px 0' }}>
                <strong>Transport turi:</strong> {orderInfo.vehicleType}
              </p>
            )}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '13px', fontStyle: 'italic' }}>
            Filter'lar yukingiz ma'lumotlariga asosan to'ldirildi. O'zgartirishingiz mumkin.
          </p>
        </div>
      )}

      {fromNeedProfile && needInfo && (
        <div style={{
          padding: '15px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#14532d'
        }}>
          <strong style={{ fontSize: '16px' }}>
            Yukchi ehtiyoji bo'yicha mashina qidirilmoqda
          </strong>
          <div style={{
            fontSize: '14px',
            padding: '10px',
            backgroundColor: 'rgba(255,255,255,0.65)',
            borderRadius: '4px',
            marginTop: '8px'
          }}>
            <p style={{ margin: '4px 0' }}>
              <strong>Profil:</strong> {needInfo.title || 'Yukchi ehtiyoji'}
            </p>
            <p style={{ margin: '4px 0' }}>
              <strong>Kunlik reja:</strong> {needInfo.cargoCountPerDay || 1} ta yuk
            </p>
            {needInfo.vehicleType && (
              <p style={{ margin: '4px 0' }}>
                <strong>Mashina:</strong> {needInfo.vehicleType}
              </p>
            )}
            {needInfo.maxWeight && (
              <p style={{ margin: '4px 0' }}>
                <strong>Sig'im:</strong> {needInfo.maxWeight} t
              </p>
            )}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '13px', fontStyle: 'italic' }}>
            Filterlar yukchi ehtiyojidan to'ldirildi. Kerak bo'lsa o'zgartiring.
          </p>
        </div>
      )}

      {/* Search Filters */}
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

          {/* Vehicle Type and Max Weight */}
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
              <label className="form-label">Max og'irligi (t)</label>
              <input
                type="number"
                className="form-input"
                value={maxWeight}
                onChange={(e) => setMaxWeight(e.target.value)}
                placeholder="10"
                step="0.1"
              />
            </div>
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

      {/* Results */}
      {loading && <div className="loading">Yuklanmoqda...</div>}
      
      {error && <div className="error-message">{error}</div>}
      
      {!loading && !error && transports.length === 0 && (
        <div className="empty-state">
          {vehicleType
            ? `"${vehicleType}" turi bo\u2019yicha transport topilmadi. Boshqa turni tanlang yoki filterni tozalang.`
            : 'Hech qanday transport topilmadi'}
        </div>
      )}
      
      {!loading && !error && transports.length > 0 && (
        <>
          <div className="grid">
            {transports.map(transport => (
              <TransportCard 
                key={transport.id} 
                transport={transport}
                showOfferButton={fromOrder}
                orderId={orderId}
                orderInfo={orderInfo}
                currentUser={currentUser}
                userAccessLoading={userAccessLoading}
                canEdit={currentUser?.isInternalDispatcher === true || currentUser?.isAdmin === true}
                isAdmin={currentUser?.isAdmin === true}
                staticData={staticData}
                onUpdated={handleTransportUpdated}
                onReminder={(currentUser?.isInternalDispatcher === true || currentUser?.isAdmin === true)
                  ? (item) => setReminderSubject({
                    type: 'driver',
                    id: String(item.chatId || item.userObjectId || item.id),
                    name: item.ownerName || item.name || item.stateNumber || item.vehicleType || 'Haydovchi',
                  })
                  : null}
              />
            ))}
          </div>

          <div className="pagination">
            <button
              className="pagination-button"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
            >
              <span>←</span>
              <span>Oldingi</span>
            </button>
            <span className="pagination-info">Sahifa {page + 1}</span>
            <button
              className="pagination-button"
              onClick={() => setPage(p => p + 1)}
              disabled={transports.length === 0}
            >
              <span>Keyingi</span>
              <span>→</span>
            </button>
          </div>
        </>
      )}
      <ReminderComposer
        open={Boolean(reminderSubject)}
        subject={reminderSubject}
        onClose={() => setReminderSubject(null)}
      />
    </div>
  );
}

function TransportCard({ transport, showOfferButton = false, orderId = null, orderInfo = null, currentUser = null, userAccessLoading = false, onReminder = null, canEdit = false, isAdmin = false, staticData = null, onUpdated = null }) {
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [offerError, setOfferError] = useState(null);
  const [detailsNotice, setDetailsNotice] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const displayedTransport = details || transport;

  const handleSaved = (updated) => {
    if (!updated) return;
    setDetails((current) => current ? { ...current, ...updated } : updated);
    onUpdated?.(updated);
  };

  const handleShowDetails = async () => {
    if (showDetails) {
      setShowDetails(false);
      return;
    }

    setLoading(true);
    setDetailsNotice('');
    try {
      const response = await getTransportDetails(transport.id);
      if (response.code === 200) {
        const result = response.result || {};
        const phone = result.additionalPhone || result.phone;
        const canViewPhone = currentUser?.permissions?.viewTransportPhone === true;

        if (!phone && !canViewPhone) {
          openPremiumUpgrade({
            featureKey: 'viewTransportPhone',
            message: PHONE_UPGRADE_MESSAGE,
            currentLimit: currentUser?.featureLimits?.viewTransportPhone,
            source: 'desktop-transport-card',
          });
          return;
        }

        setDetails(result);
        setDetailsNotice(phone ? '' : 'Bu haydovchi telefon raqamini kiritmagan.');
        setShowDetails(true);
      } else {
        showError(response.message || 'Transport ma\'lumotlari yuklanmadi');
      }
    } catch (error) {
      console.error('Failed to load transport details:', error);
      if (!error.response) showError('Transport ma\'lumotlari yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  const handleOffer = async () => {
    if (!orderId || !transport.chatId) {
      alert('Taklif yuborishda xatolik: Ma\'lumotlar yetarli emas');
      return;
    }

    // Get price from orderInfo, default to 0 if not available
    const priceUzs = orderInfo?.priceUzs || 0;
    
    if (priceUzs <= 0) {
      alert('Buyurtma narxi noto\'g\'ri');
      return;
    }

    if (!window.confirm('Ushbu haydovchiga taklif yubormoqchimisiz?')) {
      return;
    }

    setOffering(true);
    setOfferError(null);

    try {
      const response = await offerForDriver(transport.chatId, orderId, priceUzs);
      if (response.code === 200) {
        setOfferSuccess(true);
        setTimeout(() => setOfferSuccess(false), 3000);
      } else {
        setOfferError(response.message || 'Taklif yuborishda xatolik');
      }
    } catch (error) {
      setOfferError(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setOffering(false);
    }
  };

  return (
    <div className="card">
      <div style={{ marginBottom: '15px' }}>
        <h3 className="card-title">{transport.name || transport.loc1 || 'Transport'}</h3>
      </div>
      
      <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
        <p style={{ margin: '8px 0' }}>📍 Joylashuv: {transport.loc1 || 'Ko\'rsatilmagan'}</p>
        
        {transport.vehicleType && (
          <p style={{ margin: '8px 0' }}>🚚 Transport turi: {transport.vehicleType}</p>
        )}
        
        {transport.weight && (
          <p style={{ margin: '8px 0' }}>⚖️ Sig'im: {transport.weight}</p>
        )}

        {transport.stateNumber && transport.stateNumber.trim() ? (
          <p style={{ margin: '8px 0' }}>
            🚗 Davlat raqami: <strong>{transport.stateNumber}</strong>
          </p>
        ) : null}

        {showDetails && details && (details.additionalPhone || details.phone) && (
          <p style={{ margin: '12px 0', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px', fontWeight: 'bold' }}>
            📞 Telefon: {details.additionalPhone || details.phone}
          </p>
        )}

        {showDetails && detailsNotice && (
          <p style={{ margin: '12px 0', padding: '10px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '4px', color: '#9a3412' }}>
            ℹ️ {detailsNotice}
          </p>
        )}

        {offerSuccess && (
          <div style={{ margin: '12px 0', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px', color: '#155724' }}>
            ✓ Taklif muvaffaqiyatli yuborildi!
          </div>
        )}

        {offerError && (
          <div style={{ margin: '12px 0', padding: '10px', backgroundColor: '#f8d7da', borderRadius: '4px', color: '#721c24' }}>
            {offerError}
          </div>
        )}

        {transport.time && (
          <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#999' }}>
            {formatTimeAgo(transport.time)}
          </p>
        )}

        {isAdmin && displayedTransport.lastEditedAt && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#f3f0ff', color: '#4c1d95', fontSize: 12 }}>
            <strong>Oxirgi tahrir:</strong>{' '}
            {displayedTransport.lastEditedByName || displayedTransport.lastEditedByUsername || displayedTransport.lastEditedBy || 'Noma\'lum user'}
            {' · '}{formatTimeAgo(displayedTransport.lastEditedAt)}
          </div>
        )}
      </div>

      <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {showOfferButton && (
          <button
            className="btn btn-success"
            onClick={handleOffer}
            disabled={offering || offerSuccess}
            style={{ width: '100%' }}
          >
            {offering ? 'Yuborilmoqda...' : offerSuccess ? '✓ Yuborildi' : '📨 Taklif qilish'}
          </button>
        )}

        {onReminder && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onReminder(transport)}
            style={{ width: '100%', color: '#6942ae', background: '#f1ebfc', borderColor: '#dfd2f6' }}
          >
            ◷ Haydovchiga reminder
          </button>
        )}


        {canEdit && (
          <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(true)} style={{ width: '100%' }}>
            ✎ Tahrirlash
          </button>
        )}
        
        <button
          className="btn btn-primary"
          onClick={handleShowDetails}
          disabled={loading || userAccessLoading}
          style={{ width: '100%' }}
        >
          {userAccessLoading ? 'Ruxsat tekshirilmoqda...' : loading ? 'Yuklanmoqda...' : showDetails ? 'Yopish' : 'Batafsil ko\'rish'}
        </button>
      </div>
      <InternalTransportEditModal
        isOpen={showEditModal}
        transport={displayedTransport}
        staticData={staticData}
        onClose={() => setShowEditModal(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
