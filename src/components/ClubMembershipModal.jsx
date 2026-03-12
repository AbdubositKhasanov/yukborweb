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
            Ruxsat yo'q
          </h3>

          <p style={{
            marginBottom: '25px',
            color: '#666',
            lineHeight: '1.6',
            fontSize: '15px'
          }}>
            Sizda ushbu funksiyadan foydalanish uchun ruxsat yo'q. Qo'shimcha ma'lumot uchun qo'llab-quvvatlash xizmatiga murojaat qiling.
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
              Qo'llab-quvvatlash
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
