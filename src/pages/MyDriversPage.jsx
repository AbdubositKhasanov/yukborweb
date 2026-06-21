import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyInvitedUsers, getUserMe, updateCounterpartyDriverStatus, getLocationsAndVehicles, addInvitedUser } from '../services/api';
import { formatBalance, getBalanceColor } from '../utils/formatBalance';
import { showSuccess, showError } from '../utils/toast';
import ClubMembershipModal from '../components/ClubMembershipModal';
import CounterpartyTransportModal from '../components/CounterpartyTransportModal';

const ROLE_FILTERS = [
  { key: 'driver', label: 'Haydovchilar' },
  { key: 'factory', label: 'Yuk egalari' },
];

const ROLE_LABELS = {
  driver: 'Haydovchi',
  factory: 'Yuk egasi',
};

export default function MyDriversPage() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [showClubModal, setShowClubModal] = useState(false);
  const [staticData, setStaticData] = useState(null);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [transportModalMode, setTransportModalMode] = useState('create');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeRole, setActiveRole] = useState('driver');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('driver');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadDrivers();
    loadUserData();
    loadStaticData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await getUserMe();
      if (response.code === 200 && response.result) {
        setPermissions(response.result.permissions || null);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  const loadStaticData = async () => {
    try {
      const response = await getLocationsAndVehicles();
      if (response.code === 200) {
        setStaticData(response.result);
      }
    } catch (err) {
      console.error('Failed to load static data:', err);
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
    // Check if user has offer permission
    if (!permissions?.offerToDriver) {
      setShowClubModal(true);
      return;
    }

    const transportForm = driver.driverTransportForm;
    
    // Prepare filters based on driver's transport data
    const filters = {
      fromCountry: transportForm?.fromLocation?.countryId,
      fromRegion: transportForm?.fromLocation?.regionId,
      fromCity: transportForm?.fromLocation?.cityId,
      vehicleTypeId: transportForm?.vehicleTypeId, // Use vehicleTypeId instead of vehicleType
      maxWeight: transportForm?.maxWeight
    };

    console.log('Driver transport filters:', {
      driverId: driver.chatId,
      driverName: driver.name,
      vehicleTypeId: transportForm?.vehicleTypeId,
      filters: filters
    });

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

  const handleStatusUpdate = async (driverId, status) => {
    try {
      const response = await updateCounterpartyDriverStatus(driverId, status);
      if (response.code === 200) {
        // Success - update only this driver's status in local state (no reload!)
        setDrivers(prevDrivers =>
          prevDrivers.map(driver =>
            String(driver.chatId || driver.id || driver._id) === String(driverId)
              ? { ...driver, driverCurrentStatus: status }
              : driver
          )
        );
      } else {
        throw new Error(response.message || 'Status yangilanmadi');
      }
    } catch (error) {
      console.error('Status update error:', error);
      throw error; // Re-throw to trigger revert in DriverCard
    }
  };

  const handleAddTransport = (driver) => {
    setSelectedDriver(driver);
    setTransportModalMode('create');
    setShowTransportModal(true);
  };

  const handleEditTransport = (driver) => {
    setSelectedDriver(driver);
    setTransportModalMode('edit');
    setShowTransportModal(true);
  };

  const handleTransportModalClose = () => {
    setShowTransportModal(false);
    setSelectedDriver(null);
  };

  const handleTransportSuccess = () => {
    loadDrivers(); // Reload drivers to get updated transport data
  };

  const handleInviteDriver = async (e) => {
    e.preventDefault();

    if (!invitePhone || !invitePhone.trim()) {
      showError('Telefon raqamini kiriting');
      return;
    }
    if (!inviteName || !inviteName.trim()) {
      showError('Ism kiriting');
      return;
    }

    setInviting(true);

    try {
      const response = await addInvitedUser({
        phone: invitePhone.trim(),
        name: inviteName.trim(),
        type: inviteRole,
      });

      if (response.code === 200) {
        showSuccess(`${ROLE_LABELS[inviteRole] || 'Hamkor'} muvaffaqiyatli qo'shildi!`);
        setShowInviteModal(false);
        setInviteName('');
        setInvitePhone('');
        setInviteRole(activeRole);
        loadDrivers(); // Reload to show new driver
      } else {
        showError(response.message || 'Hamkorni qo\'shib bo\'lmadi');
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setInviting(false);
    }
  };

  const openInviteModal = (role = activeRole) => {
    setInviteRole(role);
    setShowInviteModal(true);
  };

  const handleCopyLink = async (driver) => {
    if (!driver?.deepLink) return;
    await navigator.clipboard.writeText(driver.deepLink);
    showSuccess('Ro\'yxatdan o\'tish linki nusxalandi');
  };

  const visibleDrivers = drivers.filter((driver) => (driver.type || 'driver') === activeRole);
  const currentRoleLabel = ROLE_LABELS[activeRole] || 'Hamkor';

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
        <h1 className="page-title">Hamkorlarim</h1>
        <div className="loading">Yuklanmoqda...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1 className="page-title">Hamkorlarim</h1>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h1 className="page-title" style={{ margin: 0 }}>Hamkorlarim</h1>
        <button
          className="btn btn-primary"
          onClick={() => openInviteModal(activeRole)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span style={{ fontSize: '18px' }}>+</span> {currentRoleLabel} qo'shish
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {ROLE_FILTERS.map((role) => (
          <button
            key={role.key}
            type="button"
            onClick={() => setActiveRole(role.key)}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: `1px solid ${activeRole === role.key ? '#1976d2' : '#d6dde8'}`,
              background: activeRole === role.key ? '#1976d2' : '#fff',
              color: activeRole === role.key ? '#fff' : '#334155',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {role.label} · {drivers.filter((driver) => (driver.type || 'driver') === role.key).length}
          </button>
        ))}
      </div>

      {visibleDrivers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>👥</div>
          <h3 style={{ marginBottom: '10px', color: '#666' }}>
            Hozircha {activeRole === 'driver' ? 'haydovchilar' : 'yuk egalari'} yo'q
          </h3>
          <p style={{ color: '#999', marginBottom: '20px' }}>
            Ism va telefon orqali qo'shing. Ro'yxatdan o'tmagan bo'lsa ham ichki logist uchun pending yozuv yaratiladi.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => openInviteModal(activeRole)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ fontSize: '18px' }}>+</span> {currentRoleLabel} qo'shish
          </button>
        </div>
      ) : (
        <div className="grid">
          {visibleDrivers.map((driver) => (
            <DriverCard
              key={driver.id || driver.chatId || driver.phone}
              driver={driver}
              onFindOrder={handleFindOrder}
              onStatusUpdate={handleStatusUpdate}
              onAddTransport={handleAddTransport}
              onEditTransport={handleEditTransport}
              onCopyLink={handleCopyLink}
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
        featureKey="offerToDriver"
        message="Haydovchilarga mos yuk topish va taklif yuborish uchun premium tarif kerak."
      />

      <CounterpartyTransportModal
        isOpen={showTransportModal}
        onClose={handleTransportModalClose}
        onSuccess={handleTransportSuccess}
        staticData={staticData}
        driver={selectedDriver}
        mode={transportModalMode}
      />

      {/* Invite Driver Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 className="card-title">Hamkor qo'shish</h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
              Haydovchi yoki yuk egasi hali ro'yxatdan o'tmagan bo'lsa ham ichki logist uni oldindan yaratishi mumkin.
            </p>

            <form onSubmit={handleInviteDriver}>
              <div className="form-group">
                <label className="form-label">
                  Rol <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  className="form-input"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  disabled={inviting}
                >
                  <option value="driver">Haydovchi</option>
                  <option value="factory">Yuk egasi</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Ism <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Aliyev Ali"
                  autoFocus
                  disabled={inviting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Telefon raqami <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="tel"
                  className="form-input"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+998901234567"
                  disabled={inviting}
                />
              </div>

              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteName('');
                    setInvitePhone('');
                  }}
                  disabled={inviting}
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={inviting}
                >
                  {inviting ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DriverCard({ driver, onFindOrder, formatDate, getStatusColor, getStatusText, onStatusUpdate, onAddTransport, onEditTransport, onCopyLink }) {
  const transportForm = driver.driverTransportForm;
  const isOnline = driver.driverCurrentStatus === true;
  const hasTransport = transportForm && (
    transportForm.loc1 ||
    transportForm.vehicleType ||
    transportForm.maxWeight ||
    transportForm.stateNumber ||
    transportForm.additionalPhone
  );
  const isDriver = (driver.type || 'driver') === 'driver';
  const isRegistered = driver.isRegistered === true || Boolean(driver.chatId);
  const driverReference = driver.chatId || driver.id || driver._id;
  
  // Local state for optimistic update - initialized from driverCurrentStatus
  const [isActive, setIsActive] = useState(driver.driverCurrentStatus === true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Update local state when driver prop changes (from parent update)
  useEffect(() => {
    setIsActive(driver.driverCurrentStatus === true);
  }, [driver.driverCurrentStatus]);

  const handleStatusToggle = async () => {
    const newStatus = !isActive;
    const previousStatus = isActive;
    
    // Optimistic update
    setIsActive(newStatus);
    setUpdatingStatus(true);

    try {
      await onStatusUpdate(driverReference, newStatus);
      // Success - keep the new status (parent state already updated)
    } catch (error) {
      // Error - revert to previous status
      setIsActive(previousStatus);
      console.error('Failed to update driver status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

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
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexDirection: 'column' }}>
          <span style={{
            padding: '5px 10px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background: isRegistered ? '#d4edda' : '#fff3cd',
            color: isRegistered ? '#155724' : '#8a5a00',
          }}>
            {isRegistered ? 'Ro\'yxatdan o\'tgan' : 'Hali ro\'yxatdan o\'tmagan'}
          </span>
          {isDriver && hasTransport && (
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
          )}
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

      {!isRegistered && (
        <div style={{
          marginBottom: 15,
          padding: 12,
          backgroundColor: '#fff8e1',
          border: '1px solid #ffe0a3',
          borderRadius: 8,
          color: '#7a5200',
          fontSize: 13,
        }}>
          Bu hamkor hali bot/saytda ro'yxatdan o'tmagan. Siz baribir transport ma'lumotlarini boshqarishingiz mumkin; link yuborilsa keyin avtomatik ulanadi.
          {driver.deepLink && (
            <button
              type="button"
              onClick={() => onCopyLink(driver)}
              style={{
                display: 'block',
                marginTop: 8,
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid #f2c76d',
                background: '#fff',
                color: '#7a5200',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Ro'yxatdan o'tish linkini nusxalash
            </button>
          )}
        </div>
      )}

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
      {isDriver && hasTransport ? (
        <div style={{ marginBottom: '15px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px'
          }}>
            <p style={{
              fontSize: '13px',
              color: '#999',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600'
            }}>
              Transport ma'lumotlari
            </p>
            <button
              type="button"
              onClick={() => onEditTransport(driver)}
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                cursor: 'pointer',
                fontSize: '13px',
                padding: '4px 8px',
                borderRadius: '4px'
              }}
            >
              Tahrirlash
            </button>
          </div>
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
      ) : isDriver ? (
        <div style={{ marginBottom: '15px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onAddTransport(driver)}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>+</span> Transport qo'shish
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 15, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8, color: '#666', fontSize: 14 }}>
          Yuk egasi uchun kontakt va ro'yxatdan o'tish holati boshqariladi.
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

      {/* Driver Status Toggle */}
      {isDriver && hasTransport && (
      <div style={{
        marginBottom: '15px',
        padding: '14px',
        backgroundColor: isActive ? '#d4edda' : '#f8d7da',
        borderRadius: '8px',
        border: `1px solid ${isActive ? '#c3e6cb' : '#f5c6cb'}`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: isActive ? '#155724' : '#721c24',
              marginBottom: '4px'
            }}>
              {isActive ? '✅ Bo\'sh' : '🔴 Band'}
            </div>
            <div style={{
              fontSize: '12px',
              color: isActive ? '#155724' : '#721c24',
              opacity: 0.8
            }}>
              {isActive ? 'Haydovchi buyurtma qabul qiladi' : 'Haydovchi band'}
            </div>
          </div>
          
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: '52px',
            height: '28px',
            cursor: updatingStatus ? 'not-allowed' : 'pointer',
            opacity: updatingStatus ? 0.6 : 1
          }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={handleStatusToggle}
              disabled={updatingStatus}
              style={{
                opacity: 0,
                width: 0,
                height: 0
              }}
            />
            <span style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isActive ? '#28a745' : '#dc3545',
              borderRadius: '28px',
              transition: '0.3s',
              cursor: updatingStatus ? 'not-allowed' : 'pointer'
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '20px',
                width: '20px',
                left: isActive ? '28px' : '4px',
                bottom: '4px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: '0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </span>
          </label>
        </div>
        {updatingStatus && (
          <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#666',
            textAlign: 'center'
          }}>
            Yuklanmoqda...
          </div>
        )}
      </div>
      )}

      {/* Action Button */}
      {isDriver && (
        <button
          className="btn btn-primary"
          onClick={() => onFindOrder(driver)}
          disabled={!isRegistered}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '15px',
            fontWeight: '600',
            opacity: isRegistered ? 1 : 0.65,
            cursor: isRegistered ? 'pointer' : 'not-allowed',
          }}
        >
          {isRegistered ? '🔍 Buyurtma topish' : 'Ro\'yxatdan o\'tgach buyurtma taklif qilinadi'}
        </button>
      )}
    </div>
  );
}
