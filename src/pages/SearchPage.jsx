import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { searchCargos, offerForDriver, getUserMe } from '../services/api';
import { useStaticData } from '../context/StaticDataContext';
import CargoCard from '../components/CargoCard';

export default function SearchPage() {
  const location = useLocation();
  const driverData = location.state || {};
  const fromDriver = driverData.fromDriver || false;
  const driverId = driverData.driverId || null;
  const driverName = driverData.driverName || null;
  const initialFilters = driverData.filters || {};

  const { staticData, loading: staticLoading } = useStaticData();
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [isInternalDispatcher, setIsInternalDispatcher] = useState(false);

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
        setIsInternalDispatcher(response.result.isInternalDispatcher === true);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  useEffect(() => {
    if (fromDriver) {
      // Auto-search when coming from driver
      loadCargos();
    } else {
      loadCargos();
    }
  }, [page]);

  const loadCargos = async () => {
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

      const response = await searchCargos(filters);
      if (response.code === 200) {
        setCargos(response.result);
      } else {
        setError(response.message || 'Yuklar topilmadi');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
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
      <h1 className="page-title">Yuklar qidirish</h1>

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
            Filter'lar haydovchi ma'lumotlariga asosan to'ldirildi. O'zgartirishingiz mumkin.
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

          {/* To Location */}
          <div className="form-group">
            <label className="form-label">Qayerga</label>
            <div className="form-row">
              <select
                className="form-select"
                value={toCountry}
                onChange={(e) => {
                  setToCountry(e.target.value);
                  setToRegion('');
                  setToCity('');
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
                value={toRegion}
                onChange={(e) => {
                  setToRegion(e.target.value);
                  setToCity('');
                }}
                disabled={!toCountry}
              >
                <option value="">Viloyat</option>
                {filteredToRegions.map(region => (
                  <option key={region.regionId} value={region.regionId}>
                    {region.name}
                  </option>
                ))}
              </select>

              <select
                className="form-select"
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                disabled={!toRegion}
              >
                <option value="">Shahar</option>
                {filteredToCities.map(city => (
                  <option key={city.cityId} value={city.cityId}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
        <div className="empty-state">Hech qanday yuk topilmadi</div>
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
                isInternalDispatcher={isInternalDispatcher}
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
