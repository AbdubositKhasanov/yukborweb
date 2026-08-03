/**
 * Mobile Cargo Detail Page
 * Full cargo information with action buttons at bottom
 * Includes offer to driver functionality for internal dispatchers
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCargoDetails, requestCargoPhone, getUserMe, getMyInvitedUsers, offerForDriver, markCargoDispatcher, claimCargoAsInternal } from '../../services/api';
import { formatTimeAgo } from '../../utils/formatTime';
import { formatOrderPrice } from '../../utils/orderText';
import { buildOriginalCargoMessage, PRIVATE_GROUP_MESSAGE_NOTE } from '../../utils/originalMessage';
import { canOpenTelegramMessageLink, CONTACT_FALLBACK_MESSAGE, getTelegramProfileLink } from '../../utils/telegramLinks';
import { goToTariffs, openPremiumUpgrade, openSupportForPurchase } from '../../utils/premiumUpgrade';
import { useMobileAuth } from '../context/MobileAuthContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import MobileLoading from '../components/MobileLoading';

const PHONE_UPGRADE_MESSAGE = 'Telefon raqamni ko\'rish uchun tarif kerak yoki bepul limitingiz tugagan.';

export default function MobileCargoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, isInternalDispatcher } = useMobileAuth();

  const [cargo, setCargo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Contact state (inline on page)
  const [contactPhone, setContactPhone] = useState(null);
  const [contactTelegramUsername, setContactTelegramUsername] = useState(null);
  const [contactChatId, setContactChatId] = useState(null);
  const [contactOwnerName, setContactOwnerName] = useState(null);
  const [contactLoaded, setContactLoaded] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [dispatcherMarking, setDispatcherMarking] = useState(false);
  const [dispatcherMarked, setDispatcherMarked] = useState(false);
  const [dispatcherMarkError, setDispatcherMarkError] = useState('');
  const [claimingInternal, setClaimingInternal] = useState(false);
  const [claimError, setClaimError] = useState('');

  // User and permission state
  const [permissions, setPermissions] = useState(null);
  const [featureLimits, setFeatureLimits] = useState(null);

  // Offer to driver state
  const [offerSheet, setOfferSheet] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [offering, setOffering] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [messageSheet, setMessageSheet] = useState(false);
  const messageLink = cargo?.messageUrl || '';
  const canOpenMessageLink = canOpenTelegramMessageLink(messageLink);
  const hasMessageAction = Boolean(cargo?.messageUrl || cargo?.messageIsPrivateGroup);

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
        setFeatureLimits(response.result.featureLimits || null);
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
      setContactPhone(null);
      setContactTelegramUsername(null);
      setContactChatId(null);
      setContactOwnerName(null);
      setContactLoaded(false);
      setContactLoading(false);
      setDispatcherMarked(false);
      setDispatcherMarkError('');
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

  const loadContact = async () => {
    try {
      setContactLoading(true);
      const response = await requestCargoPhone(id);
      if (response.code === 200 && response.result) {
        const phone = response.result.additionalPhone || response.result.phone;
        setContactPhone(phone || null);
        setContactTelegramUsername(response.result.telegramUsername || null);
        setContactChatId(response.result.chatId || null);
        setContactOwnerName(response.result.ownerName || response.result.owner_name || null);
        if (!phone) {
          openPremiumUpgrade({
            featureKey: 'viewCargoPhone',
            message: PHONE_UPGRADE_MESSAGE,
            currentLimit: featureLimits?.viewCargoPhone,
            source: 'mobile-cargo-detail',
          });
        }
      }
    } catch (err) {
      // silently fail — contact section won't show
    } finally {
      setContactLoaded(true);
      setContactLoading(false);
    }
  };

  const handleClaimInternal = async () => {
    if (!window.confirm("Bu yukni ichki logistlar boshqaruviga olasizmi?")) return;
    setClaimingInternal(true);
    setClaimError('');
    try {
      const response = await claimCargoAsInternal(id);
      if (response.code === 200) {
        navigate('/mobile/internal-loads', { replace: true });
      } else {
        setClaimError(response.message || "Yukni olishda xatolik");
      }
    } catch (error) {
      setClaimError(error.response?.data?.message || "Yukni olishda xatolik");
    } finally {
      setClaimingInternal(false);
    }
  };

  const handleMarkDispatcher = async () => {
    if (!id || dispatcherMarked || dispatcherMarking) return;
    if (!window.confirm("Bu kontakt dispetcher/logist ekan deb belgilaysizmi? Keyin Yuk egasi filterida ko'rinmaydi.")) return;
    setDispatcherMarking(true);
    setDispatcherMarkError('');
    try {
      const response = await markCargoDispatcher(id, 'Telefon ko‘rilgandan keyin user dispetcher deb belgiladi');
      if (response.code === 200) {
        setDispatcherMarked(true);
      } else {
        setDispatcherMarkError(response.message || 'Belgilashda xatolik');
      }
    } catch (error) {
      setDispatcherMarkError(error.response?.data?.message || error.message || 'Belgilashda xatolik');
    } finally {
      setDispatcherMarking(false);
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
            {(cargo.weightKg || cargo.weight) && (
              <span className="m-badge m-badge-new">{cargo.weightKg || cargo.weight} tonna</span>
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
              {formatOrderPrice(cargo.priceUzs)}
            </div>
          </div>
        )}

        <div className="m-detail-section">
          <h2 className="m-detail-section-title">📦 Ma'lumotlar</h2>
          <div style={{ display: 'grid', gap: 10, fontSize: 15, color: 'var(--m-text)' }}>
            {(cargo.weightKg || cargo.weight) && <div>⚖️ {cargo.weightKg || cargo.weight} tonna</div>}
            {cargo.vehicleType && <div>🚚 {cargo.vehicleType}</div>}
            {cargo.status && <div>📌 {cargo.status}</div>}
            {cargo.source && <div>🔎 {cargo.source}</div>}
            {cargo.telegramUsername && <div>💬 @{cargo.telegramUsername}</div>}
          </div>
        </div>

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
            ⏱️ {formatTimeAgo(cargo.createdTime || cargo.createdAt || cargo.created_at)}
          </div>
        </div>

        {(isInternalDispatcher || user?.isAdmin === true) && cargo.internalManaged !== true && (
          <div className="m-detail-section">
            <button
              type="button"
              className="m-btn m-btn-success m-btn-lg m-btn-full"
              onClick={handleClaimInternal}
              disabled={claimingInternal}
            >
              {claimingInternal ? 'Olinmoqda...' : '✓ Oldim'}
            </button>
            {claimError && <div style={{ marginTop: 8, color: '#dc3545', fontSize: 13 }}>{claimError}</div>}
          </div>
        )}

        {/* Message link */}
        {hasMessageAction && (
          <div className="m-detail-section">
            {cargo.messageIsPrivateGroup || !canOpenMessageLink ? (
              <button
                type="button"
                className="m-btn m-btn-lg"
                onClick={() => setMessageSheet(true)}
                style={{ width: '100%', textAlign: 'center', background: '#0088cc', color: 'white' }}
              >
                💬 Original xabarni ko‘rish
              </button>
            ) : (
              <a
                href={messageLink}
                target="_blank"
                rel="noopener noreferrer"
                className="m-btn m-btn-lg"
                style={{ width: '100%', textDecoration: 'none', textAlign: 'center', background: '#0088cc', color: 'white' }}
              >
                💬 Telegramdagi xabarga o‘tish
              </a>
            )}
            {(cargo.messageIsPrivateGroup || !canOpenMessageLink) && (
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--m-text-muted)', textAlign: 'center' }}>
                Telegramga o'tib bo'lmasa, xabar shu yerda ko'rsatiladi
              </div>
            )}
          </div>
        )}

        {/* Contact section — inline on page */}
        {!isAuthenticated && (
          <div className="m-detail-section">
            <button
              className="m-btn m-btn-primary m-btn-lg"
              onClick={() => navigate('/mobile', { replace: true })}
              style={{ width: '100%' }}
            >
              🔑 Kirish (kontakt ko'rish uchun)
            </button>
          </div>
        )}
        {isAuthenticated && contactLoading && (
          <div className="m-detail-section">
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--m-text-muted)' }}>
              Telefon yuklanmoqda...
            </div>
          </div>
        )}
        {isAuthenticated && !contactLoading && !contactLoaded && (
          <div className="m-detail-section">
            <h2 className="m-detail-section-title">📱 Bog'lanish</h2>
            <button
              className="m-btn m-btn-primary m-btn-lg"
              onClick={loadContact}
              style={{ width: '100%' }}
            >
              Telefon raqamni ko'rish
            </button>
          </div>
        )}
        {contactLoaded && contactPhone && (
          <div className="m-detail-section">
            <h2 className="m-detail-section-title">📱 Bog'lanish</h2>
            <div style={{
              padding: 12,
              borderRadius: 8,
              background: 'var(--m-bg-card)',
              border: '1px solid var(--m-border)',
              marginBottom: 12,
            }}>
              {contactOwnerName && (
                <div style={{ fontSize: 14, color: 'var(--m-text-secondary)', marginBottom: 4 }}>
                  👤 {contactOwnerName}
                </div>
              )}
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {contactPhone}
              </div>
              {!contactTelegramUsername && (
                <div style={{ fontSize: 13, color: 'var(--m-text-secondary)', marginTop: 8, lineHeight: 1.4 }}>
                  Telegram orqali yozish e'lon egasining sozlamalari sabab ochilmayapti. Telefon orqali bog'laning yoki e'londagi boshqa kontaktlardan foydalaning.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={`tel:${contactPhone}`} className="m-btn m-btn-success m-btn-lg" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>
                📞 Qo'ng'iroq
              </a>
              {getTelegramProfileLink(contactTelegramUsername) && (
                <a href={getTelegramProfileLink(contactTelegramUsername)} target="_blank" rel="noopener noreferrer" className="m-btn m-btn-primary m-btn-lg" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>
                  💬 Telegram
                </a>
              )}
            </div>
            <button
              type="button"
              className="m-btn m-btn-full"
              onClick={handleMarkDispatcher}
              disabled={dispatcherMarking || dispatcherMarked}
              style={{
                marginTop: 10,
                background: dispatcherMarked ? '#e8f5e9' : '#fff',
                border: '1px solid #d7dde5',
                color: dispatcherMarked ? '#155724' : '#334155',
              }}
            >
              {dispatcherMarked ? 'Dispetcher deb belgilandi' : dispatcherMarking ? 'Belgilanmoqda...' : 'Bu dispetcher/logist'}
            </button>
            {dispatcherMarkError && (
              <div style={{ marginTop: 8, color: '#dc3545', fontSize: 13 }}>
                {dispatcherMarkError}
              </div>
            )}
          </div>
        )}
        {contactLoaded && !contactPhone && (
          <div className="m-detail-section">
            <div style={{ padding: 14, background: '#fff7ed', borderRadius: 10, color: '#7c2d12', border: '1px solid #fed7aa' }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>🔒 Telefon ko'rish limiti tugagan</div>
              <div style={{ fontSize: 14, lineHeight: 1.45, marginBottom: 12 }}>
                {PHONE_UPGRADE_MESSAGE} Mos tarifni tanlasangiz, telefon raqamlar avtomatik ochiladi.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  className="m-btn m-btn-primary"
                  onClick={() => goToTariffs('viewCargoPhone')}
                >
                  Tariflarni ko'rish
                </button>
                <button
                  type="button"
                  className="m-btn"
                  onClick={() => openSupportForPurchase({
                    featureKey: 'viewCargoPhone',
                    reason: PHONE_UPGRADE_MESSAGE,
                    user,
                  })}
                  style={{ background: '#fff', border: '1px solid #fed7aa', color: '#7c2d12' }}
                >
                  Supportga yozish
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Action bar — only offer to driver */}
      {permissions?.offerToDriver && (
        <div className="m-action-bar">
          <button
            className="m-btn m-btn-lg"
            onClick={handleOpenOfferSheet}
            style={{ flex: 1, background: '#17a2b8', color: 'white' }}
          >
            👤 Haydovchiga taklif
          </button>
        </div>
      )}

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

      <BottomSheet
        isOpen={messageSheet}
        onClose={() => setMessageSheet(false)}
        title="💬 Original xabar"
        height="full"
        footer={
          <button className="m-btn m-btn-primary m-btn-full m-btn-lg" onClick={() => setMessageSheet(false)}>
            Yopish
          </button>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ padding: 12, borderRadius: 8, background: '#fff3cd', color: '#664d03', fontSize: 14, lineHeight: 1.45 }}>
            {cargo?.messageIsPrivateGroup ? PRIVATE_GROUP_MESSAGE_NOTE : CONTACT_FALLBACK_MESSAGE}
          </div>
          <pre
            style={{
              margin: 0,
              padding: 14,
              borderRadius: 8,
              background: 'var(--m-bg)',
              border: '1px solid var(--m-border)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
              fontSize: 15,
              lineHeight: 1.55,
              color: 'var(--m-text)',
            }}
          >
            {buildOriginalCargoMessage(cargo)}
          </pre>
        </div>
      </BottomSheet>
    </>
  );
}
