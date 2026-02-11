/**
 * Mobile My Listings Page (E'lonlarim)
 * Shows links to My Orders and My Transports for Logist
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';

export default function MobileMyListings() {
  const navigate = useNavigate();

  return (
    <>
      <TopBar title="E'lonlarim" />

      <main className="m-content">
        <div style={{ padding: 16 }}>
          {/* My Orders Card */}
          <button
            onClick={() => navigate('/mobile/orders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              width: '100%',
              padding: 20,
              background: 'var(--m-card-bg)',
              border: '1px solid var(--m-border)',
              borderRadius: 12,
              marginBottom: 12,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #4CAF50, #81C784)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}>
              📦
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--m-text)', marginBottom: 4 }}>
                Buyurtmalarim
              </div>
              <div style={{ fontSize: 14, color: 'var(--m-text-secondary)' }}>
                Yuk buyurtmalarini ko&apos;rish va boshqarish
              </div>
            </div>
            <span style={{ fontSize: 20, color: 'var(--m-text-muted)' }}>→</span>
          </button>

          {/* My Transports Card */}
          <button
            onClick={() => navigate('/mobile/my-transports')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              width: '100%',
              padding: 20,
              background: 'var(--m-card-bg)',
              border: '1px solid var(--m-border)',
              borderRadius: 12,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2196F3, #64B5F6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}>
              🚚
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--m-text)', marginBottom: 4 }}>
                Transportlarim
              </div>
              <div style={{ fontSize: 14, color: 'var(--m-text-secondary)' }}>
                Transport e&apos;lonlarini ko&apos;rish va boshqarish
              </div>
            </div>
            <span style={{ fontSize: 20, color: 'var(--m-text-muted)' }}>→</span>
          </button>
        </div>
      </main>
    </>
  );
}
