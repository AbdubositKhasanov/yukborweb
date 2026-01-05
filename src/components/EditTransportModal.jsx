import React, { useState, useEffect } from 'react';
import { getDriverTransportForm, updateTransportForm } from '../services/api';

export default function EditTransportModal({ isOpen, onClose, onSuccess, staticData }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [transportForm, setTransportForm] = useState(null);

  const [fromCountry, setFromCountry] = useState('');
  const [fromRegion, setFromRegion] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [additionalPhone, setAdditionalPhone] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTransportData();
    }
  }, [isOpen]);

  const loadTransportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDriverTransportForm();
      
      if (response.code === 200 && response.result) {
        const form = response.result;
        setTransportForm(form);
        
        setFromCountry(form.fromLocation?.countryId?.toString() || '');
        setFromRegion(form.fromLocation?.regionId?.toString() || '');
        setFromCity(form.fromLocation?.cityId?.toString() || '');
        setMaxWeight(form.maxWeight?.toString() || '');
        
        if (form.vehicleType && staticData?.vehicleTypes) {
          const matchedVehicle = staticData.vehicleTypes.find(
            v => v.name === form.vehicleType
          );
          setVehicleTypeId(matchedVehicle ? matchedVehicle.id.toString() : '');
        } else {
          setVehicleTypeId('');
        }
        
        setAdditionalPhone(form.additionalPhone || '');
      } else {
        setError('Transport formani yuklab bo\'lmadi');
      }
    } catch (err) {
      setError('Formani yuklab bo\'lmadi. Iltimos qayta urinib ko\'ring.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!transportForm || !transportForm.id) {
      setError('Transport ID topilmadi');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const formData = {
        additionalContact: additionalPhone || null,
        fromLocation: {
          cityId: fromCity ? parseInt(fromCity) : null,
          regionId: fromRegion ? parseInt(fromRegion) : null,
          countryId: fromCountry ? parseInt(fromCountry) : null,
        },
        maxWeight: maxWeight ? parseFloat(maxWeight) : null,
        vehicleTypeId: vehicleTypeId ? parseInt(vehicleTypeId) : null,
      };

      const response = await updateTransportForm(transportForm.id, formData);
      if (response.code === 200) {
        onSuccess?.();
        onClose();
      } else {
        setError(response.message || 'Ma\'lumotlarni yangilashda xatolik');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const filteredFromRegions = staticData?.regions.filter(
    r => r.countryId === parseInt(fromCountry)
  ) || [];
  
  const filteredFromCities = staticData?.cities.filter(
    c => c.regionId === parseInt(fromRegion)
  ) || [];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="card-title">Transport ma'lumotlarini tahrirlash</h3>
        
        {loading ? (
          <div className="loading">Yuklanmoqda...</div>
        ) : error && !transportForm ? (
          <div>
            <div className="error-message">{error}</div>
            <button className="btn btn-secondary" onClick={onClose}>
              Yopish
            </button>
          </div>
        ) : (
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

            {error && <div className="error-message">{error}</div>}

            <div className="btn-group">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
