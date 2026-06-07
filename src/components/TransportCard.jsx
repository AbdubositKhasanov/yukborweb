import React, { useState } from 'react';
import PhoneAccessModal from './PhoneAccessModal';
import { handlePhoneAccess } from '../services/phoneAccess';
import { getTransportDetails } from '../services/api';

export default function TransportCard({ transport }) {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalMessage, setModalMessage] = useState('');
  const [phone, setPhone] = useState(null);
  const [telegramUsername, setTelegramUsername] = useState(null);
  const [contactChatId, setContactChatId] = useState(null);
  const [contactOwnerName, setContactOwnerName] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRequestPhone = async () => {
    setLoading(true);
    try {
      const result = await handlePhoneAccess(getTransportDetails, transport.id);
      
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

  return (
    <>
      <div className="card">
        <div style={{ marginBottom: '15px' }}>
          <h3 className="card-title">
            {transport.fromCity || 'Transport'}
          </h3>
        </div>
        
        <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
          <p style={{ margin: '8px 0' }}>
            📍 Joylashuv: {transport.fromCity || 'Ko\'rsatilmagan'}
          </p>
          
          {transport.maxWeight && (
            <p style={{ margin: '8px 0' }}>⚖️ Max og'irligi: {transport.maxWeight} kg</p>
          )}
          
          {transport.vehicleType && (
            <p style={{ margin: '8px 0' }}>🚚 Transport turi: {transport.vehicleType}</p>
          )}
          
          {transport.otherDesc && (
            <p style={{ 
              margin: '12px 0', 
              fontStyle: 'italic', 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px' 
            }}>
              {transport.otherDesc}
            </p>
          )}

          {transport.createdTime && (
            <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#999' }}>
              Yaratilgan: {new Date(transport.createdTime).toLocaleDateString('uz-UZ')}
            </p>
          )}
        </div>

        <div style={{ marginTop: '15px' }}>
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

      <PhoneAccessModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        type={modalType}
        message={modalMessage}
        phone={phone}
        telegramUsername={telegramUsername}
        chatId={contactChatId}
        ownerName={contactOwnerName}
      />
    </>
  );
}
