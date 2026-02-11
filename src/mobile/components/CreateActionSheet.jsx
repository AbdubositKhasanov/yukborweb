/**
 * Create Action Sheet for Logist role
 * Shows options to create Order or Transport
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import BottomSheet from './BottomSheet';

export default function CreateActionSheet({ isOpen, onClose }) {
  const navigate = useNavigate();

  const handleCreateOrder = () => {
    onClose();
    navigate('/mobile/create-order');
  };

  const handleCreateTransport = () => {
    onClose();
    navigate('/mobile/create-transport');
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Nima yaratmoqchisiz?"
    >
      <div style={{ padding: '8px 0' }}>
        <button
          onClick={handleCreateOrder}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            width: '100%',
            padding: '16px',
            background: 'var(--m-card-bg)',
            border: '1px solid var(--m-border)',
            borderRadius: 12,
            marginBottom: 12,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #4CAF50, #81C784)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}>
            📦
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--m-text)', marginBottom: 4 }}>
              Yuk qo'shish
            </div>
            <div style={{ fontSize: 14, color: 'var(--m-text-secondary)' }}>
              Yangi yuk buyurtmasi yaratish
            </div>
          </div>
        </button>

        <button
          onClick={handleCreateTransport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            width: '100%',
            padding: '16px',
            background: 'var(--m-card-bg)',
            border: '1px solid var(--m-border)',
            borderRadius: 12,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #2196F3, #64B5F6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}>
            🚚
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--m-text)', marginBottom: 4 }}>
              Transport qo'shish
            </div>
            <div style={{ fontSize: 14, color: 'var(--m-text-secondary)' }}>
              Yangi transport ro'yxatga olish
            </div>
          </div>
        </button>
      </div>
    </BottomSheet>
  );
}
