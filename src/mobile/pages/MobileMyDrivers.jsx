/**
 * Mobile My Drivers Page (Logist)
 * Simplified driver list with status indicators
 * Includes add/edit transport for drivers
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyInvitedUsers, addInvitedUser, createCounterpartyTransport, updateCounterpartyTransportForm } from '../../services/api';
import { useStaticData } from '../../context/StaticDataContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import MobileLoading, { ListSkeleton } from '../components/MobileLoading';
import PullToRefresh from '../components/PullToRefresh';
import LocationSelector from '../../components/LocationSelector';

const ROLE_FILTERS = [
  { key: 'driver', label: 'Haydovchilar' },
  { key: 'factory', label: 'Yuk egalari' },
];

export default function MobileMyDrivers() {
  const navigate = useNavigate();
  const { staticData } = useStaticData();

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add driver sheet
  const [addSheet, setAddSheet] = useState(false);
  const [activeRole, setActiveRole] = useState('driver');
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addRole, setAddRole] = useState('driver');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Transport sheet
  const [transportSheet, setTransportSheet] = useState({ open: false, driver: null, mode: 'create' });
  const [transportData, setTransportData] = useState({
    fromCountry: '',
    fromRegion: '',
    fromCity: '',
    vehicleType: '',
    maxWeight: '',
    stateNumber: '',
    additionalPhone: '',
    description: '',
  });
  const [transportLoading, setTransportLoading] = useState(false);
  const [transportError, setTransportError] = useState('');

  const loadDrivers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await getMyInvitedUsers();
      if (response.code === 200) {
        setDrivers(response.result || []);
      }
    } catch (error) {
      console.error('Failed to load drivers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const handleDriverClick = (driver) => {
    if ((driver.type || 'driver') !== 'driver') return;
    if (!driver.isRegistered && !driver.chatId) return;
    navigate(`/mobile/driver/${driver.chatId || driver.id || driver._id}`);
  };

  const handleAddDriver = async () => {
    if (!addName.trim()) {
      setAddError('Ismni kiriting');
      return;
    }
    if (!addPhone.trim()) {
      setAddError('Telefon raqamni kiriting');
      return;
    }

    try {
      setAddLoading(true);
      setAddError('');
      const response = await addInvitedUser({
        name: addName.trim(),
        phone: addPhone.trim(),
        type: addRole,
      });

      if (response.code === 200) {
        setAddSheet(false);
        setAddName('');
        setAddPhone('');
        setAddRole(activeRole);
        await loadDrivers(true);
      } else {
        setAddError(response.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      setAddError('Xatolik yuz berdi');
    } finally {
      setAddLoading(false);
    }
  };

  // Get status display
  const getStatusDisplay = (driver) => {
    if (!driver.isRegistered && !driver.chatId) {
      return { dot: 'offline', label: 'Ro\'yxatdan o\'tmagan' };
    }
    const isOnline = driver.isActive || driver.is_active;
    const isBusy = driver.isBusy || driver.is_busy;

    if (isBusy) {
      return { dot: 'busy', label: 'Band' };
    }
    if (isOnline) {
      return { dot: 'online', label: null };
    }
    return { dot: 'offline', label: null };
  };

  // Transport handlers
  const handleOpenTransportSheet = (e, driver, mode) => {
    e.stopPropagation();
    if (!driver.isRegistered && !driver.chatId) return;
    const transportForm = driver.driverTransportForm;

    if (mode === 'edit' && transportForm) {
      setTransportData({
        fromCountry: transportForm.fromLocation?.countryId?.toString() || '',
        fromRegion: transportForm.fromLocation?.regionId?.toString() || '',
        fromCity: transportForm.fromLocation?.cityId?.toString() || '',
        vehicleType: transportForm.vehicleType || '',
        maxWeight: transportForm.maxWeight?.toString() || '',
        stateNumber: transportForm.stateNumber || '',
        additionalPhone: transportForm.additionalPhone || '',
        description: transportForm.otherDesc || '',
      });
    } else {
      setTransportData({
        fromCountry: '',
        fromRegion: '',
        fromCity: '',
        vehicleType: '',
        maxWeight: '',
        stateNumber: '',
        additionalPhone: '',
        description: '',
      });
    }

    setTransportSheet({ open: true, driver, mode });
    setTransportError('');
  };

  const handleSaveTransport = async () => {
    const driver = transportSheet.driver;
    if (!driver) return;

    try {
      setTransportLoading(true);
      setTransportError('');

      // MUST match Desktop CounterpartyTransportModal.jsx payload (camelCase)
      const vehicleType = staticData?.vehicleTypes?.find(v => v.name === transportData.vehicleType);
      const payload = {
        fromLocation: {
          regionId: transportData.fromRegion ? parseInt(transportData.fromRegion) : null,
          countryId: transportData.fromCountry ? parseInt(transportData.fromCountry) : null,
          cityId: transportData.fromCity ? parseInt(transportData.fromCity) : null,
        },
        maxWeight: transportData.maxWeight ? parseFloat(transportData.maxWeight) : null,
        vehicleTypeId: vehicleType ? vehicleType.id : null,
        additionalContact: transportData.additionalPhone || null,
        otherDesc: transportData.description || null,
        stateNumber: transportData.stateNumber?.trim() || null,
      };

      let response;
      const driverId = driver.chatId || driver.id;
      if (transportSheet.mode === 'edit' && driver.driverTransportForm?.id) {
        response = await updateCounterpartyTransportForm(driver.driverTransportForm.id, driverId, payload);
      } else {
        response = await createCounterpartyTransport(driverId, payload);
      }

      if (response.code === 200) {
        setTransportSheet({ open: false, driver: null, mode: 'create' });
        await loadDrivers(true);
      } else {
        setTransportError(response.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      setTransportError('Xatolik yuz berdi');
    } finally {
      setTransportLoading(false);
    }
  };

  // Check if driver has transport
  const hasTransport = (driver) => {
    const tf = driver.driverTransportForm;
    return tf && (tf.loc1 || tf.vehicleType || tf.maxWeight);
  };

  const openAddSheet = (role = activeRole) => {
    setAddRole(role);
    setAddSheet(true);
  };

  const visibleDrivers = drivers.filter((driver) => (driver.type || 'driver') === activeRole);

  if (loading) {
    return (
      <>
        <TopBar title="Hamkorlarim" rightIcon="+" onRightAction={() => openAddSheet(activeRole)} />
        <main className="m-content">
          <ListSkeleton count={5} />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Hamkorlarim" rightIcon="+" onRightAction={() => openAddSheet(activeRole)} />

      <main className="m-content">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto' }}>
          {ROLE_FILTERS.map((role) => (
            <button
              key={role.key}
              className={`m-btn ${activeRole === role.key ? 'm-btn-primary' : 'm-btn-secondary'}`}
              onClick={() => setActiveRole(role.key)}
              style={{ whiteSpace: 'nowrap', minHeight: 36 }}
            >
              {role.label} · {drivers.filter((driver) => (driver.type || 'driver') === role.key).length}
            </button>
          ))}
        </div>
        <PullToRefresh onRefresh={() => loadDrivers(true)} disabled={loading}>
          {visibleDrivers.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-icon">👥</div>
              <h3 className="m-empty-title">{activeRole === 'driver' ? 'Haydovchilar' : 'Yuk egalari'} yo'q</h3>
              <p className="m-empty-text">Hamkor qo'shish uchun "+" tugmasini bosing</p>
              <button className="m-btn m-btn-primary" onClick={() => openAddSheet(activeRole)}>
                + Hamkor qo'shish
              </button>
            </div>
          ) : (
          <div className="m-card m-card-list">
            {visibleDrivers.map((driver) => {
              const statusDisplay = getStatusDisplay(driver);
              const driverHasTransport = hasTransport(driver);
              const isRegistered = driver.isRegistered === true || Boolean(driver.chatId);
              const isDriver = (driver.type || 'driver') === 'driver';
              return (
                <div
                  key={driver.chatId || driver.id || driver._id}
                  className="m-list-item m-card-tap"
                  onClick={() => handleDriverClick(driver)}
                  style={!isRegistered ? { opacity: 0.95 } : null}
                >
                  <div className={`m-status-dot ${statusDisplay.dot}`} />
                  <div className="m-list-item-content">
                    <p className="m-list-item-title">
                      {driver.name || driver.fullName || driver.full_name || 'Hamkor'}
                      {statusDisplay.label && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--m-warning)' }}>
                          ({statusDisplay.label})
                        </span>
                      )}
                    </p>
                    <p className="m-list-item-subtitle">
                      {driver.phone || driver.phoneNumber || 'Telefon yo\'q'}
                    </p>
                    <div className="m-list-item-meta">
                      <span>{isDriver ? 'Haydovchi' : 'Yuk egasi'}</span>
                      <span>•</span>
                      <span>{isRegistered ? 'Ro\'yxatdan o\'tgan' : 'Hali ro\'yxatdan o\'tmagan'}</span>
                    </div>
                    {isDriver && driverHasTransport && driver.driverTransportForm && (
                      <div className="m-list-item-meta">
                        <span>🚚 {driver.driverTransportForm.vehicleType || 'Transport'}</span>
                        {driver.driverTransportForm.maxWeight && (
                          <span>• {driver.driverTransportForm.maxWeight}t</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    {isDriver && (
                    <button
                      className={`m-btn ${driverHasTransport ? 'm-btn-secondary' : 'm-btn-primary'}`}
                      onClick={(e) => handleOpenTransportSheet(e, driver, driverHasTransport ? 'edit' : 'create')}
                      disabled={!isRegistered}
                      style={{ padding: '4px 10px', fontSize: 12, minHeight: 28, opacity: isRegistered ? 1 : 0.55 }}
                    >
                      {driverHasTransport ? '✎' : '+ 🚚'}
                    </button>
                    )}
                    <span className="m-list-item-arrow">→</span>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </PullToRefresh>
      </main>

      {/* Add Driver Sheet */}
      <BottomSheet
        isOpen={addSheet}
        onClose={() => {
          setAddSheet(false);
          setAddName('');
          setAddPhone('');
          setAddRole(activeRole);
          setAddError('');
        }}
        title="Hamkor qo'shish"
        footer={
          <button
            className="m-btn m-btn-primary m-btn-full m-btn-lg"
            onClick={handleAddDriver}
            disabled={addLoading}
          >
            {addLoading ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
          </button>
        }
      >
        <div className="m-form-group">
          <label className="m-form-label">Rol</label>
          <select
            className="m-form-select"
            value={addRole}
            onChange={(e) => setAddRole(e.target.value)}
          >
            <option value="driver">Haydovchi</option>
            <option value="factory">Yuk egasi</option>
          </select>
        </div>
        <div className="m-form-group">
          <label className="m-form-label">Ism</label>
          <input
            type="text"
            className={`m-form-input ${addError ? 'error' : ''}`}
            placeholder="Aliyev Ali"
            value={addName}
            onChange={(e) => {
              setAddName(e.target.value);
              setAddError('');
            }}
          />
        </div>
        <div className="m-form-group">
          <label className="m-form-label">Telefon raqam</label>
          <input
            type="tel"
            className={`m-form-input ${addError ? 'error' : ''}`}
            placeholder="+998 90 123 45 67"
            value={addPhone}
            onChange={(e) => {
              setAddPhone(e.target.value);
              setAddError('');
            }}
            inputMode="tel"
          />
          {addError && <p className="m-form-error">{addError}</p>}
        </div>
        <p style={{ fontSize: 14, color: 'var(--m-text-muted)', marginTop: 8 }}>
          Ichki logist ro'yxatdan o'tmagan hamkorni ham oldindan yaratishi mumkin.
        </p>
      </BottomSheet>

      {/* Transport Sheet */}
      <BottomSheet
        isOpen={transportSheet.open}
        onClose={() => {
          setTransportSheet({ open: false, driver: null, mode: 'create' });
          setTransportError('');
        }}
        title={transportSheet.mode === 'edit' ? '🚚 Transportni tahrirlash' : '🚚 Transport qo\'shish'}
        height="full"
        footer={
          <button
            className="m-btn m-btn-primary m-btn-full m-btn-lg"
            onClick={handleSaveTransport}
            disabled={transportLoading}
          >
            {transportLoading ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        }
      >
        {transportSheet.driver && (
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--m-bg)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600 }}>
              {transportSheet.driver.fullName || transportSheet.driver.full_name || 'Haydovchi'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--m-text-secondary)' }}>
              {transportSheet.driver.phone || transportSheet.driver.phoneNumber}
            </div>
          </div>
        )}

        {transportError && (
          <div style={{ padding: 12, background: '#f8d7da', borderRadius: 8, color: '#721c24', marginBottom: 16 }}>
            {transportError}
          </div>
        )}

        <LocationSelector
          label="Joylashuv"
          countryValue={transportData.fromCountry}
          regionValue={transportData.fromRegion}
          cityValue={transportData.fromCity}
          onCountryChange={(value) => setTransportData((prev) => ({ ...prev, fromCountry: value }))}
          onRegionChange={(value) => setTransportData((prev) => ({ ...prev, fromRegion: value }))}
          onCityChange={(value) => setTransportData((prev) => ({ ...prev, fromCity: value }))}
          staticData={staticData}
          variant="mobile"
        />

        <div className="m-form-group">
          <label className="m-form-label">Transport turi</label>
          <select
            className="m-form-select"
            value={transportData.vehicleType}
            onChange={(e) => setTransportData({ ...transportData, vehicleType: e.target.value })}
          >
            <option value="">Tanlang</option>
            {staticData?.vehicleTypes?.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="m-form-group">
          <label className="m-form-label">Maksimal vazn (tonna)</label>
          <input
            type="number"
            className="m-form-input"
            placeholder="0"
            value={transportData.maxWeight}
            onChange={(e) => setTransportData({ ...transportData, maxWeight: e.target.value })}
            inputMode="decimal"
          />
        </div>

        <div className="m-form-group">
          <label className="m-form-label">Davlat raqami</label>
          <input
            type="text"
            className="m-form-input"
            placeholder="01A123BC"
            value={transportData.stateNumber}
            onChange={(e) => setTransportData({ ...transportData, stateNumber: e.target.value.toUpperCase() })}
          />
        </div>

        <div className="m-form-group">
          <label className="m-form-label">Qo'shimcha telefon</label>
          <input
            type="tel"
            className="m-form-input"
            placeholder="+998 90 123 45 67"
            value={transportData.additionalPhone}
            onChange={(e) => setTransportData({ ...transportData, additionalPhone: e.target.value })}
            inputMode="tel"
          />
        </div>

        <div className="m-form-group">
          <label className="m-form-label">Izoh</label>
          <textarea
            className="m-form-textarea"
            placeholder="Qo'shimcha ma'lumotlar..."
            value={transportData.description}
            onChange={(e) => setTransportData({ ...transportData, description: e.target.value })}
            rows={3}
          />
        </div>
      </BottomSheet>
    </>
  );
}
