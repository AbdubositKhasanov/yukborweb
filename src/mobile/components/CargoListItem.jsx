/**
 * Cargo List Item Component
 * Compact cargo card for list views
 * Supports offer to driver functionality
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatTimeAgo } from '../../utils/formatTime';
import { offerForDriver, assignOrderToDriver } from '../../services/api';
import BottomSheet from './BottomSheet';
import SenderTypeBadge from '../../components/SenderTypeBadge';
import { buildOriginalCargoMessage, PRIVATE_GROUP_MESSAGE_NOTE } from '../../utils/originalMessage';
import { canOpenTelegramMessageLink, CONTACT_FALLBACK_MESSAGE } from '../../utils/telegramLinks';
import AssignToDriverModal from '../../components/AssignToDriverModal';
import { getCargoMatchPresentation } from '../../utils/cargoMatch';

export default function CargoListItem({
  cargo,
  onClick,
  showOfferButton = false,
  driverId = null,
  driverReference = null,
  canOffer = false,
  assignDirectly = false,
  showAssignToDriverButton = false,
  onAssigned = null,
}) {
  const navigate = useNavigate();
  const [offerSheet, setOfferSheet] = useState(false);
  const [priceInput, setPriceInput] = useState(cargo.priceUzs?.toString() || '');
  const [offering, setOffering] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [messageSheet, setMessageSheet] = useState(false);
  const [assignModal, setAssignModal] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick(cargo);
    } else {
      navigate(`/mobile/cargo/${cargo.id || cargo._id}`);
    }
  };

  const handleOfferClick = (e) => {
    e.stopPropagation();
    setOfferSheet(true);
    setOfferError('');
  };

  const handleMessageClick = (e) => {
    e.stopPropagation();
    if (cargo.messageIsPrivateGroup || !canOpenTelegramMessageLink(cargo.messageUrl)) {
      e.preventDefault();
      setMessageSheet(true);
    }
  };

  const handleSendOffer = async () => {
    const price = parseFloat(priceInput);
    if (!price || price <= 0) {
      setOfferError('Narxni kiriting');
      return;
    }

    if (!driverId || !cargo.id) {
      setOfferError('Ma\'lumotlar yetarli emas');
      return;
    }

    try {
      setOffering(true);
      setOfferError('');
      const response = await offerForDriver(driverId, cargo.id, price);

      if (response.code === 200) {
        setOfferSuccess(true);
        setTimeout(() => {
          setOfferSheet(false);
          setOfferSuccess(false);
        }, 1500);
      } else {
        setOfferError(response.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      setOfferError('Xatolik yuz berdi');
    } finally {
      setOffering(false);
    }
  };

  const handleDirectAssign = async (event) => {
    event.stopPropagation();
    const reference = driverReference || driverId;
    if (!reference || !cargo.id) {
      setOfferError("Biriktirish uchun haydovchi ma'lumoti yetarli emas");
      return;
    }
    if (!window.confirm('Ushbu yukni haydovchiga tasdiqsiz biriktirasizmi?')) return;

    try {
      setOffering(true);
      setOfferError('');
      const response = await assignOrderToDriver(cargo.id, reference);
      if (response.code === 200) {
        setOfferSuccess(true);
        onAssigned?.(cargo.id);
      } else {
        const message = response.message || 'Yukni biriktirib bo\'lmadi';
        setOfferError(message);
        window.alert(message);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Yukni biriktirib bo\'lmadi';
      setOfferError(message);
      window.alert(message);
    } finally {
      setOffering(false);
    }
  };

  // Format location
  const formatLocation = (city, region) => {
    if (city) return city;
    if (region) return region;
    return 'Noma\'lum';
  };

  const fromLocation = formatLocation(cargo.fromCity, cargo.fromRegion);
  const toLocation = formatLocation(cargo.toCity, cargo.toRegion);

  // Format price
  const formatPrice = (price) => {
    if (!price) return '';
    return Number(price).toLocaleString('uz-UZ').replace(/,/g, ' ');
  };

  // Time display
  const timeAgo = formatTimeAgo(cargo.createdAt || cargo.created_at);
  const isNew = timeAgo === 'Hozirgina tushdi';
  const hasMessageAction = Boolean(cargo.messageUrl || cargo.messageIsPrivateGroup);
  const canOpenMessageLink = canOpenTelegramMessageLink(cargo.messageUrl);
  const hasLeadingMeta = Boolean(cargo.vehicleType || cargo.priceUzs);
  const isInternalLoad = cargo.internalManaged === true;
  const matchPresentation = getCargoMatchPresentation(cargo.matchInfo);

  return (
    <>
      <div
        className="m-list-item m-card-tap"
        onClick={handleClick}
        style={matchPresentation
          ? { borderLeft: `4px solid ${matchPresentation.border}`, background: matchPresentation.background }
          : isInternalLoad ? { borderLeft: '4px solid #f59e0b', background: '#fffbeb' } : undefined}
      >
        <div className="m-list-item-content">
          {matchPresentation && (
            <div style={{ marginBottom: 6, color: matchPresentation.color }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, fontWeight: 800 }}>
                <span>{matchPresentation.icon} {matchPresentation.label}</span>
                <span>· {cargo.matchInfo.score}%</span>
              </div>
              <div style={{ marginTop: 3, display: 'grid', gap: 2, fontSize: 10, lineHeight: 1.3 }}>
                {cargo.matchInfo.criteria.map((criterion) => (
                  <span key={criterion.key}>
                    {criterion.status === 'match' ? '✓' : criterion.status === 'unknown' ? '?' : '•'} {criterion.detail}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="m-list-item-title" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>
              {cargo.cargoName || cargo.cargo_name || 'Yuk'}
              {cargo.weight && ` ${cargo.weight}t`}
            </span>
            <SenderTypeBadge senderType={cargo.senderType} />
            {isInternalLoad && (
              <span style={{ padding: '3px 6px', borderRadius: 999, background: '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 800 }}>
                ICHKI
              </span>
            )}
          </p>
          <p className="m-list-item-subtitle">
            {fromLocation} → {toLocation}
          </p>
          <div className="m-list-item-meta">
            {cargo.vehicleType && <span>{cargo.vehicleType}</span>}
            {cargo.vehicleType && cargo.priceUzs && <span>•</span>}
            {cargo.priceUzs && <span>{formatPrice(cargo.priceUzs)} so'm</span>}
            {hasMessageAction && (
              <>
                {hasLeadingMeta && <span>•</span>}
                {cargo.messageIsPrivateGroup || !canOpenMessageLink ? (
                  <button
                    type="button"
                    onClick={handleMessageClick}
                    style={{
                      padding: 0,
                      border: 0,
                      background: 'transparent',
                      color: '#0088cc',
                      font: 'inherit',
                      textDecoration: 'none',
                    }}
                  >
                    💬 Original xabar
                  </button>
                ) : (
                  <a
                    href={cargo.messageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleMessageClick}
                    style={{ color: '#0088cc', textDecoration: 'none' }}
                  >
                    💬 Xabar
                  </a>
                )}
                {(cargo.messageIsPrivateGroup || !canOpenMessageLink) && <span>Saytda ko'rish</span>}
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          {showAssignToDriverButton ? (
            <button
              className="m-btn m-btn-success"
              onClick={(event) => {
                event.stopPropagation();
                setAssignModal(true);
              }}
              style={{ padding: '6px 10px', fontSize: 12, minHeight: 32 }}
            >
              ✓ Biriktirish
            </button>
          ) : showOfferButton && assignDirectly ? (
            <button
              className="m-btn m-btn-success"
              onClick={handleDirectAssign}
              disabled={offering || offerSuccess}
              style={{ padding: '6px 10px', fontSize: 12, minHeight: 32 }}
            >
              {offering ? '...' : offerSuccess ? '✓' : '✓ Biriktirish'}
            </button>
          ) : showOfferButton ? (
            <button
              className="m-btn m-btn-success"
              onClick={handleOfferClick}
              style={{ padding: '6px 12px', fontSize: 13, minHeight: 32 }}
            >
              📨 Taklif
            </button>
          ) : (
            <>
              <span style={{ fontSize: 13, color: isNew ? 'var(--m-success)' : 'var(--m-text-muted)' }}>
                {isNew ? 'Yangi' : timeAgo.split(' ')[1] ? timeAgo.split(' ')[0] + ' ' + timeAgo.split(' ')[1].slice(0,2) : timeAgo}
              </span>
              <span className="m-list-item-arrow">→</span>
            </>
          )}
        </div>
      </div>

      {/* Offer Bottom Sheet */}
      <BottomSheet
        isOpen={offerSheet}
        onClose={() => {
          setOfferSheet(false);
          setOfferError('');
        }}
        title="📨 Haydovchiga taklif"
        footer={
          <button
            className="m-btn m-btn-success m-btn-full m-btn-lg"
            onClick={handleSendOffer}
            disabled={offering || offerSuccess}
          >
            {offering ? 'Yuborilmoqda...' : offerSuccess ? '✓ Yuborildi!' : 'Taklif yuborish'}
          </button>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--m-bg)', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {cargo.cargoName || cargo.cargo_name || 'Yuk'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--m-text-secondary)' }}>
              {fromLocation} → {toLocation}
            </div>
          </div>

          <div className="m-form-group">
            <label className="m-form-label required">Narx (so'm)</label>
            <input
              type="number"
              className={`m-form-input ${offerError && !priceInput ? 'error' : ''}`}
              placeholder="1000000"
              value={priceInput}
              onChange={(e) => {
                setPriceInput(e.target.value);
                setOfferError('');
              }}
              inputMode="numeric"
            />
            {offerError && <p className="m-form-error">{offerError}</p>}
          </div>

          {offerSuccess && (
            <div style={{ padding: 12, background: '#d4edda', borderRadius: 8, color: '#155724', textAlign: 'center' }}>
              ✓ Taklif muvaffaqiyatli yuborildi!
            </div>
          )}
        </div>
      </BottomSheet>

      <AssignToDriverModal
        isOpen={assignModal}
        onClose={() => setAssignModal(false)}
        cargo={cargo}
        onAssigned={onAssigned}
      />

      <BottomSheet
        isOpen={messageSheet}
        onClose={() => setMessageSheet(false)}
        title="💬 Original xabar"
        height="full"
        footer={
          <button className="m-btn m-btn-primary m-btn-full m-btn-lg" onClick={() => setMessageSheet(false)}>
            Yopish
          </button>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ padding: 12, borderRadius: 8, background: '#fff3cd', color: '#664d03', fontSize: 14, lineHeight: 1.45 }}>
            {cargo.messageIsPrivateGroup ? PRIVATE_GROUP_MESSAGE_NOTE : CONTACT_FALLBACK_MESSAGE}
          </div>
          <pre
            style={{
              margin: 0,
              padding: 14,
              borderRadius: 8,
              background: 'var(--m-bg)',
              border: '1px solid var(--m-border)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
              fontSize: 15,
              lineHeight: 1.55,
              color: 'var(--m-text)',
            }}
          >
            {buildOriginalCargoMessage(cargo)}
          </pre>
        </div>
      </BottomSheet>
    </>
  );
}
