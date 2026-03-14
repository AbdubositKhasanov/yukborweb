/**
 * Mobile Transport Detail Page
 * Full transport info with inline contact section
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getTransportDetails } from '../../services/api';
import { formatTimeAgo } from '../../utils/formatTime';
import { useMobileAuth } from '../context/MobileAuthContext';
import TopBar from '../components/TopBar';
import MobileLoading from '../components/MobileLoading';

function getTelegramLink(telegramUsername, chatId) {
  if (telegramUsername) return `https://t.me/${telegramUsername}`;
  if (chatId && chatId > 0) return `https://t.me/yukbor_global_bot?start=contact_${chatId}`;
  return null;
}

export default function MobileTransportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useMobileAuth();

  const fromOrder = location.state?.order;

  const [transport, setTransport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Contact state (inline on page)
  const [contactPhone, setContactPhone] = useState(null);
  const [contactTelegramUsername, setContactTelegramUsername] = useState(null);
  const [contactChatId, setContactChatId] = useState(null);
  const [contactLoaded, setContactLoaded] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    loadTransport();
  }, [id]);

  // Auto-load contact info when authenticated
  useEffect(() => {
    if (isAuthenticated && id && !contactLoaded) {
      loadContact();
    }
  }, [isAuthenticated, id]);

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

  const loadContact = async () => {
    try {
      setContactLoading(true);
      const response = await getTransportDetails(id);
      if (response.code === 200 && response.result) {
        const phone = response.result.additionalPhone || response.result.phone;
        setContactPhone(phone || null);
        setContactTelegramUsername(response.result.telegramUsername || null);
        setContactChatId(response.result.chatId || null);
      }
    } catch (err) {
      // silently fail
    } finally {
      setContactLoaded(true);
      setContactLoading(false);
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

      <main className="m-content m-content-padded">
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

        {/* Contact section — inline on page */}
        {!isAuthenticated && (
          <div className="m-detail-section">
            <button
              className="m-btn m-btn-primary m-btn-lg"
              onClick={() => navigate('/mobile/login', { state: { from: { pathname: `/mobile/transport/${id}` } } })}
              style={{ width: '100%' }}
            >
              🔑 Kirish (kontakt ko'rish uchun)
            </button>
          </div>
        )}
        {isAuthenticated && contactLoading && (
          <div className="m-detail-section">
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--m-text-muted)' }}>
              Yuklanmoqda...
            </div>
          </div>
        )}
        {contactLoaded && contactPhone && (
          <div className="m-detail-section">
            <h2 className="m-detail-section-title">📱 Bog'lanish</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={`tel:${contactPhone}`} className="m-btn m-btn-success m-btn-lg" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>
                📞 Qo'ng'iroq
              </a>
              {getTelegramLink(contactTelegramUsername, contactChatId) && (
                <a href={getTelegramLink(contactTelegramUsername, contactChatId)} target="_blank" rel="noopener noreferrer" className="m-btn m-btn-primary m-btn-lg" style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>
                  💬 Telegram
                </a>
              )}
            </div>
          </div>
        )}
        {contactLoaded && !contactPhone && (
          <div className="m-detail-section">
            <div style={{ padding: 12, background: '#fff3cd', borderRadius: 8, color: '#856404' }}>
              🔒 Telefon raqamni ko'rish uchun ruxsat yo'q
            </div>
          </div>
        )}
      </main>
    </>
  );
}
