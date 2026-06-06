import React, { useState, useEffect } from 'react';
import { getDriverTransportForm, updateTransportForm } from '../services/api';
import { showSuccess, showError as showToastError } from '../utils/toast';
import LocationSelector from './LocationSelector';

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

  // Helper to get location name
  const getLocationName = () => {
    const city = staticData?.cities.find(c => c.cityId === parseInt(fromCity));
    const region = staticData?.regions.find(r => r.regionId === parseInt(fromRegion));
    const country = staticData?.countries.find(c => c.countryId === parseInt(fromCountry));
    
    return [city?.name, region?.name, country?.name]
      .filter(Boolean)
      .join(', ');
  };

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
      showToastError('Transport ID topilmadi');
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

      console.log('Updating transport form:', { id: transportForm.id, formData });
      
      const response = await updateTransportForm(transportForm.id, formData);
      
      console.log('Update response:', response);
      
      if (response.code === 200) {
        // Get updated location name to display
        const updatedLocationName = getLocationName();
        
        // Call success callback (this will close modal and refresh data)
        if (onSuccess) {
          onSuccess(updatedLocationName);
        }
      } else {
        const errorMsg = response.message || 'Ma\'lumotlarni yangilashda xatolik';
        setError(errorMsg);
        showToastError(errorMsg);
      }
    } catch (err) {
      console.error('Transport form update error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
      setError(errorMsg);
      showToastError(errorMsg);
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
