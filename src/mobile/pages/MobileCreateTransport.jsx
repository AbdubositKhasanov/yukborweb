/**
 * Mobile Create Transport Page
 * MUST match Desktop CreateTransportPage.jsx functionality
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaticData } from '../../context/StaticDataContext';
import { createTransport } from '../../services/api';
import TopBar from '../components/TopBar';
import LocationSelector from '../../components/LocationSelector';

export default function MobileCreateTransport() {
  const navigate = useNavigate();
  const { staticData } = useStaticData();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form state - matches Desktop
  const [fromCountry, setFromCountry] = useState('');
  const [fromRegion, setFromRegion] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [additionalPhone, setAdditionalPhone] = useState('');
  const [otherDesc, setOtherDesc] = useState('');
  const [stateNumber, setStateNumber] = useState('');

  // Filtered regions based on country
  const filteredFromRegions = staticData?.regions?.filter(
    (r) => r.countryId === parseInt(fromCountry)
  ) || [];

  // Filtered cities based on region
  const filteredFromCities = staticData?.cities?.filter(
    (c) => c.regionId === parseInt(fromRegion)
  ) || [];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required field
    if (!stateNumber || !stateNumber.trim()) {
      setError('Davlat raqami majburiy maydon');
      return;
    }

    setLoading(true);
    setError('');

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
        stateNumber: stateNumber.trim(),
      };

      const response = await createTransport(transportData);
      if (response.code === 200) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/mobile/transports');
        }, 1500);
      } else {
        setError(response.message || 'Transport yaratishda xatolik');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopBar title="Transport yaratish" showBack />

      <main className="m-content" style={{ paddingBottom: 100 }}>
        <form onSubmit={handleSubmit}>
          {/* Location */}
          <div className="m-card" style={{ marginBottom: 16 }}>
            <div className="m-card-header">
              <h3 className="m-card-title">Joylashuv</h3>
            </div>
            <div style={{ padding: 16 }}>
              <LocationSelector
                label=""
                countryValue={fromCountry}
                regionValue={fromRegion}
                cityValue={fromCity}
                onCountryChange={setFromCountry}
                onRegionChange={setFromRegion}
                onCityChange={setFromCity}
                staticData={staticData}
                variant="mobile"
              />
            </div>
          </div>

          {/* Transport Info */}
          <div className="m-card" style={{ marginBottom: 16 }}>
            <div className="m-card-header">
              <h3 className="m-card-title">Transport ma'lumotlari</h3>
            </div>
            <div style={{ padding: 16 }}>
              <div className="m-form-group">
                <label className="m-form-label">
                  Davlat raqami <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  className="m-form-input"
                  value={stateNumber}
                  onChange={(e) => setStateNumber(e.target.value)}
                  placeholder="01A123BC"
                  required
                />
                <div style={{ fontSize: 12, color: 'var(--m-text-muted)', marginTop: 4 }}>
                  Masalan: 01A123BC, 90X456YZ
                </div>
              </div>

              <div className="m-form-group">
                <label className="m-form-label">Transport turi</label>
                <select
                  className="m-form-select"
                  value={vehicleTypeId}
                  onChange={(e) => setVehicleTypeId(e.target.value)}
                >
                  <option value="">Tanlang</option>
                  {staticData?.vehicleTypes?.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="m-form-group" style={{ marginBottom: 0 }}>
                <label className="m-form-label">Max yuk sig'imi (tonna)</label>
                <input
                  type="number"
                  className="m-form-input"
                  value={maxWeight}
                  onChange={(e) => setMaxWeight(e.target.value)}
                  placeholder="20"
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="m-card" style={{ marginBottom: 16 }}>
            <div className="m-card-header">
              <h3 className="m-card-title">Aloqa</h3>
            </div>
            <div style={{ padding: 16 }}>
              <div className="m-form-group">
                <label className="m-form-label">Qo'shimcha telefon</label>
                <input
                  type="tel"
                  className="m-form-input"
                  value={additionalPhone}
                  onChange={(e) => setAdditionalPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                />
              </div>

              <div className="m-form-group" style={{ marginBottom: 0 }}>
                <label className="m-form-label">Qo'shimcha ma'lumot</label>
                <textarea
                  className="m-form-textarea"
                  value={otherDesc}
                  onChange={(e) => setOtherDesc(e.target.value)}
                  placeholder="Transport haqida qo'shimcha ma'lumot"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              padding: 12,
              background: '#f8d7da',
              borderRadius: 8,
              color: '#721c24',
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div style={{
              padding: 12,
              background: '#d4edda',
              borderRadius: 8,
              color: '#155724',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              Transport muvaffaqiyatli yaratildi!
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="m-btn m-btn-primary m-btn-full m-btn-lg"
            disabled={loading || success}
          >
            {loading ? 'Saqlanmoqda...' : success ? 'Yaratildi!' : 'Saqlash'}
          </button>
        </form>
      </main>
    </>
  );
}
