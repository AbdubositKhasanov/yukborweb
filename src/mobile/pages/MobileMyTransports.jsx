/**
 * Mobile My Transports Page
 * List of user's transports with create action
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTransports, deleteTransport, createTransport } from '../../services/api';
import { useStaticData } from '../../context/StaticDataContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import MobileLoading, { ListSkeleton } from '../components/MobileLoading';
import PullToRefresh from '../components/PullToRefresh';
import LocationSelector from '../../components/LocationSelector';

export default function MobileMyTransports() {
  const navigate = useNavigate();
  const { staticData } = useStaticData();

  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create sheet
  const [createSheet, setCreateSheet] = useState(false);
  const [createData, setCreateData] = useState({
    fromCountry: '',
    fromRegion: '',
    fromCity: '',
    vehicleType: '',
    maxWeight: '',
    stateNumber: '',
    additionalPhone: '',
    description: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Delete confirmation
  const [deleteSheet, setDeleteSheet] = useState({ open: false, id: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadTransports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMyTransports();
      if (response.code === 200) {
        setTransports(response.result || []);
      }
    } catch (error) {
      console.error('Failed to load transports:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransports();
  }, [loadTransports]);

  const handleCreate = async () => {
    if (!createData.stateNumber.trim()) {
      setCreateError('Davlat raqamini kiriting');
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError('');

      // MUST match Desktop CreateTransportPage.jsx payload (camelCase)
      const response = await createTransport({
        fromLocation: {
          regionId: createData.fromRegion ? parseInt(createData.fromRegion) : null,
          countryId: createData.fromCountry ? parseInt(createData.fromCountry) : null,
          cityId: createData.fromCity ? parseInt(createData.fromCity) : null,
        },
        vehicleTypeId: createData.vehicleType
          ? (staticData?.vehicleTypes?.find(v => v.name === createData.vehicleType)?.id || null)
          : null,
        maxWeight: createData.maxWeight ? parseFloat(createData.maxWeight) : null,
        stateNumber: createData.stateNumber,
        additionalPhone: createData.additionalPhone || null,
        otherDesc: createData.description || null,
      });

      if (response.code === 200) {
        setCreateSheet(false);
        setCreateData({
          fromCountry: '',
          fromRegion: '',
          fromCity: '',
          vehicleType: '',
          maxWeight: '',
          stateNumber: '',
          additionalPhone: '',
          description: '',
        });
        await loadTransports();
      } else {
        setCreateError(response.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      setCreateError('Xatolik yuz berdi');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSheet.id) return;

    try {
      setDeleteLoading(true);
      const response = await deleteTransport(deleteSheet.id);
      if (response.code === 200) {
        await loadTransports();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setDeleteLoading(false);
      setDeleteSheet({ open: false, id: null });
    }
  };

  const openDeleteSheet = (e, id) => {
    e.stopPropagation();
    setDeleteSheet({ open: true, id });
  };

  if (loading) {
    return (
      <>
        <TopBar title="Transportlarim" rightIcon="+" onRightAction={() => setCreateSheet(true)} />
        <main className="m-content">
          <ListSkeleton count={3} />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Transportlarim" rightIcon="+" onRightAction={() => setCreateSheet(true)} />

      <main className="m-content">
        <PullToRefresh onRefresh={loadTransports} disabled={loading}>
          {transports.length === 0 ? (
            <div className="m-empty">
              <div className="m-empty-icon">🚚</div>
              <h3 className="m-empty-title">Transport yo'q</h3>
              <p className="m-empty-text">Transport qo'shing</p>
              <button className="m-btn m-btn-primary" onClick={() => setCreateSheet(true)}>
                + Transport qo'shish
              </button>
            </div>
          ) : (
            <div className="m-card m-card-list">
              {transports.map((transport) => (
                <div
                  key={transport.id || transport._id}
                  className="m-list-item"
                >
                  <div className={`m-status-dot ${transport.status === 'active' || transport.isActive ? 'online' : 'offline'}`} />
                  <div className="m-list-item-content">
                    <p className="m-list-item-title">
                      {transport.vehicleType || 'Transport'}
                      {transport.maxWeight && ` ${transport.maxWeight}t`}
                    </p>
                    <p className="m-list-item-subtitle">
                      {transport.stateNumber || 'Raqam yo\'q'}
                    </p>
                    {(transport.loc1 || transport.fromRegion) && (
                      <div className="m-list-item-meta">
                        <span>📍 {transport.loc1 || transport.fromRegion}</span>
                      </div>
                    )}
                  </div>
                  <button
                    className="m-btn m-btn-ghost"
                    onClick={(e) => openDeleteSheet(e, transport.id || transport._id)}
                    style={{ minHeight: 40, padding: '0 12px', color: 'var(--m-danger)' }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </PullToRefresh>
      </main>

      {/* Create Transport Sheet */}
      <BottomSheet
        isOpen={createSheet}
        onClose={() => {
          setCreateSheet(false);
          setCreateError('');
        }}
        title="Transport qo'shish"
        height="full"
        footer={
          <button
            className="m-btn m-btn-primary m-btn-full m-btn-lg"
            onClick={handleCreate}
            disabled={createLoading}
          >
            {createLoading ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
          </button>
        }
      >
        <div className="m-form-group">
          <label className="m-form-label required">Davlat raqami</label>
          <input
            type="text"
            className={`m-form-input ${createError && !createData.stateNumber ? 'error' : ''}`}
            placeholder="01A123BC"
            value={createData.stateNumber}
            onChange={(e) => {
              setCreateData({ ...createData, stateNumber: e.target.value.toUpperCase() });
              setCreateError('');
            }}
          />
          {createError && <p className="m-form-error">{createError}</p>}
        </div>

        <LocationSelector
          label="Joylashuv"
          countryValue={createData.fromCountry}
          regionValue={createData.fromRegion}
          cityValue={createData.fromCity}
          onCountryChange={(value) => setCreateData((prev) => ({ ...prev, fromCountry: value }))}
          onRegionChange={(value) => setCreateData((prev) => ({ ...prev, fromRegion: value }))}
          onCityChange={(value) => setCreateData((prev) => ({ ...prev, fromCity: value }))}
          staticData={staticData}
          variant="mobile"
        />

        <div className="m-form-group">
          <label className="m-form-label">Transport turi</label>
          <select
            className="m-form-select"
            value={createData.vehicleType}
            onChange={(e) => setCreateData({ ...createData, vehicleType: e.target.value })}
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
            value={createData.maxWeight}
            onChange={(e) => setCreateData({ ...createData, maxWeight: e.target.value })}
            inputMode="decimal"
          />
        </div>

        <div className="m-form-group">
          <label className="m-form-label">Qo'shimcha telefon</label>
          <input
            type="tel"
            className="m-form-input"
            placeholder="+998 90 123 45 67"
            value={createData.additionalPhone}
            onChange={(e) => setCreateData({ ...createData, additionalPhone: e.target.value })}
            inputMode="tel"
          />
        </div>

        <div className="m-form-group">
          <label className="m-form-label">Izoh</label>
          <textarea
            className="m-form-textarea"
            placeholder="Qo'shimcha ma'lumotlar..."
            value={createData.description}
            onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
            rows={3}
          />
        </div>
      </BottomSheet>

      {/* Delete Confirmation Sheet */}
      <BottomSheet
        isOpen={deleteSheet.open}
        onClose={() => setDeleteSheet({ open: false, id: null })}
        title="Transportni o'chirish"
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
          <p style={{ fontSize: 16, color: 'var(--m-text)', marginBottom: 24 }}>
            Transportni o'chirishni xohlaysizmi?
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="m-btn m-btn-secondary m-btn-lg"
              style={{ flex: 1 }}
              onClick={() => setDeleteSheet({ open: false, id: null })}
            >
              Bekor qilish
            </button>
            <button
              className="m-btn m-btn-danger m-btn-lg"
              style={{ flex: 1 }}
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'O\'chirilmoqda...' : 'O\'chirish'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
