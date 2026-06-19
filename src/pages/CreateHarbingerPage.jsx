import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createHarbinger, getUserMe } from '../services/api';
import { useStaticData } from '../context/StaticDataContext';
import LocationSelector from '../components/LocationSelector';
import ClubMembershipModal from '../components/ClubMembershipModal';

export default function CreateHarbingerPage() {
  const navigate = useNavigate();
  const { staticData, loading: staticLoading } = useStaticData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [featureLimits, setFeatureLimits] = useState(null);
  const [showClubModal, setShowClubModal] = useState(false);

  const [fromCountry, setFromCountry] = useState('');
  const [fromRegion, setFromRegion] = useState('');
  const [fromCity, setFromCity] = useState('');

  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [orderTypePreference, setOrderTypePreference] = useState('any');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await getUserMe();
      if (response.code === 200 && response.result) {
        setPermissions(response.result.permissions || null);
        setFeatureLimits(response.result.featureLimits || null);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if user has harbinger creation permission
    if (!permissions?.createHarbinger) {
      setShowClubModal(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const harbingerData = {
        fromLocation: {
          cityId: fromCity ? parseInt(fromCity) : null,
          regionId: fromRegion ? parseInt(fromRegion) : null,
          countryId: fromCountry ? parseInt(fromCountry) : null,
        },
        minWeight: minWeight ? parseFloat(minWeight) : null,
        maxWeight: maxWeight ? parseFloat(maxWeight) : null,
        vehicleTypeId: vehicleTypeId ? parseInt(vehicleTypeId) : null,
        orderTypePreference,
      };

      const response = await createHarbinger(harbingerData);
      if (response.code === 200) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/my-harbingers');
        }, 1500);
      } else {
        setError(response.message || 'Xabarchi yaratishda xatolik');
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
      <h1 className="page-title">Xabarchi yaratish</h1>

      <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
        {featureLimits?.createHarbinger && (
          <div
            style={{
              marginBottom: '14px',
              padding: '12px',
              background: featureLimits.createHarbinger.remaining === 0 && !featureLimits.createHarbinger.unlimited ? '#fff5f5' : '#f5f9ff',
              border: '1px solid #d9e6f8',
              borderRadius: '6px',
              color: '#333',
              fontSize: '14px',
            }}
          >
            Xabarchi limiti:{' '}
            {featureLimits.createHarbinger.unlimited
              ? `${featureLimits.createHarbinger.used || 0}/cheksiz`
              : `${featureLimits.createHarbinger.used || 0}/${featureLimits.createHarbinger.limit || 0}`}
            {featureLimits.createHarbinger.expiresAt && (
              <span> · Tarif tugaydi: {new Date(featureLimits.createHarbinger.expiresAt).toLocaleDateString('uz-UZ')}</span>
            )}
          </div>
        )}

        <p
          style={{
            marginBottom: '25px',
            color: '#666',
            lineHeight: '1.6',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
          }}
        >
          💡 Harbinger - bu yuk qidiruv xabarnomasi. Siz qidirayotgan yuk turini belgilasangiz, mos
          yuklar paydo bo'lganda sizga xabar beramiz.
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Minimal og'irligi (t)</label>
              <input
                type="number"
                className="form-input"
                value={minWeight}
                onChange={(e) => setMinWeight(e.target.value)}
                placeholder="Masalan: 100"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Maksimal og'irligi (t)</label>
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
            <label className="form-label">Transport turi</label>
            <select
              className="form-select"
              value={vehicleTypeId}
              onChange={(e) => setVehicleTypeId(e.target.value)}
            >
              <option value="">Transport turini tanlang</option>
              {staticData?.vehicleTypes.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Qanday buyurtmalar haqida xabar kelsin?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="orderTypePreference"
                  value="any"
                  checked={orderTypePreference === 'any'}
                  onChange={() => setOrderTypePreference('any')}
                />
                <span>Barcha buyurtmalar</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="orderTypePreference"
                  value="cargo_owner_only"
                  checked={orderTypePreference === 'cargo_owner_only'}
                  onChange={() => setOrderTypePreference('cargo_owner_only')}
                />
                <span>Faqat yuk egasi buyurtmalari (logistlar yashiriladi)</span>
              </label>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">Harbinger muvaffaqiyatli yaratildi!</div>}

          <div className="btn-group">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/my-harbingers')}
            >
              Bekor qilish
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>

      <ClubMembershipModal
        isOpen={showClubModal}
        onClose={() => setShowClubModal(false)}
        featureKey="createHarbinger"
        message="Xabarchi yaratish uchun faol premium tarif kerak yoki limitingiz tugagan."
        currentLimit={featureLimits?.createHarbinger}
      />
    </div>
  );
}
