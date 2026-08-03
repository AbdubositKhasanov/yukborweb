import React, { useState } from 'react';
import PhoneAccessModal from './PhoneAccessModal';
import { handlePhoneAccess } from '../services/phoneAccess';
import { requestCargoPhone, offerForDriver, assignOrderToDriver, claimCargoAsInternal } from '../services/api';
import ClubMembershipModal from './ClubMembershipModal';
import OfferToDriverModal from './OfferToDriverModal';
import PriceInputModal from './PriceInputModal';
import AssignToDriverModal from './AssignToDriverModal';
import SenderTypeBadge from './SenderTypeBadge';
import { formatTimeAgo } from '../utils/formatTime';
import { formatOrderPrice } from '../utils/orderText';
import { buildOriginalCargoMessage, PRIVATE_GROUP_MESSAGE_NOTE } from '../utils/originalMessage';
import { getCargoMatchPresentation } from '../utils/cargoMatch';

export default function CargoCard({
  cargo,
  showOfferButton = false,
  driverId = null,
  driverReference = null,
  canOffer = false,
  showOfferToDriverButton = false,
  showAssignToDriverButton = false,
  assignDirectly = false,
  onAssigned = null,
  canClaimInternal = false,
  onClaimed = null,
}) {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalMessage, setModalMessage] = useState('');
  const [phone, setPhone] = useState(null);
  const [telegramUsername, setTelegramUsername] = useState(null);
  const [contactChatId, setContactChatId] = useState(null);
  const [contactOwnerName, setContactOwnerName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [offerError, setOfferError] = useState(null);
  const [showClubModal, setShowClubModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showOriginalMessage, setShowOriginalMessage] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [claimingInternal, setClaimingInternal] = useState(false);
  const hasMessageAction = Boolean(cargo.messageUrl || cargo.messageIsPrivateGroup);
  const isInternalLoad = cargo.internalManaged === true;
  const matchPresentation = getCargoMatchPresentation(cargo.matchInfo);

  const handleRequestPhone = async () => {
    setLoading(true);
    try {
      const result = await handlePhoneAccess(requestCargoPhone, cargo.id);

      setModalType(result.type);
      setModalMessage(result.message || '');
      setPhone(result.phone || null);
      setTelegramUsername(result.telegramUsername || null);
      setContactChatId(result.chatId || null);
      setContactOwnerName(result.ownerName || null);
      setShowModal(true);
    } catch (error) {
      setModalType('error');
      setModalMessage('Xatolik yuz berdi');
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOffer = async () => {
    // Check if user has offer permission
    if (!canOffer) {
      setShowClubModal(true);
      return;
    }

    if (!driverId || !cargo.id) {
      alert('Taklif yuborishda xatolik: Ma\'lumotlar yetarli emas');
      return;
    }

    // Check if price exists
    if (!cargo.priceUzs || cargo.priceUzs <= 0) {
      // Open price input modal instead of showing error
      setShowPriceModal(true);
      return;
    }

    // Price exists, ask for confirmation before sending
    if (!window.confirm('Ushbu yukni haydovchiga taklif qilmoqchimisiz?')) {
      return;
    }

    // Send offer with existing price
    sendOffer(cargo.priceUzs);
  };

  const sendOffer = async (price) => {
    setOffering(true);
    setOfferError(null);

    try {
      const response = await offerForDriver(driverId, cargo.id, price);
      if (response.code === 200) {
        setOfferSuccess(true);
        setShowPriceModal(false); // Close price modal if it was open
        setTimeout(() => setOfferSuccess(false), 3000);
      } else {
        setOfferError(response.message || 'Taklif yuborishda xatolik');
      }
    } catch (error) {
      setOfferError(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setOffering(false);
    }
  };

  const handleDirectAssign = async () => {
    const reference = driverReference || driverId;
    if (!reference || !cargo.id) {
      setOfferError("Biriktirish uchun haydovchi ma'lumoti yetarli emas");
      return;
    }
    if (!window.confirm('Ushbu yukni haydovchiga tasdiqsiz biriktirasizmi?')) return;

    setOffering(true);
    setOfferError(null);
    try {
      const response = await assignOrderToDriver(cargo.id, reference);
      if (response.code === 200) {
        setOfferSuccess(true);
        onAssigned?.(cargo.id);
      } else {
        setOfferError(response.message || 'Yukni biriktirib bo\'lmadi');
      }
    } catch (error) {
      setOfferError(error.response?.data?.message || 'Yukni biriktirib bo\'lmadi');
    } finally {
      setOffering(false);
    }
  };

  const handleClaimInternal = async () => {
    if (!cargo.id || !window.confirm("Bu yukni ichki logistlar boshqaruviga olasizmi? Yuk oddiy yuklar ro'yxatidan yo'qoladi.")) {
      return;
    }
    setClaimingInternal(true);
    setOfferError(null);
    try {
      const response = await claimCargoAsInternal(cargo.id);
      if (response.code === 200) {
        onClaimed?.(cargo.id, response.result);
      } else {
        setOfferError(response.message || "Yukni ichki yuk sifatida olishda xatolik");
      }
    } catch (error) {
      setOfferError(error.response?.data?.message || "Yukni ichki yuk sifatida olishda xatolik");
    } finally {
      setClaimingInternal(false);
    }
  };

  return (
    <>
      <div
        className="card"
        style={matchPresentation
          ? { border: `2px solid ${matchPresentation.border}`, background: matchPresentation.background }
          : isInternalLoad ? { border: '2px solid #f59e0b', background: '#fffbeb' } : undefined}
      >
        {matchPresentation && (
          <div style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#fff',
            border: `1px solid ${matchPresentation.border}`,
            color: matchPresentation.color,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: 800 }}>
              <span>{matchPresentation.icon} {matchPresentation.label}</span>
              <span>{cargo.matchInfo.score}%</span>
            </div>
            <div style={{ display: 'grid', gap: 3, marginTop: 6, fontSize: 12, lineHeight: 1.35 }}>
              {cargo.matchInfo.criteria.map((criterion) => (
                <span key={criterion.key}>
                  {criterion.status === 'match' ? '✓' : criterion.status === 'unknown' ? '?' : '•'} {criterion.detail}
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            {cargo.cargoName || `${cargo.fromCity || ''} → ${cargo.toCity || ''}`}
          </h3>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {isInternalLoad && (
              <span style={{ padding: '4px 8px', borderRadius: 999, background: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                ICHKI YUK
              </span>
            )}
            <SenderTypeBadge senderType={cargo.senderType} />
          </div>
        </div>
        
        <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
          <p style={{ margin: '8px 0' }}>
            📍 Qayerdan: {cargo.fromCity || 'Ko\'rsatilmagan'}
          </p>
          <p style={{ margin: '8px 0' }}>
            📍 Qayerga: {cargo.toCity || 'Ko\'rsatilmagan'}
          </p>
          
          {cargo.weightKg && (
            <p style={{ margin: '8px 0' }}>⚖️ Og'irligi: {cargo.weightKg} t</p>
          )}
          
          {cargo.vehicleType && (
            <p style={{ margin: '8px 0' }}>🚚 Transport turi: {cargo.vehicleType}</p>
          )}

          {cargo.priceUzs > 0 && (
            <p style={{ margin: '8px 0', fontWeight: 700, color: '#155724' }}>
              💰 Narxi: {formatOrderPrice(cargo.priceUzs)}
            </p>
          )}

          {cargo.additionalPhone && (
            <p style={{ margin: '8px 0', fontWeight: 600 }}>
              📞 Telefon: {cargo.additionalPhone}
            </p>
          )}
          
          {cargo.description && (
            <p style={{ 
              margin: '12px 0', 
              fontStyle: 'italic', 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px' 
            }}>
              {cargo.description}
            </p>
          )}

          {cargo.createdTime && (
            <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#999' }}>
              {formatTimeAgo(cargo.createdTime)}
            </p>
          )}

          {hasMessageAction && (
            <div style={{ marginTop: '8px' }}>
              {cargo.messageIsPrivateGroup ? (
                <button
                  type="button"
                  onClick={() => setShowOriginalMessage(true)}
                  style={{
                    display: 'inline-block',
                    padding: 0,
                    border: 0,
                    background: 'transparent',
                    fontSize: '13px',
                    color: '#0088cc',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  💬 Original xabarni ko‘rish
                </button>
              ) : (
                <a
                  href={cargo.messageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    fontSize: '13px',
                    color: '#0088cc',
                    textDecoration: 'none',
                  }}
                >
                  💬 Xabarga o‘tish
                </a>
              )}
              {cargo.messageIsPrivateGroup && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#6c757d' }}>
                  Private guruhdan olingan
                </div>
              )}
            </div>
          )}
        </div>

        {offerSuccess && (
          <div style={{ 
            margin: '15px 0', 
            padding: '10px', 
            backgroundColor: '#d4edda', 
            borderRadius: '4px', 
            color: '#155724',
            fontSize: '14px'
          }}>
            {assignDirectly ? '✓ Yuk haydovchiga biriktirildi!' : '✓ Taklif muvaffaqiyatli yuborildi!'}
          </div>
        )}

        {offerError && (
          <div style={{ 
            margin: '15px 0', 
            padding: '10px', 
            backgroundColor: '#f8d7da', 
            borderRadius: '4px', 
            color: '#721c24',
            fontSize: '14px'
          }}>
            {offerError}
          </div>
        )}

        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {canClaimInternal && !isInternalLoad && (
            <button
              className="btn btn-success"
              onClick={handleClaimInternal}
              disabled={claimingInternal}
              style={{ width: '100%', fontWeight: 800 }}
            >
              {claimingInternal ? 'Olinmoqda...' : '✓ Oldim'}
            </button>
          )}

          {showOfferButton && assignDirectly && (
            <button
              className="btn btn-success"
              onClick={handleDirectAssign}
              disabled={offering || offerSuccess}
              style={{ width: '100%' }}
            >
              {offering ? 'Biriktirilmoqda...' : offerSuccess ? '✓ Biriktirildi' : '✓ Haydovchiga biriktirish'}
            </button>
          )}

          {showOfferButton && !assignDirectly && (
            <button
              className="btn btn-success"
              onClick={handleOffer}
              disabled={offering || offerSuccess}
              style={{ width: '100%' }}
            >
              {offering ? 'Yuborilmoqda...' : offerSuccess ? '✓ Yuborildi' : '📨 Taklif qilish'}
            </button>
          )}

          {showOfferToDriverButton && (
            <button
              className="btn btn-primary"
              onClick={() => setShowOfferModal(true)}
              style={{ width: '100%' }}
            >
              👤 Haydovchiga taklif
            </button>
          )}

          {showAssignToDriverButton && (
            <button
              className="btn btn-success"
              onClick={() => setShowAssignModal(true)}
              style={{ width: '100%' }}
            >
              ✓ Haydovchiga biriktirish
            </button>
          )}
          
          <button
            className="btn btn-primary"
            onClick={handleRequestPhone}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Yuklanmoqda...' : 'Telefon raqamni ko\'rish'}
          </button>
        </div>
      </div>

      {showModal && (
        <PhoneAccessModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          type={modalType}
          message={modalMessage}
          phone={phone}
          telegramUsername={telegramUsername}
          chatId={contactChatId}
          ownerName={contactOwnerName}
          cargoId={cargo.id}
          featureKey="viewCargoPhone"
        />
      )}

      <ClubMembershipModal 
        isOpen={showClubModal}
        onClose={() => setShowClubModal(false)}
        featureKey="offerToDriver"
        message="Haydovchiga yuk taklif qilish uchun premium tarif yoki admin ruxsati kerak."
      />

      <OfferToDriverModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        cargo={cargo}
      />

      <PriceInputModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        onSubmit={(price) => sendOffer(price)}
        cargoName={cargo.cargoName || `${cargo.fromCity || ''} → ${cargo.toCity || ''}`}
        offering={offering}
        offerError={offerError}
      />

      <AssignToDriverModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        cargo={cargo}
        onAssigned={onAssigned}
      />

      {showOriginalMessage && (
        <div className="modal-overlay" onClick={() => setShowOriginalMessage(false)}>
          <div
            className="modal-content"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 620, padding: 0, overflow: 'hidden' }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e9ecef' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20 }}>Original xabar</h3>
                  <div style={{ marginTop: 6, fontSize: 13, color: '#6c757d' }}>
                    Private guruhdan olingan
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOriginalMessage(false)}
                  aria-label="Yopish"
                  style={{
                    width: 36,
                    height: 36,
                    border: '1px solid #dee2e6',
                    borderRadius: 8,
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ padding: 12, borderRadius: 8, background: '#fff3cd', color: '#664d03', fontSize: 14, lineHeight: 1.45, marginBottom: 16 }}>
                {PRIVATE_GROUP_MESSAGE_NOTE}
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 16,
                  borderRadius: 8,
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: '#212529',
                }}
              >
                {buildOriginalCargoMessage(cargo)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
