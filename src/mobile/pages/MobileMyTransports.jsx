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

export default function MobileMyTransports() {
  const navigate = useNavigate();
  const { staticData } = useStaticData();

  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create sheet
  const [createSheet, setCreateSheet] = useState(false);
  const [createData, setCreateData] = useState({
    fromRegion: '',
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

      const response = await createTransport({
        from_region: createData.fromRegion || undefined,
        vehicle_type: createData.vehicleType || undefined,
        max_weight: createData.maxWeight ? parseFloat(createData.maxWeight) : undefined,
        state_number: createData.stateNumber,
        additional_phone: createData.additionalPhone || undefined,
        description: createData.description || undefined,
      });

      if (response.code === 200) {
        setCreateSheet(false);
        setCreateData({
          fromRegion: '',
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
                <div className={`m-status-dot ${transport.isActive ? 'online' : 'offline'}`} />
                <div className="m-list-item-content">
                  <p className="m-list-item-title">
                    {transport.vehicleType || 'Transport'}
                    {transport.maxWeight && ` ${transport.maxWeight}t`}
                  </p>
                  <p className="m-list-item-subtitle">
                    {transport.stateNumber || 'Raqam yo\'q'}
                  </p>
                  {transport.fromRegion && (
                    <div className="m-list-item-meta">
                      <span>📍 {transport.fromRegion}</span>
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

        <div className="m-form-group">
          <label className="m-form-label">Joylashuv</label>
          <select
            className="m-form-select"
            value={createData.fromRegion}
            onChange={(e) => setCreateData({ ...createData, fromRegion: e.target.value })}
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
