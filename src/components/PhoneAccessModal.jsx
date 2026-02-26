import React, { useEffect } from 'react';
import { trackPhoneView, trackPhoneRequest } from '../services/analytics';

export default function PhoneAccessModal({ isOpen, onClose, type, message, phone }) {
  useEffect(() => {
    if (!isOpen) return;
    if (type === 'success') trackPhoneView();
    else if (type === 'premium_required') trackPhoneRequest('premium_required');
    else if (type === 'unauthorized') trackPhoneRequest('unauthorized');
  }, [isOpen, type]);

  if (!isOpen) return null;

  const renderContent = () => {
    switch (type) {
      case 'unauthorized':
        return (
          <div>
            <h3 className="card-title">Kirish talab qilinadi</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>{message}</p>
            <button className="btn btn-primary" onClick={onClose}>
              OK
            </button>
          </div>
        );

      case 'premium_required':
        return (
          <div>
            <h3 className="card-title">Premium xizmat</h3>
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
        return (
          <div>
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
            <button className="btn btn-primary" onClick={onClose}>
              Yopish
            </button>
          </div>
        );

      default:
        return (
          <div>
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
