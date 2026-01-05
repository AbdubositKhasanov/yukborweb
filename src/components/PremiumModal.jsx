import React from 'react';

export default function PremiumModal({ phoneNumber, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {phoneNumber && phoneNumber.trim() ? (
          // Has phone - show it
          <>
            <h2 className="modal-title">📞 Telefon raqam</h2>
            <div className="modal-content">
              <div style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <p style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: 'var(--brand-color)',
                  margin: 0
                }}>
                  {phoneNumber}
                </p>
              </div>
              <p style={{
                fontSize: '14px',
                color: '#666',
                textAlign: 'center',
                margin: 0
              }}>
                Telefon raqam bilan bog'lanishingiz mumkin
              </p>
            </div>
            <button className="btn btn-primary modal-close" onClick={onClose}>
              Yopish
            </button>
          </>
        ) : (
          // No phone - show premium upgrade
          <>
            <h2 className="modal-title">🌟 Premium xususiyat</h2>
            <div className="modal-content">
              <div style={{
                padding: '20px',
                backgroundColor: '#fff3cd',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{
                  fontSize: '16px',
                  color: '#856404',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  Bu telefon raqamni ko'rish uchun premium obunaga ega bo'lishingiz kerak.
                </p>
              </div>
              
              <div style={{
                marginBottom: '20px'
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--brand-color)',
                  marginBottom: '12px'
                }}>
                  Premium afzalliklari:
                </h4>
                <ul style={{
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: '1.8',
                  paddingLeft: '20px',
                  margin: 0
                }}>
                  <li>Barcha telefon raqamlarini ko'rish</li>
                  <li>Cheklanmagan qidiruv</li>
                  <li>Birinchi bo'lib yangi e'lonlarni ko'rish</li>
                  <li>Maxsus yordam va qo'llab-quvvatlash</li>
                </ul>
              </div>

              <div style={{
                padding: '15px',
                backgroundColor: '#d4edda',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <p style={{
                  fontSize: '14px',
                  color: '#155724',
                  margin: 0,
                  fontWeight: '500'
                }}>
                  💰 Narxi: Faqat 50,000 so'm/oy
                </p>
              </div>

              <p style={{
                fontSize: '14px',
                color: '#666',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                Premium obunani faollashtirish uchun quyidagi Telegram kanaliga murojaat qiling:
              </p>

              <a
                href="https://t.me/your_support_channel"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success"
                style={{
                  width: '100%',
                  marginBottom: '10px',
                  textDecoration: 'none',
                  display: 'block'
                }}
              >
                📱 Telegram orqali bog'lanish
              </a>
            </div>
            
            <button className="btn btn-secondary modal-close" onClick={onClose}>
              Yopish
            </button>
          </>
        )}
      </div>
    </div>
  );
}
