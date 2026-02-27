/**
 * Mobile Transport Detail Page
 * Full transport info with call action
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getTransportDetails } from '../../services/api';
import { formatTimeAgo } from '../../utils/formatTime';
import { useMobileAuth } from '../context/MobileAuthContext';
import TopBar from '../components/TopBar';
import BottomSheet from '../components/BottomSheet';
import MobileLoading from '../components/MobileLoading';

export default function MobileTransportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useMobileAuth();

  const fromOrder = location.state?.order;

  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneSheet, setPhoneSheet] = useState({ open: false, phone: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadTransport();
  }, [id]);

  const loadTransport = async () => {
    try {
      setLoading(true);
      const response = await getTransportDetails(id);
      if (response.code === 200) {
        setTransport(response.result);
      } else {
        setError('Transport topilmadi');
      }
    } catch (error) {
      setError('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleShowPhone = async () => {
    if (!isAuthenticated) {
      navigate('/mobile/login', { state: { from: { pathname: `/mobile/transport/${id}` } } });
      return;
    }

    try {
      setPhoneLoading(true);
      // Desktop pattern: call API to get phone (additionalPhone has priority)
      const response = await getTransportDetails(id);
      if (response.code === 200 && response.result) {
        const phone = response.result.additionalPhone || response.result.phone;
        if (phone) {
          setPhoneSheet({ open: true, phone });
        } else {
          setError('Telefon raqam topilmadi');
        }
      } else {
        setError('Telefon raqamni olishda xatolik');
      }
    } catch (err) {
      setError('Xatolik yuz berdi');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleCall = () => {
    if (phoneSheet.phone) {
      window.location.href = `tel:${phoneSheet.phone}`;
    }
  };

  const handleCopyPhone = () => {
    if (phoneSheet.phone) {
      navigator.clipboard.writeText(phoneSheet.phone);
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title="Transport" showBack />
        <MobileLoading fullScreen />
      </>
    );
  }

  if (error || !transport) {
    return (
      <>
        <TopBar title="Transport" showBack />
        <main className="m-content m-content-padded">
          <div className="m-empty">
            <div className="m-empty-icon">❌</div>
            <h3 className="m-empty-title">{error || 'Transport topilmadi'}</h3>
            <button className="m-btn m-btn-primary" onClick={() => navigate(-1)}>
              Orqaga
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Transport" showBack />

      <main className="m-content m-content-padded" style={{ paddingBottom: 100 }}>
        {/* Order context if any */}
        {fromOrder && (
          <div style={{ padding: 12, background: '#e3f2fd', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            📦 {fromOrder.cargoName || fromOrder.cargo_name} uchun transport
          </div>
        )}

        {/* Status and type */}
        <div className="m-detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div className={`m-status-dot ${transport.status === 'active' || transport.isActive ? 'online' : 'offline'}`} style={{ width: 12, height: 12 }} />
            <span style={{ fontSize: 14, color: (transport.status === 'active' || transport.isActive) ? 'var(--m-success)' : 'var(--m-text-muted)' }}>
              {(transport.status === 'active' || transport.isActive) ? 'Faol' : 'Nofaol'}
            </span>
          </div>
          <h1 className="m-detail-title">
            {transport.vehicleType || 'Transport'}
          </h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {transport.maxWeight && (
              <span className="m-badge m-badge-new">⚖️ {transport.maxWeight} tonna</span>
            )}
            {transport.stateNumber && (
              <span className="m-badge" style={{ background: '#e8eaed', color: 'var(--m-text)' }}>
                🔢 {transport.stateNumber}
              </span>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="m-detail-section">
          <h2 className="m-detail-section-title">📍 Joylashuv</h2>
          <div style={{ fontSize: 18, color: 'var(--m-text)' }}>
            {transport.loc1 || transport.fromCity || transport.fromRegion || 'Noma\'lum'}
          </div>
        </div>

        {/* Driver info */}
        {transport.driverName && (
          <div className="m-detail-section">
            <h2 className="m-detail-section-title">👤 Haydovchi</h2>
            <div style={{ fontSize: 16, color: 'var(--m-text)' }}>
              {transport.driverName}
            </div>
          </div>
        )}

        {/* Description */}
        {(transport.otherDesc || transport.description) && (
          <div className="m-detail-section">
            <h2 className="m-detail-section-title">📝 Izoh</h2>
            <p style={{ fontSize: 16, color: 'var(--m-text)', margin: 0, lineHeight: 1.5 }}>
              {transport.otherDesc || transport.description}
            </p>
          </div>
        )}

        {/* Time */}
        <div className="m-detail-section">
          <div style={{ fontSize: 14, color: 'var(--m-text-muted)' }}>
            ⏱️ {formatTimeAgo(transport.time || transport.createdAt || transport.created_at)}
          </div>
        </div>
      </main>

      {/* Action bar */}
      <div className="m-action-bar">
        <button
          className="m-btn m-btn-primary m-btn-lg"
          onClick={handleShowPhone}
          disabled={phoneLoading}
          style={{ flex: 1 }}
        >
          {phoneLoading ? (
            <span className="m-spinner" style={{ width: 20, height: 20 }} />
          ) : (
            <>📞 Qo'ng'iroq qilish</>
          )}
        </button>
      </div>

      {/* Phone bottom sheet */}
      <BottomSheet
        isOpen={phoneSheet.open}
        onClose={() => setPhoneSheet({ open: false, phone: '' })}
        title="📞 Telefon raqami"
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: 'var(--m-text)' }}>
            {phoneSheet.phone}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="m-btn m-btn-secondary m-btn-lg" onClick={handleCopyPhone} style={{ flex: 1 }}>
              📋 Nusxalash
            </button>
            <button className="m-btn m-btn-success m-btn-lg" onClick={handleCall} style={{ flex: 1 }}>
              📞 Qo'ng'iroq
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
