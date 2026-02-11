/**
 * Mobile My Drivers Page (Logist)
 * Simplified driver list with status indicators
 * Includes add/edit transport for drivers
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyInvitedUsers, addInvitedUser, createCounterpartyTransport, updateCounterpartyTransport } from '../../services/api';
import { useStaticData } from '../../context/StaticDataContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import MobileLoading, { ListSkeleton } from '../components/MobileLoading';

export default function MobileMyDrivers() {
  const navigate = useNavigate();
  const { staticData } = useStaticData();

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add driver sheet
  const [addSheet, setAddSheet] = useState(false);
  const [addPhone, setAddPhone] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Transport sheet
  const [transportSheet, setTransportSheet] = useState({ open: false, driver: null, mode: 'create' });
  const [transportData, setTransportData] = useState({
    fromRegion: '',
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
    navigate(`/mobile/driver/${driver.chatId || driver.id || driver._id}`);
  };

  const handleAddDriver = async () => {
    if (!addPhone.trim()) {
      setAddError('Telefon raqamni kiriting');
      return;
    }

    try {
      setAddLoading(true);
      setAddError('');
      const response = await addInvitedUser(addPhone.trim());

      if (response.code === 200) {
        setAddSheet(false);
        setAddPhone('');
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
    const transportForm = driver.driverTransportForm;

    if (mode === 'edit' && transportForm) {
      setTransportData({
        fromRegion: transportForm.fromLocation?.regionId?.toString() || '',
        vehicleType: transportForm.vehicleType || '',
        maxWeight: transportForm.maxWeight?.toString() || '',
        stateNumber: transportForm.stateNumber || '',
        additionalPhone: transportForm.additionalPhone || '',
        description: transportForm.otherDesc || '',
      });
    } else {
      setTransportData({
        fromRegion: '',
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

      const payload = {
        from_region: transportData.fromRegion || undefined,
        vehicle_type: transportData.vehicleType || undefined,
        max_weight: transportData.maxWeight ? parseFloat(transportData.maxWeight) : undefined,
        state_number: transportData.stateNumber || undefined,
        additional_phone: transportData.additionalPhone || undefined,
        description: transportData.description || undefined,
      };

      let response;
      const driverId = driver.chatId || driver.id;
      if (transportSheet.mode === 'edit' && driver.driverTransportForm?.id) {
        response = await updateCounterpartyTransport(driver.driverTransportForm.id, driverId, payload);
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

  if (loading) {
    return (
      <>
        <TopBar title="Haydovchilarim" rightIcon="+" onRightAction={() => setAddSheet(true)} />
        <main className="m-content">
          <ListSkeleton count={5} />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Haydovchilarim" rightIcon="+" onRightAction={() => setAddSheet(true)} />

      <main className="m-content">
        {drivers.length === 0 ? (
          <div className="m-empty">
            <div className="m-empty-icon">👥</div>
            <h3 className="m-empty-title">Haydovchilar yo'q</h3>
            <p className="m-empty-text">Haydovchi qo'shish uchun "+" tugmasini bosing</p>
            <button className="m-btn m-btn-primary" onClick={() => setAddSheet(true)}>
              + Haydovchi qo'shish
            </button>
          </div>
        ) : (
          <div className="m-card m-card-list">
            {drivers.map((driver) => {
              const statusDisplay = getStatusDisplay(driver);
              const driverHasTransport = hasTransport(driver);
              return (
                <div
                  key={driver.chatId || driver.id || driver._id}
                  className="m-list-item m-card-tap"
                  onClick={() => handleDriverClick(driver)}
                >
                  <div className={`m-status-dot ${statusDisplay.dot}`} />
                  <div className="m-list-item-content">
                    <p className="m-list-item-title">
                      {driver.fullName || driver.full_name || 'Haydovchi'}
                      {statusDisplay.label && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--m-warning)' }}>
                          ({statusDisplay.label})
                        </span>
                      )}
                    </p>
                    <p className="m-list-item-subtitle">
                      {driver.phone || driver.phoneNumber || 'Telefon yo\'q'}
                    </p>
                    {driverHasTransport && driver.driverTransportForm && (
                      <div className="m-list-item-meta">
                        <span>🚚 {driver.driverTransportForm.vehicleType || 'Transport'}</span>
                        {driver.driverTransportForm.maxWeight && (
                          <span>• {driver.driverTransportForm.maxWeight}t</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <button
                      className={`m-btn ${driverHasTransport ? 'm-btn-secondary' : 'm-btn-primary'}`}
                      onClick={(e) => handleOpenTransportSheet(e, driver, driverHasTransport ? 'edit' : 'create')}
                      style={{ padding: '4px 10px', fontSize: 12, minHeight: 28 }}
                    >
                      {driverHasTransport ? '✎' : '+ 🚚'}
                    </button>
                    <span className="m-list-item-arrow">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {refreshing && <MobileLoading />}
      </main>

      {/* Add Driver Sheet */}
      <BottomSheet
        isOpen={addSheet}
        onClose={() => {
          setAddSheet(false);
          setAddPhone('');
          setAddError('');
        }}
        title="Haydovchi qo'shish"
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
          Haydovchi YukBor botida ro'yxatdan o'tgan bo'lishi kerak
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

        <div className="m-form-group">
          <label className="m-form-label">Joylashuv</label>
          <select
            className="m-form-select"
            value={transportData.fromRegion}
            onChange={(e) => setTransportData({ ...transportData, fromRegion: e.target.value })}
          >
            <option value="">Tanlang</option>
            {staticData?.regions?.map((region) => (
              <option key={region.regionId} value={region.regionId}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

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
