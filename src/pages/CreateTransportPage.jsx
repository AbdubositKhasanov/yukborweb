import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTransport, getLocationsAndVehicles } from '../services/api';
import { showSuccess, showError } from '../utils/toast';

export default function CreateTransportPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [staticData, setStaticData] = useState(null);

  const [fromCountry, setFromCountry] = useState('');
  const [fromRegion, setFromRegion] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [additionalPhone, setAdditionalPhone] = useState('');
  const [otherDesc, setOtherDesc] = useState('');

  useEffect(() => {
    loadStaticData();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const transportData = {
        fromLocation: {
          cityId: fromCity ? parseInt(fromCity) : null,
          regionId: fromRegion ? parseInt(fromRegion) : null,
          countryId: fromCountry ? parseInt(fromCountry) : null,
        },
        maxWeight: maxWeight ? parseFloat(maxWeight) : null,
        vehicleTypeId: vehicleTypeId ? parseInt(vehicleTypeId) : null,
        additionalPhone: additionalPhone || null,
        otherDesc: otherDesc || null,
      };

      const response = await createTransport(transportData);
      if (response.code === 200) {
        setSuccess(true);
        showSuccess('Transport muvaffaqiyatli yaratildi!');
        
        // Navigate to My Transports page
        setTimeout(() => {
          navigate('/my-transports');
        }, 1000);
      } else {
        setError(response.message || 'Transport yaratishda xatolik');
        showError(response.message || 'Transport yaratishda xatolik');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
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
        marginBottom: '20px'
      }}>
        <h1 className="page-title" style={{ margin: 0 }}>Transport yaratish</h1>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/my-transports')}
          style={{ minWidth: '100px' }}
        >
          ← Ortga
        </button>
      </div>

      <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
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

          <div className="form-group">
            <label className="form-label">Max og'irligi (t)</label>
            <input
              type="number"
              className="form-input"
              value={maxWeight}
              onChange={(e) => setMaxWeight(e.target.value)}
              placeholder="Masalan: 5000"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Transport turi</label>
            <select
              className="form-select"
              value={vehicleTypeId}
              onChange={(e) => setVehicleTypeId(e.target.value)}
            >
              <option value="">Transport turini tanlang</option>
              {staticData?.vehicleTypes.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Qo'shimcha telefon</label>
            <input
              type="tel"
              className="form-input"
              value={additionalPhone}
              onChange={(e) => setAdditionalPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Qo'shimcha ma'lumot</label>
            <textarea
              className="form-textarea"
              value={otherDesc}
              onChange={(e) => setOtherDesc(e.target.value)}
              placeholder="Transport haqida qo'shimcha ma'lumot"
            />
          </div>

          {error && <div className="form-error" style={{marginTop: '-10px', marginBottom: '15px'}}>{error}</div>}
          {success && <div className="success-message">Transport muvaffaqiyatli yaratildi!</div>}

          <div className="btn-group">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
