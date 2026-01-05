import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createHarbinger } from '../services/api';
import { useStaticData } from '../context/StaticDataContext';
import LocationSelector from '../components/LocationSelector';

export default function CreateHarbingerPage() {
  const navigate = useNavigate();
  const { staticData, loading: staticLoading } = useStaticData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [fromCountry, setFromCountry] = useState('');
  const [fromRegion, setFromRegion] = useState('');
  const [fromCity, setFromCity] = useState('');
  
  const [toCountry, setToCountry] = useState('');
  const [toRegion, setToRegion] = useState('');
  const [toCity, setToCity] = useState('');
  
  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const harbingerData = {
        fromLocation: {
          cityId: fromCity ? parseInt(fromCity) : null,
          regionId: fromRegion ? parseInt(fromRegion) : null,
          countryId: fromCountry ? parseInt(fromCountry) : null,
        },
        toLocation: {
          cityId: toCity ? parseInt(toCity) : null,
          regionId: toRegion ? parseInt(toRegion) : null,
          countryId: toCountry ? parseInt(toCountry) : null,
        },
        minWeight: minWeight ? parseFloat(minWeight) : null,
        maxWeight: maxWeight ? parseFloat(maxWeight) : null,
        vehicleTypeId: vehicleTypeId ? parseInt(vehicleTypeId) : null,
      };

      const response = await createHarbinger(harbingerData);
      if (response.code === 200) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/my-harbingers');
        }, 1500);
      } else {
        setError(response.message || 'Harbinger yaratishda xatolik');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  if (staticLoading) {
    return (
      <div className="container">
        <div className="loading">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">Harbinger yaratish</h1>

      <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <p style={{ 
          marginBottom: '25px', 
          color: '#666',
          lineHeight: '1.6',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px'
        }}>
          💡 Harbinger - bu yuk qidiruv xabarnomasi. Siz qidirayotgan yuk turini 
          belgilasangiz, mos yuklar paydo bo'lganda sizga xabar beramiz.
        </p>

        <form onSubmit={handleSubmit}>
          <LocationSelector
            label="Qayerdan"
            countryValue={fromCountry}
            regionValue={fromRegion}
            cityValue={fromCity}
            onCountryChange={setFromCountry}
            onRegionChange={setFromRegion}
            onCityChange={setFromCity}
            required
          />

          <LocationSelector
            label="Qayerga"
            countryValue={toCountry}
            regionValue={toRegion}
            cityValue={toCity}
            onCountryChange={setToCountry}
            onRegionChange={setToRegion}
            onCityChange={setToCity}
            required
          />

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Minimal og'irligi (t)
              </label>
              <input
                type="number"
                className="form-input"
                value={minWeight}
                onChange={(e) => setMinWeight(e.target.value)}
                placeholder="Masalan: 100"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Maksimal og'irligi (t)
              </label>
              <input
                type="number"
                className="form-input"
                value={maxWeight}
                onChange={(e) => setMaxWeight(e.target.value)}
                placeholder="Masalan: 1000"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Transport turi
            </label>
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

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">Harbinger muvaffaqiyatli yaratildi!</div>}

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
