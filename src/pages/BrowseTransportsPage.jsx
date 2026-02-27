import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { searchTransports, getLocationsAndVehicles, getTransportDetails, offerForDriver } from '../services/api';
import { formatTimeAgo } from '../utils/formatTime';

export default function BrowseTransportsPage() {
  const location = useLocation();
  const orderData = location.state || {};
  const fromOrder = orderData.fromOrder || false;
  const orderId = orderData.orderId || null;
  const orderInfo = orderData.orderInfo || null;
  const initialFilters = orderData.filters || {};

  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [staticData, setStaticData] = useState(null);

  // Filter states
  const [fromCountry, setFromCountry] = useState(initialFilters.fromCountry?.toString() || '');
  const [fromRegion, setFromRegion] = useState(initialFilters.fromRegion?.toString() || '');
  const [fromCity, setFromCity] = useState(initialFilters.fromCity?.toString() || '');
  const [vehicleType, setVehicleType] = useState(initialFilters.vehicleType || '');
  const [maxWeight, setMaxWeight] = useState('');

  useEffect(() => {
    loadStaticData();
    if (fromOrder) {
      // Auto-search when coming from order
      loadTransports();
    }
  }, []);

  useEffect(() => {
    if (!fromOrder) {
      loadTransports();
    }
  }, [page]);

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

      const response = await searchTransports(filters);
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
  }, [fromCountry, fromRegion, fromCity, vehicleType, maxWeight, page]);

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

      {/* Search Filters */}
      <div className="search-filters">
        <h3 className="filters-title">Filterlar</h3>
        <form onSubmit={handleSearch}>
          {/* From Location */}
          <div className="form-group">
            <label className="form-label">Qayerdan</label>
            <div className="form-row">
              <select
                className="form-select"
                value={fromCountry}
                onChange={(e) => {
                  setFromCountry(e.target.value);
                  setFromRegion('');
                  setFromCity('');
                }}
              >
                <option value="">Davlat</option>
                {staticData?.countries.map(country => (
                  <option key={country.countryId} value={country.countryId}>
                    {country.name}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                value={fromRegion}
                onChange={(e) => {
                  setFromRegion(e.target.value);
                  setFromCity('');
                }}
                disabled={!fromCountry}
              >
                <option value="">Viloyat</option>
                {filteredFromRegions.map(region => (
                  <option key={region.regionId} value={region.regionId}>
                    {region.name}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                disabled={!fromRegion}
              >
                <option value="">Shahar</option>
                {filteredFromCities.map(city => (
                  <option key={city.cityId} value={city.cityId}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
        <div className="empty-state">Hech qanday transport topilmadi</div>
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
    </div>
  );
}

function TransportCard({ transport, showOfferButton = false, orderId = null, orderInfo = null }) {
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [offerError, setOfferError] = useState(null);

  const handleShowDetails = async () => {
    if (showDetails) {
      setShowDetails(false);
      return;
    }

    setLoading(true);
    try {
      const response = await getTransportDetails(transport.id);
      if (response.code === 200) {
        setDetails(response.result);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Failed to load transport details:', error);
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
        
        <button
          className="btn btn-primary"
          onClick={handleShowDetails}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Yuklanmoqda...' : showDetails ? 'Yopish' : 'Batafsil ko\'rish'}
        </button>
      </div>
    </div>
  );
}