/**
 * Mobile My Harbingers Page
 * User-owned cargo alert filters with mobile create/delete controls.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createHarbinger,
  deleteHarbinger,
  getMyHarbingers,
  getUserMe,
  resumeHarbinger,
} from '../../services/api';
import { useStaticData } from '../../context/StaticDataContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import { ListSkeleton } from '../components/MobileLoading';
import PullToRefresh from '../components/PullToRefresh';
import LocationSelector from '../../components/LocationSelector';
import ClubMembershipModal from '../../components/ClubMembershipModal';

const emptyCreateData = {
  fromCountry: '',
  fromRegion: '',
  fromCity: '',
  minWeight: '',
  maxWeight: '',
  vehicleTypeId: '',
  orderTypePreference: 'any',
};

function formatDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('uz-UZ');
}

function formatWeight(harbinger) {
  if (harbinger.minWeight || harbinger.maxWeight) {
    const min = harbinger.minWeight?.value
      ? `${harbinger.minWeight.value} ${harbinger.minWeight.unit || 't'}`
      : null;
    const max = harbinger.maxWeight?.value
      ? `${harbinger.maxWeight.value} ${harbinger.maxWeight.unit || 't'}`
      : null;
    return [min, max].filter(Boolean).join(' - ') || 'Har qanday vazn';
  }

  if (harbinger.weightOfCargo?.value) {
    return `${harbinger.weightOfCargo.value} ${harbinger.weightOfCargo.unit || 't'}`;
  }

  return 'Har qanday vazn';
}

function orderTypeLabel(value) {
  if (value === 'cargo_owner_only') return 'Faqat yuk egasi';
  if (value === 'logist_only') return 'Faqat logist';
  return 'Barcha buyurtmalar';
}

export default function MobileMyHarbingers() {
  const { staticData } = useStaticData();
  const [harbingers, setHarbingers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);
  const [featureLimits, setFeatureLimits] = useState(null);
  const [createSheet, setCreateSheet] = useState(false);
  const [createData, setCreateData] = useState(emptyCreateData);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showClubModal, setShowClubModal] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState({ open: false, id: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resumingId, setResumingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const vehicleById = useMemo(() => {
    return new Map((staticData?.vehicleTypes || []).map((item) => [String(item.id), item.name]));
  }, [staticData]);

  const loadHarbingers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMyHarbingers();
      if (response.code === 200) {
        setHarbingers(response.result || []);
      }
    } catch (error) {
      console.error('Failed to load harbingers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const response = await getUserMe();
      if (response.code === 200 && response.result) {
        setPermissions(response.result.permissions || null);
        setFeatureLimits(response.result.featureLimits || null);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }, []);

  useEffect(() => {
    loadHarbingers();
    loadUserData();
  }, [loadHarbingers, loadUserData]);

  const resetCreateForm = () => {
    setCreateData(emptyCreateData);
    setCreateError('');
  };

  const handleCreate = async () => {
    if (permissions && !permissions.createHarbinger) {
      setShowClubModal(true);
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError('');

      const response = await createHarbinger({
        fromLocation: {
          countryId: createData.fromCountry ? parseInt(createData.fromCountry, 10) : null,
          regionId: createData.fromRegion ? parseInt(createData.fromRegion, 10) : null,
          cityId: createData.fromCity ? parseInt(createData.fromCity, 10) : null,
        },
        minWeight: createData.minWeight ? parseFloat(createData.minWeight) : null,
        maxWeight: createData.maxWeight ? parseFloat(createData.maxWeight) : null,
        vehicleTypeId: createData.vehicleTypeId ? parseInt(createData.vehicleTypeId, 10) : null,
        orderTypePreference: createData.orderTypePreference,
      });

      if (response.code === 200) {
        setCreateSheet(false);
        resetCreateForm();
        await Promise.all([loadHarbingers(), loadUserData()]);
      } else {
        setCreateError(response.message || 'Xabarchi yaratilmadi');
      }
    } catch (error) {
      setCreateError(error.response?.data?.message || error.message || 'Xatolik yuz berdi');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSheet.id) return;

    try {
      setDeleteLoading(true);
      const response = await deleteHarbinger(deleteSheet.id);
      if (response.code === 200) {
        await Promise.all([loadHarbingers(), loadUserData()]);
      }
    } catch (error) {
      console.error('Failed to delete harbinger:', error);
    } finally {
      setDeleteLoading(false);
      setDeleteSheet({ open: false, id: null });
    }
  };

  const handleResume = async (harbingerId) => {
    if (!harbingerId || resumingId) return;
    setResumingId(harbingerId);
    setActionError('');
    try {
      const response = await resumeHarbinger(harbingerId);
      if (response.code === 200 && response.result) {
        setHarbingers((items) =>
          items.map((item) => (item.id === harbingerId ? response.result : item))
        );
      } else {
        setActionError(response.message || 'Xabarchini davom ettirib bo‘lmadi');
      }
    } catch (error) {
      setActionError(
        error.response?.data?.message || error.message || 'Xabarchini davom ettirib bo‘lmadi'
      );
    } finally {
      setResumingId(null);
    }
  };

  return (
    <>
      <TopBar title="Xabarchilarim" rightIcon="+" onRightAction={() => setCreateSheet(true)} />

      <main className="m-content">
        {featureLimits?.createHarbinger && (
          <div
            style={{
              margin: '12px 16px 4px',
              padding: 12,
              background:
                featureLimits.createHarbinger.remaining === 0 &&
                !featureLimits.createHarbinger.unlimited
                  ? '#fff5f5'
                  : '#f1f7ff',
              border: '1px solid #d9e6f8',
              borderRadius: 8,
              color: 'var(--m-text)',
              fontSize: 14,
            }}
          >
            Limit:{' '}
            {featureLimits.createHarbinger.unlimited
              ? `${featureLimits.createHarbinger.used || 0}/cheksiz`
              : `${featureLimits.createHarbinger.used || 0}/${featureLimits.createHarbinger.limit || 0}`}
          </div>
        )}

        {actionError && (
          <p className="m-form-error" role="alert" style={{ margin: '12px 16px 4px' }}>
            {actionError}
          </p>
        )}

        {loading ? (
          <ListSkeleton count={4} />
        ) : (
          <PullToRefresh onRefresh={loadHarbingers} disabled={loading}>
            {harbingers.length === 0 ? (
              <div className="m-empty">
                <div className="m-empty-icon">📣</div>
                <h3 className="m-empty-title">Xabarchi yo&apos;q</h3>
                <p className="m-empty-text">
                  Mos yuk tushganda xabar olish uchun xabarchi yarating.
                </p>
                <button className="m-btn m-btn-primary" onClick={() => setCreateSheet(true)}>
                  + Xabarchi yaratish
                </button>
              </div>
            ) : (
              <div className="m-card m-card-list">
                {harbingers.map((harbinger) => {
                  const isPaused = harbinger.status === 'paused_confirmation_required';
                  const isActive = harbinger.status === 'new' || harbinger.status === 'active';
                  const batchSize = harbinger.confirmationBatchSize || 100;
                  return (
                    <div
                      key={harbinger.id}
                      className="m-list-item"
                      style={{ alignItems: 'flex-start' }}
                    >
                      <div
                        className={`m-status-dot ${isActive ? 'new' : 'offline'}`}
                        style={{ marginTop: 7 }}
                      />
                      <div className="m-list-item-content">
                        <p className="m-list-item-title">
                          {harbinger.fullLoc1 || harbinger.loc1 || "Barcha yo'nalishlar"}
                        </p>
                        <p className="m-list-item-subtitle">
                          {vehicleById.get(String(harbinger.vehicleTypeId)) ||
                            'Barcha transportlar'}
                        </p>
                        <div className="m-list-item-meta" style={{ flexWrap: 'wrap' }}>
                          <span>{formatWeight(harbinger)}</span>
                          <span>{orderTypeLabel(harbinger.orderTypePreference)}</span>
                        </div>
                        {harbinger.createdTime && (
                          <div className="m-list-item-meta">
                            <span>{formatDate(harbinger.createdTime)}</span>
                          </div>
                        )}
                        {isActive && (
                          <div className="m-list-item-meta">
                            <span>
                              Shu soatda {harbinger.hourlyNotificationCount || 0}/
                              {harbinger.hourlyNotificationLimit || 10}
                            </span>
                          </div>
                        )}
                        {isPaused && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: 12,
                              borderRadius: 10,
                              background: '#fffbeb',
                              color: '#78350f',
                            }}
                          >
                            <strong style={{ fontSize: 14 }}>Tasdiq kutilmoqda</strong>
                            <p style={{ margin: '5px 0 10px', fontSize: 13, lineHeight: 1.4 }}>
                              {batchSize} ta xabar yuborildi. Davom ettirsangiz yana {batchSize}{' '}
                              tagacha xabar olasiz.
                            </p>
                            <button
                              type="button"
                              className="m-btn m-btn-primary m-btn-full"
                              disabled={resumingId === harbinger.id}
                              onClick={() => handleResume(harbinger.id)}
                            >
                              {resumingId === harbinger.id
                                ? 'Davom ettirilmoqda...'
                                : `Yana ${batchSize} ta xabar olish`}
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="m-btn m-btn-ghost"
                        onClick={() => setDeleteSheet({ open: true, id: harbinger.id })}
                        style={{ minHeight: 40, padding: '0 10px', color: 'var(--m-danger)' }}
                      >
                        🗑
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </PullToRefresh>
        )}
      </main>

      <BottomSheet
        isOpen={createSheet}
        onClose={() => {
          setCreateSheet(false);
          resetCreateForm();
        }}
        title="Xabarchi yaratish"
        height="full"
        footer={
          <button
            className="m-btn m-btn-primary m-btn-full m-btn-lg"
            onClick={handleCreate}
            disabled={createLoading}
          >
            {createLoading ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        }
      >
        <LocationSelector
          label="Qayerdan"
          countryValue={createData.fromCountry}
          regionValue={createData.fromRegion}
          cityValue={createData.fromCity}
          onCountryChange={(value) => setCreateData((prev) => ({ ...prev, fromCountry: value }))}
          onRegionChange={(value) => setCreateData((prev) => ({ ...prev, fromRegion: value }))}
          onCityChange={(value) => setCreateData((prev) => ({ ...prev, fromCity: value }))}
          staticData={staticData}
          variant="mobile"
        />

        <div className="m-form-row">
          <div className="m-form-group">
            <label className="m-form-label" htmlFor="mobile-harbinger-min-weight">
              Minimal vazn (t)
            </label>
            <input
              id="mobile-harbinger-min-weight"
              type="number"
              className="m-form-input"
              value={createData.minWeight}
              onChange={(e) => setCreateData((prev) => ({ ...prev, minWeight: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="m-form-group">
            <label className="m-form-label" htmlFor="mobile-harbinger-max-weight">
              Maksimal vazn (t)
            </label>
            <input
              id="mobile-harbinger-max-weight"
              type="number"
              className="m-form-input"
              value={createData.maxWeight}
              onChange={(e) => setCreateData((prev) => ({ ...prev, maxWeight: e.target.value }))}
              placeholder="0"
            />
          </div>
        </div>

        <div className="m-form-group">
          <label className="m-form-label" htmlFor="mobile-harbinger-vehicle-type">
            Transport turi
          </label>
          <select
            id="mobile-harbinger-vehicle-type"
            className="m-form-select"
            value={createData.vehicleTypeId}
            onChange={(e) => setCreateData((prev) => ({ ...prev, vehicleTypeId: e.target.value }))}
          >
            <option value="">Barcha transportlar</option>
            {staticData?.vehicleTypes?.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name}
              </option>
            ))}
          </select>
        </div>

        <div className="m-form-group">
          <label className="m-form-label" htmlFor="mobile-harbinger-order-type">
            Buyurtma turi
          </label>
          <select
            id="mobile-harbinger-order-type"
            className="m-form-select"
            value={createData.orderTypePreference}
            onChange={(e) =>
              setCreateData((prev) => ({ ...prev, orderTypePreference: e.target.value }))
            }
          >
            <option value="any">Barcha buyurtmalar</option>
            <option value="cargo_owner_only">Faqat yuk egasi buyurtmalari</option>
          </select>
        </div>

        {createError && <p className="m-form-error">{createError}</p>}
      </BottomSheet>

      <BottomSheet
        isOpen={deleteSheet.open}
        onClose={() => setDeleteSheet({ open: false, id: null })}
        title="Xabarchini o'chirish"
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗑</div>
          <p style={{ fontSize: 16, color: 'var(--m-text)', marginBottom: 24 }}>
            Bu xabarchini o&apos;chirasizmi?
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
              {deleteLoading ? "O'chirilmoqda..." : "O'chirish"}
            </button>
          </div>
        </div>
      </BottomSheet>

      <ClubMembershipModal
        isOpen={showClubModal}
        onClose={() => setShowClubModal(false)}
        featureKey="createHarbinger"
        message="Xabarchi yaratish uchun faol premium tarif kerak yoki limitingiz tugagan."
        currentLimit={featureLimits?.createHarbinger}
      />
    </>
  );
}
