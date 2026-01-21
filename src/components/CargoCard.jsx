import React, { useState } from 'react';
import PhoneAccessModal from './PhoneAccessModal';
import { handlePhoneAccess } from '../services/phoneAccess';
import { requestCargoPhone, offerForDriver } from '../services/api';
import ClubMembershipModal from './ClubMembershipModal';
import OfferToDriverModal from './OfferToDriverModal';
import PriceInputModal from './PriceInputModal';

export default function CargoCard({ 
  cargo, 
  showOfferButton = false, 
  driverId = null, 
  isInternalDispatcher = false,
  showOfferToDriverButton = false
}) {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalMessage, setModalMessage] = useState('');
  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [offerError, setOfferError] = useState(null);
  const [showClubModal, setShowClubModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);

  const handleRequestPhone = async () => {
    setLoading(true);
    try {
      const result = await handlePhoneAccess(requestCargoPhone, cargo.id);
      
      if (result.success && result.isPremium) {
        setModalType('success');
        setModalMessage('Telefon raqam:');
        setPhone(result.phone);
      } else if (result.success && !result.isPremium) {
        setModalType('premium');
        setModalMessage('Telefon raqamni ko\'rish uchun Premium tarif kerak');
        setPhone(null);
      } else {
        setModalType('error');
        setModalMessage('Xatolik yuz berdi');
        setPhone(null);
      }
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
    // Check if user has internal dispatcher access
    if (!isInternalDispatcher) {
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

  return (
    <>
      <div className="card">
        <div style={{ marginBottom: '15px' }}>
          <h3 className="card-title">
            {cargo.cargoName || `${cargo.fromCity || ''} → ${cargo.toCity || ''}`}
          </h3>
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
              Yaratilgan: {new Date(cargo.createdTime).toLocaleDateString('uz-UZ')}
            </p>
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
            ✓ Taklif muvaffaqiyatli yuborildi!
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
          {showOfferButton && (
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
        />
      )}

      <ClubMembershipModal 
        isOpen={showClubModal}
        onClose={() => setShowClubModal(false)}
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
    </>
  );
}
