import React from 'react';

export default function ClubMembershipModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const handleJoinClub = () => {
    // Open Telegram to support
    const telegramUrl = 'https://t.me/yukborsupport';
    window.open(telegramUrl, '_blank');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px'
          }}>
            🔒
          </div>
          
          <h3 className="card-title" style={{ marginBottom: '15px' }}>
            Maxsus funksiya
          </h3>
          
          <p style={{
            marginBottom: '25px',
            color: '#666',
            lineHeight: '1.6',
            fontSize: '15px'
          }}>
            Bu funksiya faqat club a'zolari uchun amal qiladi
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              className="btn btn-primary"
              onClick={handleJoinClub}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px'
              }}
            >
              A'zo bo'lish
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px'
              }}
            >
              Yopish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
