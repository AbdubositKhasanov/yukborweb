import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { searchPlatformCargos, offerForDriver, getUserMe } from '../services/api';
import { useStaticData } from '../context/StaticDataContext';
import CargoCard from '../components/CargoCard';
import LocationSelector from '../components/LocationSelector';

export default function PlatformLoadsPage() {
  const location = useLocation();
  const driverData = location.state || {};
  const fromDriver = driverData.fromDriver || false;
  const driverId = driverData.driverId || null;
  const driverName = driverData.driverName || null;
  const initialFilters = driverData.filters || {};

  const { staticData, loading: staticLoading } = useStaticData();
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [permissions, setPermissions] = useState(null);

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

  useEffect(() => {
    loadUserData();
  }, []);

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

  useEffect(() => {
    if (staticData) {
      loadCargos();
    }
  }, [staticData]);

  useEffect(() => {
    if (page > 0) {
      loadCargos();
    }
  }, [page]);

  const loadCargos = useCallback(async () => {
    setLoading(true);
    setError(null);

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
        page
      };

      const response = await searchPlatformCargos(filters);
      if (response.code === 200) {
        setCargos(response.result);
      } else {
        setError(response.message || 'Yuklar topilmadi');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromCountry, fromRegion, fromCity, toCountry, toRegion, toCity, vehicleType, minWeight, maxWeight, page]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCargos();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    loadCargos();
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
    setPage(0);
    loadCargos();
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
        <h1 className="page-title" style={{ margin: 0 }}>Platforma yuklari</h1>
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

      <div style={{
        padding: '12px 15px',
        backgroundColor: '#e8f4fd',
        border: '1px solid #b8daff',
        borderRadius: '8px',
        marginBottom: '20px',
        color: '#004085',
        fontSize: '14px'
      }}>
        Bu yerda faqat platforma orqali qo'shilgan yuklar ko'rsatiladi.
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
              <label className="form-label">Min og'irligi (t)</label>
              <input
                type="number"
                className="form-input"
                value={minWeight}
                onChange={(e) => setMinWeight(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max og'irligi (t)</label>
              <input
                type="number"
                className="form-input"
                value={maxWeight}
                onChange={(e) => setMaxWeight(e.target.value)}
                placeholder="10000"
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

      {!loading && !error && cargos.length === 0 && (
        <div className="empty-state">Hech qanday platforma yuki topilmadi</div>
      )}

      {!loading && !error && cargos.length > 0 && (
        <>
          <div className="grid">
            {cargos.map(cargo => (
              <CargoCard
                key={cargo.id}
                cargo={cargo}
                showOfferButton={fromDriver}
                driverId={driverId}
                canOffer={!!permissions?.offerToDriver}
                showOfferToDriverButton={!!permissions?.offerToDriver && !fromDriver}
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
              disabled={cargos.length === 0}
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
