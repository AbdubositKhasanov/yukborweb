import React, { useState, useEffect, useRef } from 'react';
import { broadcastMessage, getBroadcastStatus } from '../services/api';
import {
  buildCompactOrderMessage,
  formatBroadcastDeliveryCount,
} from '../utils/orderText';

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
        } catch (_) {
          // Texnik xato userga ko'rsatilmaydi; keyingi poll qayta urinadi.
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
    return buildCompactOrderMessage(o);
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
          total_groups: res.total_groups || 0,
          groups_sent: 0,
        });
      } else {
        setError('Xabarni guruhlarga yuborib bo‘lmadi');
        setBroadcasting(false);
      }
    } catch (_) {
      setError('Xabarni guruhlarga yuborib bo‘lmadi');
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
              backgroundColor: '#d4edda',
              color: '#155724'
            }}>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>
                ✅ {formatBroadcastDeliveryCount(status)} ta guruhga yuborildi
              </div>
            </div>

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
