import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyInvitedUsers, getUserMe } from '../services/api';
import { formatBalance, getBalanceColor } from '../utils/formatBalance';
import ClubMembershipModal from '../components/ClubMembershipModal';

export default function MyDriversPage() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInternalDispatcher, setIsInternalDispatcher] = useState(false);
  const [showClubModal, setShowClubModal] = useState(false);

  useEffect(() => {
    loadDrivers();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await getUserMe();
      if (response.code === 200 && response.result) {
        setIsInternalDispatcher(response.result.isInternalDispatcher === true);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  const loadDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyInvitedUsers();
      if (response.code === 200) {
        setDrivers(response.result || []);
      } else {
        setError(response.message || 'Haydovchilar yuklanmadi');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleFindOrder = (driver) => {
    // Check if user has internal dispatcher access
    if (!isInternalDispatcher) {
      setShowClubModal(true);
      return;
    }

    const transportForm = driver.driverTransportForm;
    
    // Prepare filters based on driver's transport data
    const filters = {
      fromCountry: transportForm?.fromLocation?.countryId,
      fromRegion: transportForm?.fromLocation?.regionId,
      fromCity: transportForm?.fromLocation?.cityId,
      vehicleType: transportForm?.vehicleType,
      maxWeight: transportForm?.maxWeight
    };

    // Navigate to search page (cargos) with driver filters
    navigate('/', {
      state: {
        fromDriver: true,
        driverId: driver.chatId,
        driverName: driver.name,
        filters: filters
      }
    });
  };

  const getStatusColor = (isOnline) => {
    return isOnline ? '#28a745' : '#6c757d';
  };

  const getStatusText = (isOnline) => {
    return isOnline ? 'Online' : 'Offline';
  };

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Noma\'lum';
    }
  };

  if (loading) {
    return (
      <div className="container">
        <h1 className="page-title">Haydovchilarim</h1>
        <div className="loading">Yuklanmoqda...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1 className="page-title">Haydovchilarim</h1>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">Haydovchilarim</h1>

      {drivers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>👥</div>
          <h3 style={{ marginBottom: '10px', color: '#666' }}>
            Hozircha haydovchilaringiz yo'q
          </h3>
          <p style={{ color: '#999', marginBottom: '20px' }}>
            Telegram botdan haydovchilarni taklif qiling
          </p>
        </div>
      ) : (
        <div className="grid">
          {drivers.map((driver) => (
            <DriverCard
              key={driver.chatId}
              driver={driver}
              onFindOrder={handleFindOrder}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
            />
          ))}
        </div>
      )}

      <ClubMembershipModal 
        isOpen={showClubModal}
        onClose={() => setShowClubModal(false)}
      />
    </div>
  );
}

function DriverCard({ driver, onFindOrder, formatDate, getStatusColor, getStatusText }) {
  const transportForm = driver.driverTransportForm;
  const isOnline = driver.driverCurrentStatus === true;

  return (
    <div className="card">
      {/* Header with name and status */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        paddingBottom: '15px',
        borderBottom: '1px solid #e9ecef'
      }}>
        <h3 className="card-title" style={{ margin: 0 }}>
          {driver.name || 'Noma\'lum'}
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: isOnline ? '#d4edda' : '#f8f9fa',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(isOnline)
          }} />
          <span style={{ color: getStatusColor(isOnline) }}>
            {getStatusText(isOnline)}
          </span>
        </div>
      </div>

      {/* Contact Information */}
      <div style={{ marginBottom: '15px' }}>
        <p style={{
          fontSize: '13px',
          color: '#999',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: '600'
        }}>
          Aloqa
        </p>
        <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
          <p style={{ margin: '4px 0' }}>
            📞 Asosiy: <strong>{driver.phone || 'Ko\'rsatilmagan'}</strong>
          </p>
          {transportForm?.additionalPhone && transportForm.additionalPhone.trim() && (
            <p style={{ margin: '4px 0' }}>
              📱 Qo'shimcha: <strong>{transportForm.additionalPhone}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Balance */}
      <div style={{
        marginBottom: '15px',
        padding: '12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: '600' }}>
            💰 Balans:
          </span>
          <strong style={{
            fontSize: '16px',
            color: getBalanceColor(driver.balance ?? 0)
          }}>
            {formatBalance(driver.balance)}
          </strong>
        </div>
      </div>

      {/* Transport Information */}
      {transportForm && (
        <div style={{ marginBottom: '15px' }}>
          <p style={{
            fontSize: '13px',
            color: '#999',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '600'
          }}>
            Transport ma'lumotlari
          </p>
          <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
            {transportForm.loc1 && (
              <p style={{ margin: '4px 0' }}>
                📍 Joylashuv: <strong>{transportForm.loc1}</strong>
              </p>
            )}
            {transportForm.vehicleType && (
              <p style={{ margin: '4px 0' }}>
                🚚 Turi: <strong>{transportForm.vehicleType}</strong>
              </p>
            )}
            {transportForm.maxWeight && (
              <p style={{ margin: '4px 0' }}>
                ⚖️ Max og'irligi: <strong>{transportForm.maxWeight} t</strong>
              </p>
            )}
            {transportForm.stateNumber && transportForm.stateNumber.trim() ? (
              <p style={{ margin: '4px 0' }}>
                🚗 Davlat raqami: <strong>{transportForm.stateNumber}</strong>
              </p>
            ) : (
              <p style={{ margin: '4px 0', color: '#999' }}>
                🚗 Davlat raqami: <span>—</span>
              </p>
            )}
            {transportForm.otherDesc && transportForm.otherDesc.trim() && (
              <p style={{
                margin: '8px 0 4px',
                fontStyle: 'italic',
                padding: '8px',
                backgroundColor: '#fff',
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                {transportForm.otherDesc}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Last Update Time */}
      {transportForm?.time && (
        <p style={{
          margin: '0 0 15px',
          fontSize: '12px',
          color: '#999'
        }}>
          So'nggi yangilanish: {formatDate(transportForm.time)}
        </p>
      )}

      {/* Action Button */}
      <button
        className="btn btn-primary"
        onClick={() => onFindOrder(driver)}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '15px',
          fontWeight: '600'
        }}
      >
        🔍 Buyurtma topish
      </button>
    </div>
  );
}
