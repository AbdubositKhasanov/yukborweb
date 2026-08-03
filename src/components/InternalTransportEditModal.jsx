import React, { useEffect, useState } from 'react';
import { updateInternalTransport } from '../services/api';
import { showError, showSuccess } from '../utils/toast';
import LocationSelector from './LocationSelector';

export default function InternalTransportEditModal({ isOpen, transport, staticData, onClose, onSaved }) {
  const [fromCountry, setFromCountry] = useState('');
  const [fromRegion, setFromRegion] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [stateNumber, setStateNumber] = useState('');
  const [additionalPhone, setAdditionalPhone] = useState('');
  const [otherDesc, setOtherDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !transport) return;
    setFromCountry(transport.fromLocation?.countryId?.toString() || '');
    setFromRegion(transport.fromLocation?.regionId?.toString() || '');
    setFromCity(transport.fromLocation?.cityId?.toString() || '');
    setVehicleTypeId(transport.vehicleTypeId?.toString() || '');
    setMaxWeight(transport.weight?.toString() || '');
    setStateNumber(transport.stateNumber || '');
    setAdditionalPhone(transport.additionalPhone || '');
    setOtherDesc(transport.otherDesc || '');
  }, [isOpen, transport]);

  if (!isOpen || !transport) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await updateInternalTransport(transport.id, {
        fromLocation: {
          countryId: fromCountry ? Number(fromCountry) : null,
          regionId: fromRegion ? Number(fromRegion) : null,
          cityId: fromCity ? Number(fromCity) : null,
        },
        vehicleTypeId: vehicleTypeId ? Number(vehicleTypeId) : null,
        maxWeight: maxWeight ? Number(maxWeight) : null,
        stateNumber: stateNumber.trim(),
        additionalContact: additionalPhone.trim() || null,
        otherDesc: otherDesc.trim() || null,
      });
      if (response.code !== 200) throw new Error(response.message || "Transportni saqlab bo'lmadi");
      showSuccess("Transport ma'lumotlari saqlandi");
      onSaved?.(response.result);
      onClose();
    } catch (error) {
      showError(error.response?.data?.message || error.message || "Transportni saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 540 }}>
        <h3 className="card-title">Transportni tahrirlash</h3>
        <p style={{ marginTop: -6, color: '#6c757d', fontSize: 13 }}>
          O‘zgarishlar transport egasining kartasiga saqlanadi.
        </p>
        <form onSubmit={handleSubmit}>
          <LocationSelector
            label="Joylashuv"
            countryValue={fromCountry}
            regionValue={fromRegion}
            cityValue={fromCity}
            onCountryChange={setFromCountry}
            onRegionChange={setFromRegion}
            onCityChange={setFromCity}
            staticData={staticData}
          />

          <div className="form-group">
            <label className="form-label" htmlFor="internal-transport-type">Transport turi</label>
            <select id="internal-transport-type" className="form-select" value={vehicleTypeId} onChange={(e) => setVehicleTypeId(e.target.value)}>
              <option value="">Tanlanmagan</option>
              {staticData?.vehicleTypes?.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="internal-transport-weight">Sig‘im (t)</label>
              <input id="internal-transport-weight" className="form-input" type="number" min="0" step="0.1" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="internal-transport-state-number">Davlat raqami</label>
              <input id="internal-transport-state-number" className="form-input" value={stateNumber} onChange={(e) => setStateNumber(e.target.value)} placeholder="01A123BC" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="internal-transport-phone">Telefon</label>
            <input id="internal-transport-phone" className="form-input" type="tel" value={additionalPhone} onChange={(e) => setAdditionalPhone(e.target.value)} placeholder="+998 90 123 45 67" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="internal-transport-description">Qo‘shimcha ma’lumot</label>
            <textarea id="internal-transport-description" className="form-textarea" rows={3} value={otherDesc} onChange={(e) => setOtherDesc(e.target.value)} />
          </div>

          <div className="btn-group">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Bekor qilish</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
