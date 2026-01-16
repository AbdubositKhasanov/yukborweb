import React from 'react';

export default function PhoneShowModal({ phoneNumber, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <>
          <h2 className="modal-title">📞 Telefon raqam</h2>
          <div className="modal-content">
            <div
              style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              <p
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'var(--brand-color)',
                  margin: 0,
                }}
              >
                {phoneNumber}
              </p>
            </div>
            <p
              style={{
                fontSize: '14px',
                color: '#666',
                textAlign: 'center',
                margin: 0,
              }}
            >
              Telefon raqam bilan bog'lanishingiz mumkin
            </p>
          </div>
          <button className="btn btn-primary modal-close" onClick={onClose}>
            Yopish
          </button>
        </>
      </div>
    </div>
  );
}
