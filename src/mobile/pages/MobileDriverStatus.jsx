/**
 * Mobile Driver Status Page
 * Big toggle with inline editable location/transport
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserMe, updateDriverStatus, getDriverTransportForm, updateTransportForm } from '../../services/api';
import { useStaticData } from '../../context/StaticDataContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import MobileLoading from '../components/MobileLoading';
import LocationSelector from '../../components/LocationSelector';

export default function MobileDriverStatus() {
  const navigate = useNavigate();
  const { staticData } = useStaticData();

  const [isActive, setIsActive] = useState(false);
  const [location, setLocation] = useState('');
  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Edit sheets
  const [editLocationSheet, setEditLocationSheet] = useState(false);
  const [editTransportSheet, setEditTransportSheet] = useState(false);

  // Edit form data - MUST match Desktop EditTransportModal.jsx
  const [fromCountry, setFromCountry] = useState('');
  const [fromRegion, setFromRegion] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [additionalPhone, setAdditionalPhone] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const [userResponse, transportResponse] = await Promise.all([
        getUserMe(),
        getDriverTransportForm(),
      ]);

      if (userResponse.code === 200 && userResponse.result) {
        const user = userResponse.result;
        // MUST use correct field names from Desktop
        setIsActive(user.driverCurrentStatus || false);
        setLocation(user.driverLastLocName || '');
      }

      if (transportResponse.code === 200 && transportResponse.result) {
        const t = transportResponse.result;
        setTransport(t);
        // Populate edit form - MUST match Desktop EditTransportModal.jsx
        setFromCountry(t.fromLocation?.countryId?.toString() || '');
        setFromRegion(t.fromLocation?.regionId?.toString() || '');
        setFromCity(t.fromLocation?.cityId?.toString() || '');
        setMaxWeight(t.maxWeight?.toString() || '');
        setAdditionalPhone(t.additionalPhone || '');

        if (t.vehicleType && staticData?.vehicleTypes) {
          const matchedVehicle = staticData.vehicleTypes.find(
            v => v.name === t.vehicleType
          );
          setVehicleTypeId(matchedVehicle ? matchedVehicle.id.toString() : '');
        }
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!transport) {
      // No transport, prompt to create
      setEditTransportSheet(true);
      return;
    }

    // Prevent double-click
    if (updating) return;

    try {
      setUpdating(true);
      const newStatus = !isActive;
      const response = await updateDriverStatus(newStatus);

      if (response.code === 200) {
        // Only update local state - no page refresh
        setIsActive(newStatus);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!transport?.id) return;

    try {
      setUpdating(true);
      // MUST match Desktop EditTransportModal.jsx payload
      const response = await updateTransportForm(transport.id, {
        fromLocation: {
          cityId: fromCity ? parseInt(fromCity) : null,
          regionId: fromRegion ? parseInt(fromRegion) : null,
          countryId: fromCountry ? parseInt(fromCountry) : null,
        },
      });

      if (response.code === 200) {
        setEditLocationSheet(false);
        // Refresh to get updated location name
        const userResponse = await getUserMe();
        if (userResponse.code === 200 && userResponse.result) {
          setLocation(userResponse.result.driverLastLocName || '');
        }
      }
    } catch (error) {
      console.error('Failed to update location:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveTransport = async () => {
    if (!transport?.id) {
      // Create new transport - navigate to create page
      navigate('/mobile/my-transports');
      return;
    }

    try {
      setUpdating(true);
      // MUST match Desktop EditTransportModal.jsx payload EXACTLY
      const response = await updateTransportForm(transport.id, {
        additionalContact: additionalPhone || null,
        fromLocation: {
          cityId: fromCity ? parseInt(fromCity) : null,
          regionId: fromRegion ? parseInt(fromRegion) : null,
          countryId: fromCountry ? parseInt(fromCountry) : null,
        },
        maxWeight: maxWeight ? parseFloat(maxWeight) : null,
        vehicleTypeId: vehicleTypeId ? parseInt(vehicleTypeId) : null,
      });

      if (response.code === 200) {
        setEditTransportSheet(false);
        await loadStatus();
      }
    } catch (error) {
      console.error('Failed to update transport:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Format transport display
  const formatTransport = () => {
    if (!transport) return 'Transport qo\'shilmagan';
    const parts = [];
    if (transport.vehicleType) parts.push(transport.vehicleType);
    if (transport.maxWeight) parts.push(`${transport.maxWeight}t`);
    return parts.join(' • ') || 'Transport';
  };

  // Filtered regions/cities based on selection
  const filteredRegions = staticData?.regions?.filter(
    r => r.countryId === parseInt(fromCountry)
  ) || [];

  const filteredCities = staticData?.cities?.filter(
    c => c.regionId === parseInt(fromRegion)
  ) || [];

  if (loading) {
    return (
      <>
        <TopBar title="Holat" />
        <MobileLoading fullScreen />
      </>
    );
  }

  return (
    <>
      <TopBar title="Holatingiz" />

      <main className="m-content m-content-padded">
        {/* Big toggle card */}
        <div
          className={`m-toggle-card ${isActive ? 'active' : 'inactive'}`}
          onClick={handleToggle}
          style={{ pointerEvents: updating ? 'none' : 'auto' }}
        >
          {updating ? (
            <div className="m-spinner" style={{ margin: '20px auto' }} />
          ) : (
            <>
              <div className="m-toggle-card-status">
                {isActive ? 'FAOL' : 'NOFAOL'}
              </div>
              <div className="m-toggle-card-switch" />
              <div className="m-toggle-card-hint">
                {isActive ? 'Yuklar qabul qilinmoqda' : 'Statusni o\'zgartirish uchun bosing'}
              </div>
            </>
          )}
        </div>

        <div className="m-divider" />

        {/* Location */}
        <div
          className="m-inline-edit"
          onClick={() => {
            if (!transport) {
              setEditTransportSheet(true);
              return;
            }
            setEditLocationSheet(true);
          }}
        >
          <div className="m-inline-edit-content">
            <div className="m-inline-edit-label">📍 Joylashuv</div>
            <div className="m-inline-edit-value">
              {transport ? (location || 'Belgilanmagan') : 'Avval transport qo\'shing'}
            </div>
          </div>
          <span className="m-inline-edit-icon">✎</span>
        </div>

        {/* Transport */}
        <div
          className="m-inline-edit"
          onClick={() => setEditTransportSheet(true)}
        >
          <div className="m-inline-edit-content">
            <div className="m-inline-edit-label">🚚 Transport</div>
            <div className="m-inline-edit-value">{formatTransport()}</div>
          </div>
          <span className="m-inline-edit-icon">✎</span>
        </div>

        {!transport && (
          <div style={{ padding: 16, background: '#fff3e0', borderRadius: 8, marginTop: 16 }}>
            <p style={{ margin: 0, fontSize: 14, color: '#e65100' }}>
              ⚠️ Faollashtirish uchun avval transport qo'shing. Transport bo'limini bosing va ma'lumotlarni kiriting.
            </p>
          </div>
        )}
      </main>

      {/* Edit Location Sheet */}
      <BottomSheet
        isOpen={editLocationSheet}
        onClose={() => setEditLocationSheet(false)}
        title="📍 Joylashuvni o'zgartirish"
        footer={
          <button
            className="m-btn m-btn-primary m-btn-full m-btn-lg"
            onClick={handleSaveLocation}
            disabled={updating}
          >
            {updating ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        }
      >
        <LocationSelector
          label="Joylashuv"
          countryValue={fromCountry}
          regionValue={fromRegion}
          cityValue={fromCity}
          onCountryChange={setFromCountry}
          onRegionChange={setFromRegion}
          onCityChange={setFromCity}
          staticData={staticData}
          variant="mobile"
        />
      </BottomSheet>

      {/* Edit Transport Sheet */}
      <BottomSheet
        isOpen={editTransportSheet}
        onClose={() => setEditTransportSheet(false)}
        title="🚚 Transportni o'zgartirish"
        footer={
          <button
            className="m-btn m-btn-primary m-btn-full m-btn-lg"
            onClick={handleSaveTransport}
            disabled={updating}
          >
            {updating ? 'Saqlanmoqda...' : transport ? 'Saqlash' : 'Transport qo\'shish'}
          </button>
        }
      >
        {transport ? (
          <>
            <LocationSelector
              label="Joylashuv"
              countryValue={fromCountry}
              regionValue={fromRegion}
              cityValue={fromCity}
              onCountryChange={setFromCountry}
              onRegionChange={setFromRegion}
              onCityChange={setFromCity}
              staticData={staticData}
              variant="mobile"
            />

            {/* Vehicle type */}
            <div className="m-form-group">
              <label className="m-form-label">Transport turi</label>
              <select
                className="m-form-select"
                value={vehicleTypeId}
                onChange={(e) => setVehicleTypeId(e.target.value)}
              >
                <option value="">Tanlang</option>
                {staticData?.vehicleTypes?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Max weight */}
            <div className="m-form-group">
              <label className="m-form-label">Maksimal vazn (tonna)</label>
              <input
                type="number"
                className="m-form-input"
                placeholder="0"
                value={maxWeight}
                onChange={(e) => setMaxWeight(e.target.value)}
                inputMode="decimal"
              />
            </div>

            {/* Additional phone */}
            <div className="m-form-group">
              <label className="m-form-label">Qo'shimcha telefon</label>
              <input
                type="tel"
                className="m-form-input"
                placeholder="+998 90 123 45 67"
                value={additionalPhone}
                onChange={(e) => setAdditionalPhone(e.target.value)}
                inputMode="tel"
              />
            </div>
          </>
        ) : (
          <div className="m-empty" style={{ padding: '24px 0' }}>
            <div className="m-empty-icon">🚚</div>
            <p className="m-empty-text">
              Transport qo'shish uchun "Transport qo'shish" tugmasini bosing
            </p>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
