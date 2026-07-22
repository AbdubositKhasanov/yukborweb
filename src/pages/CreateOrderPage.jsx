import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder, getBroadcastStatus, getLocationsAndVehicles, updateOrderOwnerStatusPrompt } from '../services/api';
import { showSuccess, showError } from '../utils/toast';
import LocationSelector, { getManualLocationName, toOptionalLocationId } from '../components/LocationSelector';
import {
  formatBroadcastDeliveryCount,
  isBroadcastFinished,
  normalizeBroadcastStatus,
} from '../utils/orderText';

const buildRequestLocation = (countryValue, regionValue, cityValue) => ({
  cityId: toOptionalLocationId(cityValue),
  regionId: toOptionalLocationId(regionValue),
  countryId: toOptionalLocationId(countryValue),
  customName: getManualLocationName(regionValue, cityValue) || null,
});

const hasRequiredLocation = (countryValue, regionValue, cityValue) => {
  return Boolean(
    toOptionalLocationId(countryValue) &&
      (toOptionalLocationId(regionValue) || getManualLocationName(regionValue, cityValue))
  );
};

export default function CreateOrderPage() {
  const navigate = useNavigate();

  // Form state
  const [cargoName, setCargoName] = useState('');
  const [additionalPhone, setAdditionalPhone] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [priceUzs, setPriceUzs] = useState('');

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
  const [createdOrder, setCreatedOrder] = useState(null);
  const [broadcastStatus, setBroadcastStatus] = useState(null);
  const [ownerPromptAvailable, setOwnerPromptAvailable] = useState(false);
  const [ownerPromptSaving, setOwnerPromptSaving] = useState(false);
  const [ownerPromptChoice, setOwnerPromptChoice] = useState(null);
  const [ownerPromptError, setOwnerPromptError] = useState('');

  useEffect(() => {
    loadStaticData();
  }, []);

  useEffect(() => {
    const broadcastId = broadcastStatus?.broadcastId;
    if (!broadcastId || isBroadcastFinished(broadcastStatus)) return;

    let cancelled = false;
    const pollStatus = async () => {
      try {
        const response = await getBroadcastStatus(broadcastId);
        if (!cancelled) {
          setBroadcastStatus(normalizeBroadcastStatus(response));
        }
      } catch (_) {
        // Status polling order yaratish oqimini buzmasin.
      }
    };

    const interval = setInterval(pollStatus, 2500);
    pollStatus();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [broadcastStatus?.broadcastId, broadcastStatus?.status]);

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

    if (!hasRequiredLocation(fromCountry, fromRegion, fromCity)) {
      newErrors.fromLocation = 'Qayerdan joylashuvini tanlang yoki yozing';
    }

    if (!hasRequiredLocation(toCountry, toRegion, toCity)) {
      newErrors.toLocation = 'Qayerga joylashuvini tanlang yoki yozing';
    }

    if (!weight || parseFloat(weight) <= 0) {
      newErrors.weight = 'To\'g\'ri og\'irlikni kiriting';
    }

    if (!vehicleTypeId) {
      newErrors.vehicleTypeId = 'Transport turini tanlang';
    }

    if (!priceUzs || parseFloat(priceUzs) <= 0) {
      newErrors.priceUzs = 'Buyurtma narxini kiriting';
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
        fromLocation: buildRequestLocation(fromCountry, fromRegion, fromCity),
        toLocation: buildRequestLocation(toCountry, toRegion, toCity),
        weight: parseFloat(weight),
        vehicleTypeId: parseInt(vehicleTypeId),
        priceUzs: parseInt(priceUzs),
      };

      const response = await createOrder(orderData);

      if (response.code === 200) {
        const nextBroadcastStatus = normalizeBroadcastStatus(response.result?.broadcast);
        setCreatedOrder(response.result?.order || orderData);
        setBroadcastStatus(nextBroadcastStatus);
        setOwnerPromptAvailable(Boolean(response.result?.ownerStatusPromptAvailable));
        setOwnerPromptChoice(null);
        setOwnerPromptError('');
        showSuccess(
          nextBroadcastStatus
            ? `Buyurtma yaratildi. ${formatBroadcastDeliveryCount(nextBroadcastStatus)} ta guruhga yuborildi`
            : 'Buyurtma muvaffaqiyatli yaratildi!'
        );
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

  const handleCreateAnother = () => {
    setCargoName('');
    setAdditionalPhone('');
    setDescription('');
    setWeight('');
    setVehicleTypeId('');
    setPriceUzs('');
    setFromCountry('');
    setFromRegion('');
    setFromCity('');
    setToCountry('');
    setToRegion('');
    setToCity('');
    setErrors({});
    setCreatedOrder(null);
    setBroadcastStatus(null);
    setOwnerPromptAvailable(false);
    setOwnerPromptSaving(false);
    setOwnerPromptChoice(null);
    setOwnerPromptError('');
  };

  const handleOwnerPromptChoice = async (enabled) => {
    const orderId = createdOrder?.id;
    if (!orderId || ownerPromptSaving || ownerPromptChoice !== null) return;

    setOwnerPromptSaving(true);
    setOwnerPromptError('');
    try {
      const response = await updateOrderOwnerStatusPrompt(orderId, enabled);
      if (response.code === 200) {
        const savedEnabled = Boolean(response.result?.ownerStatusPromptEnabled);
        setCreatedOrder((prev) => response.result || prev);
        setOwnerPromptChoice(savedEnabled ? 'enabled' : 'disabled');
        if (enabled && !savedEnabled && response.message) {
          setOwnerPromptError(response.message);
        }
      } else {
        setOwnerPromptError(response.message || 'Sozlamani saqlab bo‘lmadi');
      }
    } catch (error) {
      setOwnerPromptError(error.response?.data?.message || 'Sozlamani saqlab bo‘lmadi');
    } finally {
      setOwnerPromptSaving(false);
    }
  };

  const renderOwnerStatusPrompt = () => {
    if (!ownerPromptAvailable || !createdOrder?.id) return null;

    const enabled = ownerPromptChoice === 'enabled';
    const disabled = ownerPromptChoice === 'disabled';

    return (
      <div style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 8,
        background: enabled ? '#eef7f0' : disabled ? '#f8f9fa' : '#f4f8ff',
        border: '1px solid rgba(25, 118, 210, 0.18)',
        textAlign: 'left',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Yuk holatini har soatda so‘raylikmi?
        </div>
        <div style={{ color: '#666', fontSize: 14, lineHeight: 1.45 }}>
          Bot sizdan yuk yopilganmi yoki hali ochiqmi deb so‘raydi. Shu joydan qayta tarqatish yoki yopishni tanlaysiz.
        </div>

        {ownerPromptChoice === null ? (
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              disabled={ownerPromptSaving}
              onClick={() => handleOwnerPromptChoice(true)}
            >
              Ha, so‘rab turing
            </button>
            <button
              className="btn btn-secondary"
              disabled={ownerPromptSaving}
              onClick={() => handleOwnerPromptChoice(false)}
            >
              Yo‘q, kerak emas
            </button>
          </div>
        ) : (
          <div style={{
            marginTop: 12,
            color: enabled ? '#137333' : '#666',
            fontWeight: 700,
            fontSize: 14,
          }}>
            {enabled ? '✅ Eslatma yoqildi. Bir soatdan keyin bot holatini so‘raydi.' : '⛔️ Eslatma yuborilmaydi.'}
          </div>
        )}

        {ownerPromptError && (
          <div style={{ marginTop: 10, color: '#c00', fontSize: 14 }}>
            {ownerPromptError}
          </div>
        )}
      </div>
    );
  };

  const renderBroadcastStatus = () => {
    if (!broadcastStatus) return null;

    return (
      <div style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#d4edda',
        color: '#155724',
        border: '1px solid #c3e6cb'
      }}>
        <div style={{ fontWeight: 700 }}>
          ✅ {formatBroadcastDeliveryCount(broadcastStatus)} ta guruhga yuborildi
        </div>
      </div>
    );
  };

  if (loadingData) {
    return (
      <div className="container">
        <div className="loading">Yuklanmoqda...</div>
      </div>
    );
  }

  if (createdOrder) {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: 720, margin: '40px auto', textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
          <h1 className="page-title" style={{ marginBottom: 10 }}>Yuk yaratildi</h1>
          <p style={{ color: '#666', margin: 0 }}>
            E'lon saqlandi. Endi uni buyurtmalaringizdan kuzatishingiz mumkin.
          </p>

          {renderBroadcastStatus()}
          {renderOwnerStatusPrompt()}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/my-orders')}>
              Buyurtmalarim
            </button>
            <button className="btn btn-secondary" onClick={handleCreateAnother}>
              Yana yuk qo'shish
            </button>
          </div>
        </div>
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
            allowCustom
            error={Boolean(errors.fromLocation)}
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
            allowCustom
            error={Boolean(errors.toLocation)}
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

          {/* Buyurtma narxi */}
          <div className="form-group">
            <label className="form-label">
              Buyurtma narxi (so'm) <span className="required">*</span>
            </label>
            <input
              type="number"
              className={`form-input ${errors.priceUzs ? 'error' : ''}`}
              value={priceUzs}
              onChange={(e) => setPriceUzs(e.target.value)}
              placeholder="Masalan: 500000"
              min="1"
              step="1"
              required
            />
            {errors.priceUzs && (
              <span className="form-error">{errors.priceUzs}</span>
            )}
            <span className="form-helper" style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '8px', borderRadius: '4px', display: 'block', marginTop: '8px' }}>
              ⚠️ Narx faqat o'zbek so'mida va raqamlarda kiritiladi
            </span>
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
