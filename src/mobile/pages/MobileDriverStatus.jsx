/**
 * Mobile Driver Status Page
 * Big toggle with inline editable location/transport
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserMe, updateDriverStatus, getDriverTransportForm, updateTransportForm } from '../../services/api';
import { useStaticData } from '../../context/StaticDataContext';
import { useMobileAuth } from '../context/MobileAuthContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import MobileLoading from '../components/MobileLoading';

export default function MobileDriverStatus() {
  const navigate = useNavigate();
  const { staticData } = useStaticData();
  const { refreshUser } = useMobileAuth();

  const [isActive, setIsActive] = useState(false);
  const [location, setLocation] = useState('');
  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Edit sheets
  const [editLocationSheet, setEditLocationSheet] = useState(false);
  const [editTransportSheet, setEditTransportSheet] = useState(false);

  // Edit form data
  const [editLocation, setEditLocation] = useState('');
  const [editTransportData, setEditTransportData] = useState({
    vehicleType: '',
    maxWeight: '',
    stateNumber: '',
  });

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

      if (userResponse.code === 200) {
        const user = userResponse.result;
        setIsActive(user.isActive || false);
        setLocation(user.driverLocation || '');
      }

      if (transportResponse.code === 200 && transportResponse.result) {
        const t = transportResponse.result;
        setTransport(t);
        setEditTransportData({
          vehicleType: t.vehicleType || '',
          maxWeight: t.maxWeight?.toString() || '',
          stateNumber: t.stateNumber || '',
        });
        setEditLocation(t.fromRegion || '');
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

    try {
      setUpdating(true);
      const newStatus = !isActive;
      const response = await updateDriverStatus(newStatus);

      if (response.code === 200) {
        setIsActive(newStatus);
        await refreshUser();
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
      const response = await updateTransportForm(transport.id, {
        from_region: editLocation,
      });

      if (response.code === 200) {
        setLocation(staticData?.regions?.find(r => r.code === editLocation)?.name || editLocation);
        setEditLocationSheet(false);
        await loadStatus();
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
      const response = await updateTransportForm(transport.id, {
        vehicle_type: editTransportData.vehicleType,
        max_weight: parseFloat(editTransportData.maxWeight) || undefined,
        state_number: editTransportData.stateNumber,
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
    if (transport.stateNumber) parts.push(transport.stateNumber);
    return parts.join(' • ') || 'Transport';
  };

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
            setEditLocation(transport?.fromRegion || '');
            setEditLocationSheet(true);
          }}
        >
          <div className="m-inline-edit-content">
            <div className="m-inline-edit-label">📍 Joylashuv</div>
            <div className="m-inline-edit-value">
              {location || 'Belgilanmagan'}
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
              ⚠️ Faollashtirish uchun avval transport qo'shing
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
            disabled={updating || !editLocation}
          >
            {updating ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        }
      >
        <div className="m-form-group">
          <label className="m-form-label">Viloyat</label>
          <select
            className="m-form-select"
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
          >
            <option value="">Tanlang</option>
            {staticData?.regions?.map((region) => (
              <option key={region.regionId} value={region.regionId}>
                {region.name}
              </option>
            ))}
          </select>
        </div>
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
            <div className="m-form-group">
              <label className="m-form-label">Transport turi</label>
              <select
                className="m-form-select"
                value={editTransportData.vehicleType}
                onChange={(e) => setEditTransportData({ ...editTransportData, vehicleType: e.target.value })}
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
                value={editTransportData.maxWeight}
                onChange={(e) => setEditTransportData({ ...editTransportData, maxWeight: e.target.value })}
                inputMode="decimal"
              />
            </div>

            <div className="m-form-group">
              <label className="m-form-label">Davlat raqami</label>
              <input
                type="text"
                className="m-form-input"
                placeholder="01A123BC"
                value={editTransportData.stateNumber}
                onChange={(e) => setEditTransportData({ ...editTransportData, stateNumber: e.target.value.toUpperCase() })}
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
