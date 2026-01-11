import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, getLocationsAndVehicles } from '../services/api';
import { showSuccess, showError } from '../utils/toast';
import LocationSelector from '../components/LocationSelector';

export default function CreateOrderPage() {
  const navigate = useNavigate();

  // Form state
  const [cargoName, setCargoName] = useState('');
  const [additionalPhone, setAdditionalPhone] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');

  // From location
  const [fromCountry, setFromCountry] = useState('');
  const [fromRegion, setFromRegion] = useState('');
  const [fromCity, setFromCity] = useState('');

  // To location
  const [toCountry, setToCountry] = useState('');
  const [toRegion, setToRegion] = useState('');
  const [toCity, setToCity] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [staticData, setStaticData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadStaticData();
  }, []);

  const loadStaticData = async () => {
    setLoadingData(true);
    try {
      const response = await getLocationsAndVehicles();
      if (response.code === 200) {
        setStaticData(response.result);
      }
    } catch (error) {
      console.error('Failed to load static data:', error);
      showError('Ma\'lumotlarni yuklab bo\'lmadi');
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!cargoName.trim()) {
      newErrors.cargoName = 'Yuk nomini kiriting';
    }

    if (!fromCountry || !fromRegion || !fromCity) {
      newErrors.fromLocation = 'Qayerdan joylashuvini to\'liq tanlang';
    }

    if (!toCountry || !toRegion || !toCity) {
      newErrors.toLocation = 'Qayerga joylashuvini to\'liq tanlang';
    }

    if (!weight || parseFloat(weight) <= 0) {
      newErrors.weight = 'To\'g\'ri og\'irlikni kiriting';
    }

    if (!vehicleTypeId) {
      newErrors.vehicleTypeId = 'Transport turini tanlang';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      showError('Iltimos, barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        cargoName: cargoName.trim(),
        additionalPhone: additionalPhone.trim() || null,
        description: description.trim() || null,
        fromLocation: {
          cityId: parseInt(fromCity),
          regionId: parseInt(fromRegion),
          countryId: parseInt(fromCountry),
        },
        toLocation: {
          cityId: parseInt(toCity),
          regionId: parseInt(toRegion),
          countryId: parseInt(toCountry),
        },
        weight: parseFloat(weight),
        vehicleTypeId: parseInt(vehicleTypeId),
      };

      const response = await createOrder(orderData);

      if (response.code === 200) {
        showSuccess('Buyurtma muvaffaqiyatli yaratildi!');

        // Navigate to My Orders page
        setTimeout(() => {
          navigate('/my-orders');
        }, 1000);
      } else {
        showError(response.message || 'Buyurtma yaratishda xatolik');
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      showError(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/my-orders');
  };

  if (loadingData) {
    return (
      <div className="container">
        <div className="loading">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h1 className="page-title" style={{ margin: 0 }}>Yangi buyurtma yaratish</h1>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleCancel}
          style={{ minWidth: '100px' }}
        >
          ← Ortga
        </button>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          {/* Yuk nomi */}
          <div className="form-group">
            <label className="form-label">
              Yuk nomi <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.cargoName ? 'error' : ''}`}
              value={cargoName}
              onChange={(e) => setCargoName(e.target.value)}
              placeholder="Masalan: Meva, Mebel, Qurilish materiallari"
              required
            />
            {errors.cargoName && (
              <span className="form-error">{errors.cargoName}</span>
            )}
          </div>

          {/* Qo'shimcha telefon */}
          <div className="form-group">
            <label className="form-label">Qo'shimcha telefon</label>
            <input
              type="tel"
              className="form-input"
              value={additionalPhone}
              onChange={(e) => setAdditionalPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
            />
            <span className="form-helper">
              Yukingiz bo'yicha bog'lanish uchun
            </span>
          </div>

          {/* Qayerdan */}
          <LocationSelector
            label="Qayerdan"
            countryValue={fromCountry}
            regionValue={fromRegion}
            cityValue={fromCity}
            onCountryChange={setFromCountry}
            onRegionChange={setFromRegion}
            onCityChange={setFromCity}
            required={true}
          />
          {errors.fromLocation && (
            <div className="form-error" style={{ marginTop: '-10px', marginBottom: '15px' }}>
              {errors.fromLocation}
            </div>
          )}

          {/* Qayerga */}
          <LocationSelector
            label="Qayerga"
            countryValue={toCountry}
            regionValue={toRegion}
            cityValue={toCity}
            onCountryChange={setToCountry}
            onRegionChange={setToRegion}
            onCityChange={setToCity}
            required={true}
          />
          {errors.toLocation && (
            <div className="form-error" style={{ marginTop: '-10px', marginBottom: '15px' }}>
              {errors.toLocation}
            </div>
          )}

          {/* Og'irlik */}
          <div className="form-group">
            <label className="form-label">
              Og'irligi (tonna) <span className="required">*</span>
            </label>
            <input
              type="number"
              className={`form-input ${errors.weight ? 'error' : ''}`}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Masalan: 5"
              step="0.1"
              min="0.1"
              required
            />
            {errors.weight && (
              <span className="form-error">{errors.weight}</span>
            )}

          </div>

          {/* Transport turi */}
          <div className="form-group">
            <label className="form-label">
              Transport turi <span className="required">*</span>
            </label>
            <select
              className={`form-select ${errors.vehicleTypeId ? 'error' : ''}`}
              value={vehicleTypeId}
              onChange={(e) => setVehicleTypeId(e.target.value)}
              required
            >
              <option value="">Transport turini tanlang</option>
              {staticData?.vehicleTypes?.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
            {errors.vehicleTypeId && (
              <span className="form-error">{errors.vehicleTypeId}</span>
            )}
          </div>

          {/* Izoh / Tavsif */}
          <div className="form-group">
            <label className="form-label">Izoh / Tavsif</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qo'shimcha ma'lumot, maxsus talablar..."
              rows={4}
            />
            <span className="form-helper">
              Yukingiz haqida qo'shimcha ma'lumot kiriting
            </span>
          </div>

          {/* Tugmalar */}
          <div className="btn-group" style={{ marginTop: '30px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Yaratilmoqda...' : '✓ Buyurtma yaratish'}
            </button>
          </div>
        </form>
      </div>

      {/* Info Card */}
      <div className="card" style={{
        maxWidth: '800px',
        margin: '20px auto 0',
        backgroundColor: '#f8f9fa'
      }}>
        <h4 style={{ marginBottom: '15px', color: 'var(--brand-color)' }}>
          💡 Ma'lumot
        </h4>
        <ul style={{
          color: '#666',
          lineHeight: '1.8',
          fontSize: '14px',
          paddingLeft: '20px'
        }}>
          <li>Barcha majburiy maydonlarni to'ldiring (*)</li>
          <li>Qo'shimcha telefon raqamingizni kiritish tavsiya etiladi</li>
          <li>Og'irlikni tonna da kiriting (1000 kg = 1 tonna)</li>
          <li>Yaratilgan buyurtmani "Buyurtmalarim" bo'limida ko'rishingiz mumkin</li>
          <li>Buyurtma asosida qulay transportni topishingiz mumkin</li>
        </ul>
      </div>
    </div>
  );
}
