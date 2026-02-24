/**
 * Mobile Driver Detail Page
 * Full driver info with status toggle, transport management, and find cargo action
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMyInvitedUsers, updateCounterpartyDriverStatus, createCounterpartyTransport, updateCounterpartyTransportForm } from '../../services/api';
import { useStaticData } from '../../context/StaticDataContext';
import { formatBalance, getBalanceColor } from '../../utils/formatBalance';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import MobileLoading from '../components/MobileLoading';

export default function MobileDriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { staticData } = useStaticData();

  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState('');

  // Transport sheet
  const [transportSheet, setTransportSheet] = useState(false);
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

  useEffect(() => {
    loadDriver();
  }, [id]);

  const loadDriver = async () => {
    try {
      setLoading(true);
      const response = await getMyInvitedUsers();
      if (response.code === 200) {
        const found = response.result?.find(
          (d) => String(d.chatId || d.id || d._id) === String(id)
        );
        if (found) {
          setDriver(found);
        } else {
          setError('Haydovchi topilmadi');
        }
      }
    } catch (error) {
      setError('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (newStatus) => {
    if (!driver) return;

    try {
      setStatusUpdating(true);
      const response = await updateCounterpartyDriverStatus(
        driver.chatId || driver.id,
        newStatus
      );

      if (response.code === 200) {
        setDriver((prev) => ({ ...prev, isBusy: !newStatus }));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleCall = () => {
    if (driver?.phone || driver?.phoneNumber) {
      window.location.href = `tel:${driver.phone || driver.phoneNumber}`;
    }
  };

  const handleCopyPhone = () => {
    const phone = driver?.phone || driver?.phoneNumber;
    if (phone) {
      navigator.clipboard.writeText(phone);
    }
  };

  const handleFindCargo = () => {
    // MUST match Desktop MyDriversPage.jsx handleFindOrder EXACTLY
    const transportForm = driver?.driverTransportForm || driver?.transport;

    // Prepare filters based on driver's transport data - matches Desktop
    const filters = {
      fromCountry: transportForm?.fromLocation?.countryId,
      fromRegion: transportForm?.fromLocation?.regionId,
      fromCity: transportForm?.fromLocation?.cityId,
      vehicleTypeId: transportForm?.vehicleTypeId,
      maxWeight: transportForm?.maxWeight,
    };

    // Navigate to search page (cargos) with driver filters - matches Desktop keys
    navigate('/mobile', {
      state: {
        fromDriver: true,          // Key must match Desktop
        driverId: driver.chatId,   // Must be chatId like Desktop
        driverName: driver.name || driver.fullName || driver.full_name,
        filters: filters,
      },
    });
  };

  // Transport handlers
  const handleOpenTransportSheet = () => {
    const transportForm = driver?.transport || driver?.driverTransportForm;

    if (transportForm) {
      setTransportData({
        fromRegion: transportForm.fromLocation?.regionId?.toString() || transportForm.fromRegion || '',
        vehicleType: transportForm.vehicleType || '',
        maxWeight: transportForm.maxWeight?.toString() || '',
        stateNumber: transportForm.stateNumber || '',
        additionalPhone: transportForm.additionalPhone || '',
        description: transportForm.otherDesc || transportForm.description || '',
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

    setTransportSheet(true);
    setTransportError('');
  };

  const handleSaveTransport = async () => {
    if (!driver) return;

    const hasExistingTransport = driver.transport || driver.driverTransportForm;

    try {
      setTransportLoading(true);
      setTransportError('');

      // MUST match Desktop CounterpartyTransportModal.jsx payload (camelCase)
      const vehicleType = staticData?.vehicleTypes?.find(v => v.name === transportData.vehicleType);
      const payload = {
        fromLocation: {
          regionId: transportData.fromRegion ? parseInt(transportData.fromRegion) : null,
          countryId: null,
          cityId: null,
        },
        maxWeight: transportData.maxWeight ? parseFloat(transportData.maxWeight) : null,
        vehicleTypeId: vehicleType ? vehicleType.id : null,
        additionalContact: transportData.additionalPhone || null,
        otherDesc: transportData.description || null,
        stateNumber: transportData.stateNumber?.trim() || null,
      };

      let response;
      const driverId = driver.chatId || driver.id;
      const transportForm = driver.transport || driver.driverTransportForm;
      if (hasExistingTransport && transportForm?.id) {
        response = await updateCounterpartyTransportForm(transportForm.id, driverId, payload);
      } else {
        response = await createCounterpartyTransport(driverId, payload);
      }

      if (response.code === 200) {
        setTransportSheet(false);
        await loadDriver(); // Reload to get updated transport
      } else {
        setTransportError(response.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      setTransportError('Xatolik yuz berdi');
    } finally {
      setTransportLoading(false);
    }
  };

  const hasTransport = driver?.transport || driver?.driverTransportForm;

  if (loading) {
    return (
      <>
        <TopBar title="Haydovchi" showBack />
        <MobileLoading fullScreen />
      </>
    );
  }

  if (error || !driver) {
    return (
      <>
        <TopBar title="Haydovchi" showBack />
        <main className="m-content m-content-padded">
          <div className="m-empty">
            <div className="m-empty-icon">❌</div>
            <h3 className="m-empty-title">{error || 'Haydovchi topilmadi'}</h3>
            <button className="m-btn m-btn-primary" onClick={() => navigate('/mobile/drivers')}>
              Orqaga
            </button>
          </div>
        </main>
      </>
    );
  }

  const isOnline = driver.isActive || driver.is_active;
  const isBusy = driver.isBusy || driver.is_busy;
  const balance = driver.balance ?? 0;

  return (
    <>
      <TopBar
        title={driver.fullName || driver.full_name || 'Haydovchi'}
        showBack
        rightIcon={isOnline ? '🟢' : '⚫'}
      />

      <main className="m-content m-content-padded" style={{ paddingBottom: 100 }}>
        {/* Phone */}
        <div className="m-detail-section">
          <h2 className="m-detail-section-title">📞 Telefon</h2>
          <div className="m-inline-edit" onClick={handleCall}>
            <div className="m-inline-edit-content">
              <div className="m-inline-edit-value" style={{ fontSize: 20 }}>
                {driver.phone || driver.phoneNumber || 'Telefon yo\'q'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="m-btn m-btn-secondary"
                onClick={(e) => { e.stopPropagation(); handleCopyPhone(); }}
                style={{ minHeight: 40, padding: '0 12px' }}
              >
                📋
              </button>
              <button
                className="m-btn m-btn-success"
                onClick={(e) => { e.stopPropagation(); handleCall(); }}
                style={{ minHeight: 40, padding: '0 12px' }}
              >
                📞
              </button>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="m-detail-section">
          <h2 className="m-detail-section-title">💰 Balans</h2>
          <div
            className="m-balance"
            style={{ margin: 0, padding: 16, textAlign: 'left' }}
          >
            <div
              className="m-balance-amount"
              style={{ fontSize: 24, color: getBalanceColor(balance) }}
            >
              {formatBalance(balance)}
            </div>
          </div>
        </div>

        {/* Transport */}
        <div className="m-detail-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 className="m-detail-section-title" style={{ margin: 0 }}>🚚 Transport</h2>
            <button
              className="m-btn m-btn-secondary"
              onClick={handleOpenTransportSheet}
              style={{ padding: '4px 12px', fontSize: 13, minHeight: 28 }}
            >
              {hasTransport ? '✎ Tahrirlash' : '+ Qo\'shish'}
            </button>
          </div>
          {hasTransport ? (
            <div className="m-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(driver.transport?.vehicleType || driver.driverTransportForm?.vehicleType) && (
                  <div style={{ fontSize: 16, fontWeight: 500 }}>
                    {driver.transport?.vehicleType || driver.driverTransportForm?.vehicleType}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 16, color: 'var(--m-text-secondary)', flexWrap: 'wrap' }}>
                  {(driver.transport?.maxWeight || driver.driverTransportForm?.maxWeight) && (
                    <span>⚖️ {driver.transport?.maxWeight || driver.driverTransportForm?.maxWeight}t</span>
                  )}
                  {(driver.transport?.stateNumber || driver.driverTransportForm?.stateNumber) && (
                    <span>🔢 {driver.transport?.stateNumber || driver.driverTransportForm?.stateNumber}</span>
                  )}
                  {(driver.transport?.loc1 || driver.driverTransportForm?.loc1) && (
                    <span>📍 {driver.transport?.loc1 || driver.driverTransportForm?.loc1}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 16, background: 'var(--m-bg)', borderRadius: 8, color: 'var(--m-text-muted)', textAlign: 'center' }}>
              Transport qo'shilmagan
            </div>
          )}
        </div>

        {/* Status toggle */}
        <div className="m-detail-section">
          <h2 className="m-detail-section-title">Holat</h2>
          <div className="m-segmented" style={{ opacity: statusUpdating ? 0.6 : 1 }}>
            <button
              className={`m-segmented-btn ${!isBusy ? 'active' : ''}`}
              onClick={() => handleStatusToggle(true)}
              disabled={statusUpdating}
            >
              Bo'sh
            </button>
            <button
              className={`m-segmented-btn ${isBusy ? 'active' : ''}`}
              onClick={() => handleStatusToggle(false)}
              disabled={statusUpdating}
            >
              Band
            </button>
          </div>
        </div>
      </main>

      {/* Find cargo action */}
      <div className="m-action-bar">
        <button className="m-btn m-btn-primary m-btn-lg" onClick={handleFindCargo} style={{ flex: 1 }}>
          🔍 Yuk topish
        </button>
      </div>

      {/* Transport Sheet */}
      <BottomSheet
        isOpen={transportSheet}
        onClose={() => {
          setTransportSheet(false);
          setTransportError('');
        }}
        title={hasTransport ? '🚚 Transportni tahrirlash' : '🚚 Transport qo\'shish'}
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
