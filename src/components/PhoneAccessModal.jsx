import React, { useEffect, useState } from 'react';
import { trackPhoneView, trackPhoneRequest } from '../services/analytics';
import { getUserMe, markCargoDispatcher } from '../services/api';
import { getTelegramProfileLink } from '../utils/telegramLinks';
import { goToTariffs, openSupportForPurchase } from '../utils/premiumUpgrade';

export default function PhoneAccessModal({
  isOpen,
  onClose,
  type,
  message,
  phone,
  telegramUsername,
  chatId,
  ownerName,
  cargoId,
  onMarkedDispatcher,
  featureKey = 'viewCargoPhone',
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(false);
  const [markError, setMarkError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (type === 'success') trackPhoneView();
    else if (type === 'premium_required') trackPhoneRequest('premium_required');
    else if (type === 'permission_denied') trackPhoneRequest('permission_denied');
    else if (type === 'unauthorized') trackPhoneRequest('unauthorized');
  }, [isOpen, type]);

  useEffect(() => {
    if (!isOpen || !localStorage.getItem('authToken')) return;
    let cancelled = false;
    getUserMe()
      .then((response) => {
        if (!cancelled && response.code === 200) {
          setCurrentUser(response.result || null);
        }
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkDispatcher = async () => {
    if (!cargoId || marked || marking) return;
    if (!window.confirm("Bu kontakt dispetcher/logist ekan deb belgilaysizmi? Keyin Yuk egasi filterida ko'rinmaydi.")) return;
    setMarking(true);
    setMarkError('');
    try {
      const response = await markCargoDispatcher(cargoId, 'Telefon ko‘rilgandan keyin user dispetcher deb belgiladi');
      if (response.code === 200) {
        setMarked(true);
        onMarkedDispatcher?.(response.result);
      } else {
        setMarkError(response.message || 'Belgilashda xatolik');
      }
    } catch (error) {
      setMarkError(error.response?.data?.message || error.message || 'Belgilashda xatolik');
    } finally {
      setMarking(false);
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'unauthorized':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔑</div>
            <h3 className="card-title">Kirish talab qilinadi</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>{message}</p>
            <button className="btn btn-primary" onClick={onClose}>
              OK
            </button>
          </div>
        );

      case 'premium_required':
      case 'permission_denied':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h3 className="card-title">
              {type === 'permission_denied' ? 'Ruxsat yo\'q' : 'Premium xizmat'}
            </h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>{message}</p>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={onClose}>
                Yopish
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => goToTariffs(featureKey)}
              >
                Tariflarni ko'rish
              </button>
              <button
                className="btn btn-primary"
                onClick={() => openSupportForPurchase({
                  featureKey,
                  reason: message || 'Telefon raqamni ko\'rish uchun premium kerak.',
                  user: currentUser,
                })}
              >
                Sotib olish
              </button>
            </div>
          </div>
        );

      case 'success':
        const tgLink = getTelegramProfileLink(telegramUsername);
        const showInlineTelegramNotice = !telegramUsername;
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📞</div>
            <h3 className="card-title">Telefon raqam</h3>
            {ownerName && (
              <div style={{
                padding: '12px 14px',
                backgroundColor: '#eef4ff',
                borderRadius: '8px',
                marginBottom: '12px',
                color: '#1f3f6d',
                fontWeight: 600,
                textAlign: 'left'
              }}>
                👤 {ownerName}
              </div>
            )}
            <div style={{
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <a
                href={`tel:${phone}`}
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'var(--brand-color)',
                  textDecoration: 'none'
                }}
              >
                {phone}
              </a>
            </div>
            {showInlineTelegramNotice && (
              <div style={{
                padding: '12px 14px',
                backgroundColor: '#fff8e1',
                borderRadius: '8px',
                color: '#856404',
                marginBottom: '16px',
                fontSize: '14px',
                lineHeight: 1.5,
                textAlign: 'left'
              }}>
                Telegram orqali yozish e'lon egasining sozlamalari sabab ochilmayapti. Telefon orqali bog'laning yoki e'londagi boshqa kontaktlardan foydalaning.
              </div>
            )}
            <div className="btn-group">
              {tgLink && (
                <a
                  href={tgLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  💬 Telegram
                </a>
              )}
              {cargoId && (
                <button
                  className="btn btn-secondary"
                  onClick={handleMarkDispatcher}
                  disabled={marking || marked}
                >
                  {marked ? 'Belgilandi' : marking ? 'Belgilanmoqda...' : 'Bu dispetcher'}
                </button>
              )}
              <button className="btn btn-secondary" onClick={onClose}>
                Yopish
              </button>
            </div>
            {marked && (
              <div style={{ marginTop: 12, color: '#155724', fontSize: 13, fontWeight: 700 }}>
                Bu akkaunt Yuk egasi filteridan chiqarildi.
              </div>
            )}
            {markError && (
              <div style={{ marginTop: 12, color: '#dc3545', fontSize: 13 }}>
                {markError}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h3 className="card-title">Xatolik</h3>
            <p style={{ marginBottom: '20px', color: '#dc3545' }}>{message}</p>
            <button className="btn btn-primary" onClick={onClose}>
              Yopish
            </button>
          </div>
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </div>
    </div>
  );
}
