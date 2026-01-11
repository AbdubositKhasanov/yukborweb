import React, { useState, useEffect } from 'react';
import { updateDriverStatus, getUserMe, getLocationsAndVehicles } from '../services/api';
import EditTransportModal from '../components/EditTransportModal';
import { showSuccess } from '../utils/toast';
import { CardSkeleton } from '../components/LoadingSkeleton';

export default function DriverStatusPage() {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [hasTransport, setHasTransport] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [staticData, setStaticData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    setLoading(true);
    try {
      const [staticResponse, userResponse] = await Promise.all([
        getLocationsAndVehicles(),
        getUserMe()
      ]);

      if (staticResponse.code === 200) {
        setStaticData(staticResponse.result);
      }

      if (userResponse.code === 200 && userResponse.result) {
        const user = userResponse.result;
        
        if (user.driverLastLocName) {
          setHasTransport(true);
          setDriverLocation(user.driverLastLocName);
        }
        
        if (user.driverCurrentStatus !== undefined) {
          setIsActive(user.driverCurrentStatus);
        }
      }
    } catch (error) {
      console.error('Failed to initialize page:', error);
      setError('Sahifani yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!hasTransport) {
      setError('Avval transport yarating');
      return;
    }

    setUpdating(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await updateDriverStatus(newStatus);
      if (response.code === 200) {
        setIsActive(newStatus);
        showSuccess(newStatus ? 'Holat faollashtirildi!' : 'Holat to\'xtatildi!');
      } else {
        setError(response.message || 'Holatni yangilashda xatolik');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setUpdating(false);
    }
  };

  const handleEditSuccess = async (updatedLocation) => {
    try {
      // Toast notification
      showSuccess('Ma\'lumotlar muvaffaqiyatli yangilandi!');
      
      // Optimistically update location if provided
      if (updatedLocation) {
        setDriverLocation(updatedLocation);
      }
      
      // Close modal immediately
      setShowEditModal(false);
      
      // Fetch fresh data from backend without showing full loading state
      const userResponse = await getUserMe();
      
      if (userResponse.code === 200 && userResponse.result) {
        const user = userResponse.result;
        
        // Update driver location
        if (user.driverLastLocName) {
          setHasTransport(true);
          setDriverLocation(user.driverLastLocName);
        }
        
        // Update driver status
        if (user.driverCurrentStatus !== undefined) {
          setIsActive(user.driverCurrentStatus);
        }
      }
    } catch (error) {
      console.error('Failed to refresh driver data:', error);
      // Still show success since the update was successful
      // Error is only in refresh, not in the update itself
    }
  };

  if (loading) {
    return (
      <div className="container">
        <h1 className="page-title">Haydovchi holati</h1>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">Haydovchi holati</h1>

      <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 30px',
            borderRadius: '50%',
            backgroundColor: isActive ? '#28a745' : '#6c757d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>
            <span style={{
              fontSize: '48px',
              color: 'white'
            }}>
              {isActive ? '✓' : '⏸'}
            </span>
          </div>

          <h2 style={{
            marginBottom: '10px',
            color: isActive ? '#28a745' : '#6c757d'
          }}>
            {isActive ? 'Faol' : 'Nofaol'}
          </h2>

          <p style={{
            color: '#666',
            marginBottom: '30px'
          }}>
            {isActive 
              ? 'Siz hozirda yukchilar tomonidan ko\'rinasiz'
              : 'Siz hozirda yukchilar tomonidan ko\'rinmaysiz'
            }
          </p>

          {hasTransport && driverLocation && (
            <div style={{
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '30px'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#666',
                marginBottom: '5px'
              }}>
                📍 Joylashuvingiz:
              </p>
              <p style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: 'var(--brand-color)',
                margin: 0
              }}>
                {driverLocation}
              </p>
            </div>
          )}

          {!hasTransport && (
            <div className="error-message" style={{ marginBottom: '20px' }}>
              Transport yaratishingiz kerak. "Transport yaratish" sahifasiga o'ting.
            </div>
          )}

          {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '15px',
            marginTop: '30px'
          }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                className="btn btn-success"
                onClick={() => handleStatusChange(true)}
                disabled={updating || !hasTransport || isActive}
                style={{
                  flex: 1,
                  padding: '15px',
                  fontSize: '16px',
                  opacity: (!hasTransport || isActive) ? 0.6 : 1
                }}
              >
                {updating && !isActive ? 'Faollashtrilmoqda...' : 'Faollashtirish'}
              </button>

              <button
                className="btn btn-danger"
                onClick={() => handleStatusChange(false)}
                disabled={updating || !hasTransport || !isActive}
                style={{
                  flex: 1,
                  padding: '15px',
                  fontSize: '16px',
                  opacity: (!hasTransport || !isActive) ? 0.6 : 1
                }}
              >
                {updating && isActive ? 'To\'xtatilmoqda...' : 'To\'xtatish'}
              </button>
            </div>

            {hasTransport && (
              <button
                className="btn btn-primary"
                onClick={() => setShowEditModal(true)}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px'
                }}
              >
                Ma'lumotlarni tahrirlash
              </button>
            )}
          </div>

          <div style={{
            marginTop: '40px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'left'
          }}>
            <h4 style={{ marginBottom: '15px', color: 'var(--brand-color)' }}>
              💡 Ma'lumot
            </h4>
            <ul style={{
              color: '#666',
              lineHeight: '1.8',
              fontSize: '14px'
            }}>
              <li>Faol holatda bo'lganingizda yukchilar sizni ko'rishlari mumkin</li>
              <li>Nofaol holatda siz qidiruv natijalarida ko'rinmaysiz</li>
              <li>Istalgan vaqt holatni o'zgartirishingiz mumkin</li>
              <li>Ma'lumotlarni tahrirlash orqali joylashuv va boshqa ma'lumotlarni yangilashingiz mumkin</li>
            </ul>
          </div>
        </div>
      </div>

      <EditTransportModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleEditSuccess}
        staticData={staticData}
      />
    </div>
  );
}
