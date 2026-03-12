/**
 * Mobile Cargo Detail Page
 * Full cargo information with action buttons at bottom
 * Includes offer to driver functionality for internal dispatchers
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCargoDetails, requestCargoPhone, getUserMe, getMyInvitedUsers, offerForDriver } from '../../services/api';
import { formatTimeAgo } from '../../utils/formatTime';
import { useMobileAuth } from '../context/MobileAuthContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import MobileLoading from '../components/MobileLoading';

export default function MobileCargoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useMobileAuth();

  const [cargo, setCargo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneSheet, setPhoneSheet] = useState({ open: false, phone: '' });
  const [error, setError] = useState('');

  // User and permission state
  const [permissions, setPermissions] = useState(null);

  // Offer to driver state
  const [offerSheet, setOfferSheet] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [offering, setOffering] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [offerError, setOfferError] = useState('');

  // Load user data
  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated]);

  const loadUserData = async () => {
    try {
      const response = await getUserMe();
      if (response.code === 200 && response.result) {
        setPermissions(response.result.permissions || null);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  useEffect(() => {
    loadCargo();
  }, [id]);

  const loadCargo = async () => {
    try {
      setLoading(true);
      const response = await getCargoDetails(id);
      if (response.code === 200) {
        setCargo(response.result);
      } else {
        setError('Yuk topilmadi');
      }
    } catch (error) {
      setError('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPhone = async () => {
    if (!isAuthenticated) {
      navigate('/mobile/login', { state: { from: { pathname: `/mobile/cargo/${id}` } } });
      return;
    }

    try {
      setPhoneLoading(true);
      const response = await requestCargoPhone(id);
      if (response.code === 200 && response.result) {
        // Desktop pattern: additionalPhone has priority over phone
        const phone = response.result.additionalPhone || response.result.phone;
        if (phone) {
          setPhoneSheet({ open: true, phone });
        } else {
          setError('Telefon raqam topilmadi');
        }
      } else {
        setError('Telefon raqamni olishda xatolik');
      }
    } catch (error) {
      setError('Xatolik yuz berdi');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleCall = () => {
    if (phoneSheet.phone) {
      window.location.href = `tel:${phoneSheet.phone}`;
    }
  };

  const handleCopyPhone = () => {
    if (phoneSheet.phone) {
      navigator.clipboard.writeText(phoneSheet.phone);
    }
  };

  // Offer to driver handlers
  const handleOpenOfferSheet = async () => {
    setOfferSheet(true);
    setOfferPrice(cargo?.priceUzs?.toString() || '');
    setSelectedDriver(null);
    setOfferError('');
    setOfferSuccess(false);

    // Load drivers
    try {
      setDriversLoading(true);
      const response = await getMyInvitedUsers();
      if (response.code === 200) {
        setDrivers(response.result || []);
      }
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setDriversLoading(false);
    }
  };

  const handleSendOffer = async () => {
    if (!selectedDriver) {
      setOfferError('Haydovchini tanlang');
      return;
    }

    const price = parseFloat(offerPrice);
    if (!price || price <= 0) {
      setOfferError('Narxni kiriting');
      return;
    }

    try {
      setOffering(true);
      setOfferError('');

      const driverId = selectedDriver.chatId || selectedDriver.id;
      const response = await offerForDriver(driverId, cargo.id || cargo._id, price);

      if (response.code === 200) {
        setOfferSuccess(true);
        setTimeout(() => {
          setOfferSheet(false);
          setOfferSuccess(false);
        }, 1500);
      } else {
        setOfferError(response.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      setOfferError('Xatolik yuz berdi');
    } finally {
      setOffering(false);
    }
  };

  // Format price
  const formatPrice = (price) => {
    if (!price) return '';
    return Number(price).toLocaleString('uz-UZ').replace(/,/g, ' ') + ' so\'m';
  };

  if (loading) {
    return (
      <>
        <TopBar title="Yuk" showBack />
        <MobileLoading fullScreen />
      </>
    );
  }

  if (error || !cargo) {
    return (
      <>
        <TopBar title="Yuk" showBack />
        <main className="m-content m-content-padded">
          <div className="m-empty">
            <div className="m-empty-icon">❌</div>
            <h3 className="m-empty-title">{error || 'Yuk topilmadi'}</h3>
            <button className="m-btn m-btn-primary" onClick={() => navigate('/mobile')}>
              Orqaga
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Yuk tafsilotlari" showBack />

      <main className="m-content m-content-padded" style={{ paddingBottom: 100 }}>
        {/* Cargo name and badge */}
        <div className="m-detail-header">
          <h1 className="m-detail-title">{cargo.cargoName || cargo.cargo_name || 'Yuk'}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            {cargo.weight && (
              <span className="m-badge m-badge-new">{cargo.weight} tonna</span>
            )}
            {cargo.vehicleType && (
              <span className="m-badge" style={{ background: '#e3f2fd', color: '#1565c0' }}>
                {cargo.vehicleType}
              </span>
            )}
          </div>
        </div>

        {/* Route section */}
        <div className="m-detail-section">
          <h2 className="m-detail-section-title">📍 Marshrut</h2>
          <div className="m-route">
            <div className="m-route-point">
              <div className="m-route-dot" style={{ background: 'var(--m-success)' }} />
              <span className="m-route-text">
                {cargo.fromCity || cargo.fromRegion || 'Noma\'lum'}
              </span>
            </div>
            <div className="m-route-line" />
            <div className="m-route-point">
              <div className="m-route-dot" style={{ background: 'var(--m-danger)' }} />
              <span className="m-route-text">
                {cargo.toCity || cargo.toRegion || 'Noma\'lum'}
              </span>
            </div>
          </div>
        </div>

        {/* Price section */}
        {cargo.priceUzs && (
          <div className="m-detail-section">
            <h2 className="m-detail-section-title">💰 Narx</h2>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--m-success)' }}>
              {formatPrice(cargo.priceUzs)}
            </div>
          </div>
        )}

        {/* Description */}
        {cargo.description && (
          <div className="m-detail-section">
            <h2 className="m-detail-section-title">📝 Izoh</h2>
            <p style={{ fontSize: 16, color: 'var(--m-text)', margin: 0, lineHeight: 1.5 }}>
              {cargo.description}
            </p>
          </div>
        )}

        {/* Time */}
        <div className="m-detail-section">
          <div style={{ fontSize: 14, color: 'var(--m-text-muted)' }}>
            ⏱️ {formatTimeAgo(cargo.createdAt || cargo.created_at)}
          </div>
        </div>
      </main>

      {/* Action bar */}
      <div className="m-action-bar" style={{ flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button
            className="m-btn m-btn-primary m-btn-lg"
            onClick={handleRequestPhone}
            disabled={phoneLoading}
            style={{ flex: 1 }}
          >
            {phoneLoading ? (
              <span className="m-spinner" style={{ width: 20, height: 20 }} />
            ) : (
              <>📞 Qo'ng'iroq qilish</>
            )}
          </button>
        </div>
        {permissions?.offerToDriver && (
          <button
            className="m-btn m-btn-lg"
            onClick={handleOpenOfferSheet}
            style={{ width: '100%', background: '#17a2b8', color: 'white' }}
          >
            👤 Haydovchiga taklif
          </button>
        )}
      </div>

      {/* Phone bottom sheet */}
      <BottomSheet
        isOpen={phoneSheet.open}
        onClose={() => setPhoneSheet({ open: false, phone: '' })}
        title="📞 Telefon raqami"
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: 'var(--m-text)' }}>
            {phoneSheet.phone}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="m-btn m-btn-secondary m-btn-lg" onClick={handleCopyPhone} style={{ flex: 1 }}>
              📋 Nusxalash
            </button>
            <button className="m-btn m-btn-success m-btn-lg" onClick={handleCall} style={{ flex: 1 }}>
              📞 Qo'ng'iroq
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Offer to Driver bottom sheet */}
      <BottomSheet
        isOpen={offerSheet}
        onClose={() => {
          setOfferSheet(false);
          setOfferError('');
        }}
        title="👤 Haydovchiga taklif"
        height="full"
        footer={
          !offerSuccess && (
            <button
              className="m-btn m-btn-lg m-btn-full"
              onClick={handleSendOffer}
              disabled={offering || !selectedDriver}
              style={{ background: '#17a2b8', color: 'white' }}
            >
              {offering ? 'Yuborilmoqda...' : 'Taklif yuborish'}
            </button>
          )
        }
      >
        <div style={{ padding: '8px 0' }}>
          {/* Cargo info */}
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--m-bg)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {cargo?.cargoName || cargo?.cargo_name || 'Yuk'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--m-text-secondary)' }}>
              {cargo?.fromCity || cargo?.fromRegion} → {cargo?.toCity || cargo?.toRegion}
            </div>
          </div>

          {/* Price input */}
          <div className="m-form-group">
            <label className="m-form-label required">Narx (so'm)</label>
            <input
              type="number"
              className={`m-form-input ${offerError && !offerPrice ? 'error' : ''}`}
              placeholder="1000000"
              value={offerPrice}
              onChange={(e) => {
                setOfferPrice(e.target.value);
                setOfferError('');
              }}
              inputMode="numeric"
            />
          </div>

          {/* Driver selection */}
          <div className="m-form-group">
            <label className="m-form-label required">Haydovchini tanlang</label>
            {driversLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--m-text-muted)' }}>
                Yuklanmoqda...
              </div>
            ) : drivers.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--m-text-muted)' }}>
                Haydovchilar yo'q
              </div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--m-border)', borderRadius: 8 }}>
                {drivers.map((driver) => {
                  const isSelected = selectedDriver?.chatId === driver.chatId || selectedDriver?.id === driver.id;
                  return (
                    <div
                      key={driver.chatId || driver.id}
                      onClick={() => {
                        setSelectedDriver(driver);
                        setOfferError('');
                      }}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--m-border)',
                        background: isSelected ? '#e3f2fd' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: isSelected ? 600 : 400 }}>
                        {driver.fullName || driver.full_name || driver.name || 'Haydovchi'}
                        {isSelected && ' ✓'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--m-text-secondary)' }}>
                        {driver.phone || driver.phoneNumber}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {offerError && (
            <div style={{ padding: 12, background: '#f8d7da', borderRadius: 8, color: '#721c24', marginTop: 16 }}>
              {offerError}
            </div>
          )}

          {offerSuccess && (
            <div style={{ padding: 16, background: '#d4edda', borderRadius: 8, color: '#155724', textAlign: 'center', marginTop: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              Taklif muvaffaqiyatli yuborildi!
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
