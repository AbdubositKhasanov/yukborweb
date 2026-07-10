/**
 * Mobile Create Order Page
 * 3-step wizard: Cargo Info → Route → Price & Details
 * MUST use identical payload structure as Desktop CreateOrderPage.jsx
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaticData } from '../../context/StaticDataContext';
import { createOrder, getBroadcastStatus, getLocationsAndVehicles, updateOrderOwnerStatusPrompt } from '../../services/api';
import { isBroadcastFinished, normalizeBroadcastStatus } from '../../utils/orderText';
import TopBar from '../components/TopBar';
import LocationSelector, { getManualLocationName, toOptionalLocationId } from '../../components/LocationSelector';

const STEPS = [
  { id: 1, title: 'Yuk ma\'lumotlari' },
  { id: 2, title: 'Marshrut' },
  { id: 3, title: 'Narx va izoh' },
];

const buildRequestLocation = (countryValue, regionValue, cityValue) => ({
  cityId: toOptionalLocationId(cityValue),
  regionId: toOptionalLocationId(regionValue),
  countryId: toOptionalLocationId(countryValue),
  customName: getManualLocationName(regionValue, cityValue) || null,
});

const hasRequiredLocation = (countryValue, regionValue, cityValue) => {
  return Boolean(
    toOptionalLocationId(countryValue) &&
      (toOptionalLocationId(regionValue) || getManualLocationName(regionValue, cityValue))
  );
};

export default function MobileCreateOrder() {
  const navigate = useNavigate();
  const { staticData: contextStaticData } = useStaticData();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [errors, setErrors] = useState({});
  const [staticData, setStaticData] = useState(null);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [broadcastStatus, setBroadcastStatus] = useState(null);
  const [ownerPromptAvailable, setOwnerPromptAvailable] = useState(false);
  const [ownerPromptSaving, setOwnerPromptSaving] = useState(false);
  const [ownerPromptChoice, setOwnerPromptChoice] = useState(null);
  const [ownerPromptError, setOwnerPromptError] = useState('');

  // Form data - MUST match Desktop CreateOrderPage.jsx structure
  const [formData, setFormData] = useState({
    // Step 1
    cargoName: '',
    weight: '',
    vehicleTypeId: '',  // ID, not string name - matches Desktop
    // Step 2 - Use countryId/regionId/cityId like Desktop
    fromCountry: '',
    fromRegion: '',
    fromCity: '',
    toCountry: '',
    toRegion: '',
    toCity: '',
    // Step 3
    priceUzs: '',
    additionalPhone: '',
    description: '',
  });

  // Load static data exactly like Desktop does
  useEffect(() => {
    loadStaticData();
  }, []);

  useEffect(() => {
    const broadcastId = broadcastStatus?.broadcastId;
    if (!broadcastId || isBroadcastFinished(broadcastStatus)) return;

    let cancelled = false;
    const pollStatus = async () => {
      try {
        const response = await getBroadcastStatus(broadcastId);
        if (!cancelled) {
          setBroadcastStatus(normalizeBroadcastStatus(response));
        }
      } catch (_) {
        // Polling xatosi yaratish oqimiga ta'sir qilmasin.
      }
    };

    const interval = setInterval(pollStatus, 2500);
    pollStatus();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [broadcastStatus?.broadcastId, broadcastStatus?.status]);

  const loadStaticData = async () => {
    setLoadingData(true);
    try {
      const response = await getLocationsAndVehicles();
      if (response.code === 200) {
        setStaticData(response.result);
      }
    } catch (error) {
      console.error('Failed to load static data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Validate step - matches Desktop validation logic
  const validateStep = (stepNum) => {
    const newErrors = {};

    if (stepNum === 1) {
      if (!formData.cargoName.trim()) newErrors.cargoName = 'Yuk nomini kiriting';
      if (!formData.weight || parseFloat(formData.weight) <= 0) newErrors.weight = 'To\'g\'ri og\'irlikni kiriting';
      if (!formData.vehicleTypeId) newErrors.vehicleTypeId = 'Transport turini tanlang';
    }

    if (stepNum === 2) {
      // Desktop bilan bir xil: davlat + viloyat yoki qo'lda kiritilgan joy.
      if (!hasRequiredLocation(formData.fromCountry, formData.fromRegion, formData.fromCity)) {
        newErrors.fromLocation = 'Qayerdan joylashuvini tanlang yoki yozing';
      }
      if (!hasRequiredLocation(formData.toCountry, formData.toRegion, formData.toCity)) {
        newErrors.toLocation = 'Qayerga joylashuvini tanlang yoki yozing';
      }
    }

    if (stepNum === 3) {
      if (!formData.priceUzs || parseFloat(formData.priceUzs) <= 0) {
        newErrors.priceUzs = 'Buyurtma narxini kiriting';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);

    try {
      // MUST match Desktop CreateOrderPage.jsx payload EXACTLY
      const orderData = {
        cargoName: formData.cargoName.trim(),
        additionalPhone: formData.additionalPhone.trim() || null,
        description: formData.description.trim() || null,
        fromLocation: buildRequestLocation(formData.fromCountry, formData.fromRegion, formData.fromCity),
        toLocation: buildRequestLocation(formData.toCountry, formData.toRegion, formData.toCity),
        weight: parseFloat(formData.weight),
        vehicleTypeId: parseInt(formData.vehicleTypeId),
        priceUzs: parseInt(formData.priceUzs),
      };

      const response = await createOrder(orderData);

      if (response.code === 200) {
        setCreatedOrder(response.result?.order || orderData);
        setBroadcastStatus(normalizeBroadcastStatus(response.result?.broadcast));
        setOwnerPromptAvailable(Boolean(response.result?.ownerStatusPromptAvailable));
        setOwnerPromptChoice(null);
        setOwnerPromptError('');
      } else {
        setErrors({ submit: response.message || 'Buyurtma yaratishda xatolik' });
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      setErrors({ submit: error.response?.data?.message || 'Xatolik yuz berdi' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnother = () => {
    setStep(1);
    setFormData({
      cargoName: '',
      weight: '',
      vehicleTypeId: '',
      fromCountry: '',
      fromRegion: '',
      fromCity: '',
      toCountry: '',
      toRegion: '',
      toCity: '',
      priceUzs: '',
      additionalPhone: '',
      description: '',
    });
    setErrors({});
    setCreatedOrder(null);
    setBroadcastStatus(null);
    setOwnerPromptAvailable(false);
    setOwnerPromptSaving(false);
    setOwnerPromptChoice(null);
    setOwnerPromptError('');
  };

  const handleOwnerPromptChoice = async (enabled) => {
    const orderId = createdOrder?.id;
    if (!orderId || ownerPromptSaving || ownerPromptChoice !== null) return;

    setOwnerPromptSaving(true);
    setOwnerPromptError('');
    try {
      const response = await updateOrderOwnerStatusPrompt(orderId, enabled);
      if (response.code === 200) {
        const savedEnabled = Boolean(response.result?.ownerStatusPromptEnabled);
        setCreatedOrder((prev) => response.result || prev);
        setOwnerPromptChoice(savedEnabled ? 'enabled' : 'disabled');
        if (enabled && !savedEnabled && response.message) {
          setOwnerPromptError(response.message);
        }
      } else {
        setOwnerPromptError(response.message || 'Sozlamani saqlab bo‘lmadi');
      }
    } catch (error) {
      setOwnerPromptError(error.response?.data?.message || 'Sozlamani saqlab bo‘lmadi');
    } finally {
      setOwnerPromptSaving(false);
    }
  };

  const renderOwnerStatusPrompt = () => {
    if (!ownerPromptAvailable || !createdOrder?.id) return null;

    const enabled = ownerPromptChoice === 'enabled';
    const disabled = ownerPromptChoice === 'disabled';

    return (
      <div style={{
        marginTop: 16,
        padding: 14,
        borderRadius: 8,
        background: enabled ? '#eef7f0' : disabled ? '#f7f8fa' : '#f4f8ff',
        border: '1px solid rgba(25, 118, 210, 0.16)',
        textAlign: 'left',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--m-text)', marginBottom: 6 }}>
          Yuk holatini har soatda so‘raylikmi?
        </div>
        <div style={{ fontSize: 13, color: 'var(--m-text-secondary)', lineHeight: 1.45 }}>
          Bot sizdan yuk yopilganmi yoki hali ochiqmi deb so‘raydi. Shu joydan qayta tarqatish yoki yopishni tanlaysiz.
        </div>

        {ownerPromptChoice === null ? (
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            <button
              className="m-btn m-btn-primary m-btn-full"
              disabled={ownerPromptSaving}
              onClick={() => handleOwnerPromptChoice(true)}
            >
              Ha, so‘rab turing
            </button>
            <button
              className="m-btn m-btn-secondary m-btn-full"
              disabled={ownerPromptSaving}
              onClick={() => handleOwnerPromptChoice(false)}
            >
              Yo‘q, kerak emas
            </button>
          </div>
        ) : (
          <div style={{
            marginTop: 10,
            fontSize: 13,
            fontWeight: 700,
            color: enabled ? '#137333' : 'var(--m-text-secondary)',
            lineHeight: 1.4,
          }}>
            {enabled ? '✅ Eslatma yoqildi. Bir soatdan keyin bot holatini so‘raydi.' : '⛔️ Eslatma yuborilmaydi.'}
          </div>
        )}

        {ownerPromptError && (
          <div style={{ marginTop: 10, color: 'var(--m-danger)', fontSize: 13, lineHeight: 1.4 }}>
            {ownerPromptError}
          </div>
        )}
      </div>
    );
  };

  const renderBroadcastStatus = () => {
    if (!broadcastStatus) return null;

    const isFailed = broadcastStatus.status === 'failed';
    const isCompleted = broadcastStatus.status === 'completed';
    const sentGroups = broadcastStatus.sentGroups || [];
    const failedGroups = broadcastStatus.failedGroups || [];
    const totalText = broadcastStatus.totalGroups > 0
      ? `${broadcastStatus.groupsSent}/${broadcastStatus.totalGroups}`
      : `${broadcastStatus.groupsSent}`;
    const titleText = isFailed
      ? (broadcastStatus.groupsSent > 0
        ? `⚠️ ${broadcastStatus.groupsSent} ta guruhga yuborildi`
        : '📡 Guruhlarga tarqatish boshlanmadi')
      : `✅ ${broadcastStatus.groupsSent} ta guruhga yuborildi`;
    const subtitleText = isFailed
      ? 'Tarqatish to\'xtadi.'
      : (isCompleted ? 'Tarqatish yakunlandi.' : 'Tarqatish davom etyapti.');

    return (
      <div style={{
        padding: 14,
        borderRadius: 8,
        background: isFailed ? '#fff8e1' : '#eef7f0',
        color: 'var(--m-text)',
        textAlign: 'left',
        marginTop: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, lineHeight: 1.35 }}>
              {titleText}
            </div>
            <div style={{ fontSize: 13, color: 'var(--m-text-secondary)', lineHeight: 1.4 }}>
              {subtitleText}
            </div>
          </div>
          <div style={{
            flex: '0 0 auto',
            padding: '4px 8px',
            borderRadius: 999,
            background: isFailed ? 'rgba(251,188,4,0.2)' : 'rgba(52,168,83,0.16)',
            color: isFailed ? '#856404' : '#137333',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.2,
          }}>
            {totalText}
          </div>
        </div>

        {sentGroups.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-text)', marginBottom: 8 }}>
              Yuborilgan guruhlar
            </div>
            <div style={{
              maxHeight: 180,
              overflowY: 'auto',
              borderTop: '1px solid rgba(52,168,83,0.22)',
              borderBottom: '1px solid rgba(52,168,83,0.22)',
            }}>
              {sentGroups.map((group, index) => {
                const title = group.title || group.username || `Guruh #${group.groupId || index + 1}`;
                const username = group.username ? `@${String(group.username).replace(/^@/, '')}` : '';

                return (
                  <div
                    key={`${group.groupId || title}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '9px 0',
                      borderBottom: index === sentGroups.length - 1 ? 'none' : '1px solid rgba(52,168,83,0.14)',
                    }}
                  >
                    <span style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: 'var(--m-success)',
                      flex: '0 0 auto',
                      marginTop: 6,
                    }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.35,
                        color: 'var(--m-text)',
                        wordBreak: 'break-word',
                      }}>
                        {title}
                      </div>
                      {username && (
                        <div style={{
                          fontSize: 12,
                          color: 'var(--m-text-secondary)',
                          marginTop: 2,
                          wordBreak: 'break-word',
                        }}>
                          {username}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {sentGroups.length === 0 && !isFailed && (
          <div style={{ fontSize: 13, color: 'var(--m-text-secondary)', marginTop: 10 }}>
            Guruh nomlari yuborilishi bilan chiqadi.
          </div>
        )}

        {failedGroups.length > 0 && (
          <div style={{
            marginTop: 10,
            fontSize: 12,
            color: '#856404',
            lineHeight: 1.4,
          }}>
            {failedGroups.length} ta guruhga yuborilmadi yoki o'tkazib yuborildi.
          </div>
        )}
      </div>
    );
  };

  // Get regions for selected country - matches Desktop
  const getFromRegions = () => {
    if (!formData.fromCountry || !staticData?.regions) return [];
    return staticData.regions.filter((r) => r.countryId === parseInt(formData.fromCountry));
  };

  const getToRegions = () => {
    if (!formData.toCountry || !staticData?.regions) return [];
    return staticData.regions.filter((r) => r.countryId === parseInt(formData.toCountry));
  };

  // Get cities for selected region - matches Desktop
  const getFromCities = () => {
    if (!formData.fromRegion || !staticData?.cities) return [];
    return staticData.cities.filter((c) => c.regionId === parseInt(formData.fromRegion));
  };

  const getToCities = () => {
    if (!formData.toRegion || !staticData?.cities) return [];
    return staticData.cities.filter((c) => c.regionId === parseInt(formData.toRegion));
  };

  // Progress dots
  const renderProgress = () => (
    <div className="m-progress-dots">
      {STEPS.map((s, index) => (
        <React.Fragment key={s.id}>
          <div
            className={`m-progress-dot ${step === s.id ? 'active' : ''} ${step > s.id ? 'completed' : ''}`}
          />
          {index < STEPS.length - 1 && (
            <div className={`m-progress-line ${step > s.id ? 'completed' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // Show loading while static data loads
  if (loadingData) {
    return (
      <>
        <TopBar title="Yangi buyurtma" showBack onBack={handleBack} />
        <main className="m-content m-content-padded" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="m-spinner" style={{ width: 32, height: 32 }} />
        </main>
      </>
    );
  }

  if (createdOrder) {
    return (
      <>
        <TopBar title="Yangi buyurtma" showBack onBack={() => navigate('/mobile/orders')} />
        <main className="m-content m-content-padded">
          <div className="m-card" style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 56, color: 'var(--m-success)', marginBottom: 12 }}>✓</div>
            <h1 className="m-detail-title" style={{ marginBottom: 8 }}>Yuk yaratildi</h1>
            <p style={{ color: 'var(--m-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Buyurtma saqlandi va tarqatish holati quyida ko'rinadi.
            </p>
            {renderBroadcastStatus()}
            {renderOwnerStatusPrompt()}
            <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
              <button className="m-btn m-btn-primary m-btn-lg m-btn-full" onClick={() => navigate('/mobile/orders', { replace: true })}>
                Buyurtmalarim
              </button>
              <button className="m-btn m-btn-secondary m-btn-lg m-btn-full" onClick={handleCreateAnother}>
                Yana yuk qo'shish
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Yangi buyurtma"
        showBack
        onBack={handleBack}
      />

      <main className="m-content m-content-padded">
        {renderProgress()}

        {/* Step 1: Cargo Info - matches Desktop */}
        {step === 1 && (
          <div>
            <div className="m-form-group">
              <label className="m-form-label required">Yuk nomi</label>
              <input
                type="text"
                className={`m-form-input ${errors.cargoName ? 'error' : ''}`}
                placeholder="Masalan: Meva, Mebel, Qurilish materiallari"
                value={formData.cargoName}
                onChange={(e) => updateField('cargoName', e.target.value)}
              />
              {errors.cargoName && <p className="m-form-error">{errors.cargoName}</p>}
            </div>

            <div className="m-form-group">
              <label className="m-form-label required">Og'irligi (tonna)</label>
              <input
                type="number"
                className={`m-form-input ${errors.weight ? 'error' : ''}`}
                placeholder="Masalan: 5"
                value={formData.weight}
                onChange={(e) => updateField('weight', e.target.value)}
                inputMode="decimal"
                step="0.1"
                min="0.1"
              />
              {errors.weight && <p className="m-form-error">{errors.weight}</p>}
            </div>

            <div className="m-form-group">
              <label className="m-form-label required">Transport turi</label>
              <select
                className={`m-form-select ${errors.vehicleTypeId ? 'error' : ''}`}
                value={formData.vehicleTypeId}
                onChange={(e) => updateField('vehicleTypeId', e.target.value)}
              >
                <option value="">Transport turini tanlang</option>
                {staticData?.vehicleTypes?.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </select>
              {errors.vehicleTypeId && <p className="m-form-error">{errors.vehicleTypeId}</p>}
            </div>
          </div>
        )}

        {/* Step 2: Route - matches Desktop LocationSelector */}
        {step === 2 && (
          <div>
            <LocationSelector
              label="Qayerdan"
              countryValue={formData.fromCountry}
              regionValue={formData.fromRegion}
              cityValue={formData.fromCity}
              onCountryChange={(value) => updateField('fromCountry', value)}
              onRegionChange={(value) => updateField('fromRegion', value)}
              onCityChange={(value) => updateField('fromCity', value)}
              staticData={staticData}
              variant="mobile"
              required
              error={Boolean(errors.fromLocation)}
              allowCustom
            />
            {errors.fromLocation && <p className="m-form-error">{errors.fromLocation}</p>}

            <div className="m-divider" />

            <LocationSelector
              label="Qayerga"
              countryValue={formData.toCountry}
              regionValue={formData.toRegion}
              cityValue={formData.toCity}
              onCountryChange={(value) => updateField('toCountry', value)}
              onRegionChange={(value) => updateField('toRegion', value)}
              onCityChange={(value) => updateField('toCity', value)}
              staticData={staticData}
              variant="mobile"
              required
              error={Boolean(errors.toLocation)}
              allowCustom
            />
            {errors.toLocation && <p className="m-form-error">{errors.toLocation}</p>}
          </div>
        )}

        {/* Step 3: Price & Details */}
        {step === 3 && (
          <div>
            <div className="m-form-group">
              <label className="m-form-label required">Narxi (so'm)</label>
              <input
                type="number"
                className={`m-form-input ${errors.priceUzs ? 'error' : ''}`}
                placeholder="0"
                value={formData.priceUzs}
                onChange={(e) => updateField('priceUzs', e.target.value)}
                inputMode="numeric"
              />
              {errors.priceUzs && <p className="m-form-error">{errors.priceUzs}</p>}
            </div>

            <div className="m-form-group">
              <label className="m-form-label">Qo'shimcha telefon</label>
              <input
                type="tel"
                className="m-form-input"
                placeholder="+998 90 123 45 67"
                value={formData.additionalPhone}
                onChange={(e) => updateField('additionalPhone', e.target.value)}
                inputMode="tel"
              />
            </div>

            <div className="m-form-group">
              <label className="m-form-label">Izoh</label>
              <textarea
                className="m-form-textarea"
                placeholder="Qo'shimcha ma'lumotlar..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
              />
            </div>

            {errors.submit && (
              <div style={{ padding: 12, background: '#ffebee', borderRadius: 8, marginBottom: 16 }}>
                <p style={{ color: 'var(--m-danger)', margin: 0, fontSize: 14 }}>{errors.submit}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ marginTop: 32, paddingBottom: 24 }}>
          {step < 3 ? (
            <button
              className="m-btn m-btn-primary m-btn-full m-btn-lg"
              onClick={handleNext}
            >
              Keyingi →
            </button>
          ) : (
            <button
              className="m-btn m-btn-success m-btn-full m-btn-lg"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="m-spinner" style={{ width: 20, height: 20 }} />
                  Yaratilmoqda...
                </>
              ) : (
                '✓ Yaratish'
              )}
            </button>
          )}
        </div>
      </main>
    </>
  );
}
