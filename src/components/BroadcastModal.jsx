import React, { useState, useEffect, useRef } from 'react';
import { broadcastMessage, getBroadcastStatus } from '../services/api';

export default function BroadcastModal({ isOpen, onClose, order }) {
  const [message, setMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastId, setBroadcastId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (order && isOpen) {
      const defaultMsg = buildOrderMessage(order);
      setMessage(defaultMsg);
      setBroadcastId(null);
      setStatus(null);
      setError(null);
    }
  }, [order, isOpen]);

  // Poll broadcast status
  useEffect(() => {
    if (broadcastId) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await getBroadcastStatus(broadcastId);
          setStatus(res);
          if (res.status === 'completed' || res.status === 'failed') {
            clearInterval(pollRef.current);
            setBroadcasting(false);
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 3000);

      return () => clearInterval(pollRef.current);
    }
  }, [broadcastId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const buildOrderMessage = (o) => {
    let msg = '';
    if (o.cargoName) msg += `${o.cargoName}\n`;
    if (o.fromCity) msg += `Qayerdan: ${o.fromCity}\n`;
    if (o.toCity) msg += `Qayerga: ${o.toCity}\n`;
    if (o.weightKg) msg += `Og'irligi: ${o.weightKg} t\n`;
    if (o.vehicleType) msg += `Transport: ${o.vehicleType}\n`;
    if (o.priceUzs && o.priceUzs > 0) msg += `Narxi: ${o.priceUzs.toLocaleString('uz-UZ')} so'm\n`;
    if (o.description && o.description !== 'null' && o.description.trim()) {
      msg += `\n${o.description}\n`;
    }
    if (o.additionalPhone) msg += `\nTel: ${o.additionalPhone}`;
    return msg.trim();
  };

  const handleBroadcast = async () => {
    if (!message.trim()) {
      setError('Xabar matni bo\'sh bo\'lishi mumkin emas');
      return;
    }

    setBroadcasting(true);
    setError(null);
    setStatus(null);

    try {
      const res = await broadcastMessage(message.trim());
      if (res.success) {
        setBroadcastId(res.broadcast_id);
        setStatus({
          status: 'in_progress',
          total_userbots: res.total_userbots,
          successful: 0,
          failed: 0,
          message: res.message,
          details: []
        });
      } else {
        setError(res.message || 'Tarqatishda xatolik');
        setBroadcasting(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
      setBroadcasting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 1000,
      padding: '20px'
    }} onClick={(e) => { if (e.target === e.currentTarget && !broadcasting) onClose(); }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', padding: '24px',
        maxWidth: '550px', width: '100%', maxHeight: '85vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Guruhlarga tarqatish</h2>
          {!broadcasting && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999'
            }}>x</button>
          )}
        </div>

        {/* Message editor */}
        {!broadcastId && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>
                Xabar matni
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={10}
                maxLength={4096}
                style={{
                  width: '100%', padding: '12px', border: '1px solid #ddd',
                  borderRadius: '8px', fontSize: '14px', resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box'
                }}
              />
              <div style={{ textAlign: 'right', fontSize: '12px', color: '#999', marginTop: '4px' }}>
                {message.length}/4096
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px', backgroundColor: '#f8d7da', borderRadius: '6px',
                color: '#721c24', fontSize: '14px', marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                style={{ flex: 1 }}
              >
                Bekor qilish
              </button>
              <button
                className="btn btn-primary"
                onClick={handleBroadcast}
                disabled={broadcasting || !message.trim()}
                style={{ flex: 1 }}
              >
                {broadcasting ? 'Yuborilmoqda...' : 'Tarqatish'}
              </button>
            </div>
          </>
        )}

        {/* Broadcast status */}
        {broadcastId && status && (
          <div>
            <div style={{
              padding: '16px', borderRadius: '8px', marginBottom: '16px',
              backgroundColor: status.status === 'completed' ? '#d4edda' :
                               status.status === 'failed' ? '#f8d7da' : '#fff3cd',
              color: status.status === 'completed' ? '#155724' :
                     status.status === 'failed' ? '#721c24' : '#856404'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '15px' }}>
                {status.status === 'in_progress' && 'Tarqatilmoqda...'}
                {status.status === 'completed' && 'Tarqatish yakunlandi!'}
                {status.status === 'failed' && 'Tarqatishda xatolik!'}
              </div>
              <div style={{ fontSize: '14px' }}>
                <p style={{ margin: '4px 0' }}>Jami userbotlar: {status.total_userbots}</p>
                <p style={{ margin: '4px 0' }}>Muvaffaqiyatli: {status.successful}</p>
                {status.failed > 0 && (
                  <p style={{ margin: '4px 0' }}>Xatolik: {status.failed}</p>
                )}
              </div>

              {status.status === 'in_progress' && (
                <div style={{
                  marginTop: '12px', height: '6px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '3px'
                }}>
                  <div style={{
                    height: '100%', borderRadius: '3px', backgroundColor: '#007bff',
                    width: status.total_userbots > 0
                      ? `${((status.successful + status.failed) / status.total_userbots) * 100}%`
                      : '0%',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              )}
            </div>

            {/* Details per userbot */}
            {status.details && status.details.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '14px' }}>Tafsilotlar:</h4>
                {status.details.map((detail, i) => (
                  <div key={i} style={{
                    padding: '8px 12px', marginBottom: '6px',
                    backgroundColor: detail.status === 'success' ? '#f0fff0' :
                                     detail.status === 'failed' ? '#fff0f0' : '#fffff0',
                    borderRadius: '6px', fontSize: '13px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '500' }}>{detail.phone}</span>
                      <span>{detail.groups_sent} guruh</span>
                    </div>
                    {detail.errors && detail.errors.length > 0 && (
                      <div style={{ color: '#dc3545', marginTop: '4px', fontSize: '12px' }}>
                        {detail.errors.slice(0, 2).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={() => {
                if (pollRef.current) clearInterval(pollRef.current);
                onClose();
              }}
              style={{ width: '100%' }}
              disabled={status.status === 'in_progress'}
            >
              {status.status === 'in_progress' ? 'Kutilmoqda...' : 'Yopish'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
