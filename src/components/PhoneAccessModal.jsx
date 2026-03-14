import React, { useEffect } from 'react';
import { trackPhoneView, trackPhoneRequest } from '../services/analytics';

function getTelegramLink(telegramUsername, chatId) {
  if (telegramUsername) return `https://t.me/${telegramUsername}`;
  if (chatId && chatId > 0) return `https://t.me/yukbor_global_bot?start=contact_${chatId}`;
  return null;
}

export default function PhoneAccessModal({ isOpen, onClose, type, message, phone, telegramUsername, chatId }) {
  useEffect(() => {
    if (!isOpen) return;
    if (type === 'success') trackPhoneView();
    else if (type === 'premium_required') trackPhoneRequest('premium_required');
    else if (type === 'permission_denied') trackPhoneRequest('permission_denied');
    else if (type === 'unauthorized') trackPhoneRequest('unauthorized');
  }, [isOpen, type]);

  if (!isOpen) return null;

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
              <a
                href="https://t.me/yukborsupport"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                Qo'llab-quvvatlash
              </a>
            </div>
          </div>
        );

      case 'success':
        const tgLink = getTelegramLink(telegramUsername, chatId);
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📞</div>
            <h3 className="card-title">Telefon raqam</h3>
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
              <button className="btn btn-secondary" onClick={onClose}>
                Yopish
              </button>
            </div>
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
