import React, { useState, useEffect } from 'react';
import { createCounterpartyTransport, updateCounterpartyTransportForm } from '../services/api';
import { showSuccess, showError } from '../utils/toast';

export default function CounterpartyTransportModal({
  isOpen,
  onClose,
  onSuccess,
  staticData,
  driver,
  mode = 'create' // 'create' or 'edit'
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [fromCountry, setFromCountry] = useState('');
  const [fromRegion, setFromRegion] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [additionalPhone, setAdditionalPhone] = useState('');
  const [otherDesc, setOtherDesc] = useState('');
  const [stateNumber, setStateNumber] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (isOpen && mode === 'edit' && driver?.driverTransportForm) {
      const form = driver.driverTransportForm;

      setFromCountry(form.fromLocation?.countryId?.toString() || '');
      setFromRegion(form.fromLocation?.regionId?.toString() || '');
      setFromCity(form.fromLocation?.cityId?.toString() || '');
      setMaxWeight(form.maxWeight?.toString() || '');
      setStateNumber(form.stateNumber || '');
      setAdditionalPhone(form.additionalPhone || '');
      setOtherDesc(form.otherDesc || '');

      // Match vehicle type by name
      if (form.vehicleType && staticData?.vehicleTypes) {
        const matchedVehicle = staticData.vehicleTypes.find(
          v => v.name === form.vehicleType
        );
        setVehicleTypeId(matchedVehicle ? matchedVehicle.id.toString() : '');
      } else if (form.vehicleTypeId) {
        setVehicleTypeId(form.vehicleTypeId.toString());
      } else {
        setVehicleTypeId('');
      }
    } else if (isOpen && mode === 'create') {
      // Reset form for create mode
      resetForm();
    }
  }, [isOpen, mode, driver, staticData]);

  const resetForm = () => {
    setFromCountry('');
    setFromRegion('');
    setFromCity('');
    setMaxWeight('');
    setVehicleTypeId('');
    setAdditionalPhone('');
    setOtherDesc('');
    setStateNumber('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required field for create mode
    if (mode === 'create' && (!stateNumber || !stateNumber.trim())) {
      setError('Davlat raqami majburiy maydon');
      return;
    }

    setSaving(true);
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
        additionalContact: additionalPhone || null,
        otherDesc: otherDesc || null,
        stateNumber: stateNumber?.trim() || null,
      };

      let response;

      if (mode === 'create') {
        response = await createCounterpartyTransport(driver.chatId, transportData);
      } else {
        // Edit mode - update the transport form
        const formId = driver.driverTransportForm?.id;
        if (!formId) {
          throw new Error('Transport form ID topilmadi');
        }
        response = await updateCounterpartyTransportForm(formId, driver.chatId, transportData);
      }

      if (response.code === 200) {
        showSuccess(mode === 'create'
          ? 'Transport muvaffaqiyatli yaratildi!'
          : 'Transport muvaffaqiyatli yangilandi!'
        );
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        const errorMsg = response.message || 'Xatolik yuz berdi';
        setError(errorMsg);
        showError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const filteredFromRegions = staticData?.regions?.filter(
    r => r.countryId === parseInt(fromCountry)
  ) || [];

  const filteredFromCities = staticData?.cities?.filter(
    c => c.regionId === parseInt(fromRegion)
  ) || [];

  if (!isOpen) return null;

  const title = mode === 'create'
    ? `${driver?.name || 'Haydovchi'} uchun transport yaratish`
    : `${driver?.name || 'Haydovchi'} transportini tahrirlash`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3 className="card-title">{title}</h3>

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
                {staticData?.countries?.map(country => (
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
              placeholder="Masalan: 20"
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
              {staticData?.vehicleTypes?.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Davlat raqami {mode === 'create' && <span style={{ color: 'red' }}>*</span>}
            </label>
            <input
              type="text"
              className="form-input"
              value={stateNumber}
              onChange={(e) => setStateNumber(e.target.value)}
              placeholder="01A123BC"
              required={mode === 'create'}
            />
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
              rows={3}
            />
          </div>

          {error && <div className="error-message" style={{ marginBottom: '15px' }}>{error}</div>}

          <div className="btn-group">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
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
      </div>
    </div>
  );
}
