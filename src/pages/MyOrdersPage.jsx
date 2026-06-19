import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyOrders, deleteOrder, getUserMe } from '../services/api';
import PhoneShowModal from '../components/PhoneShowModal.jsx';
import ClubMembershipModal from '../components/ClubMembershipModal';
import BroadcastModal from '../components/BroadcastModal';
import { getOrderStatusText, getOrderStatusClass, hasAppointedDriver } from '../utils/orderStatus';
import { formatTimeAgo } from '../utils/formatTime';

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [isInternalDispatcher, setIsInternalDispatcher] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [showClubModal, setShowClubModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastOrder, setBroadcastOrder] = useState(null);

  useEffect(() => {
    loadOrders();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await getUserMe();
      if (response.code === 200 && response.result) {
        setIsInternalDispatcher(response.result.isInternalDispatcher === true);
        setPermissions(response.result.permissions || null);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyOrders();
      if (response.code === 200) {
        setOrders(response.result || []);
      } else {
        setError(response.message || 'Buyurtmalar yuklanmadi');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm('Haqiqatan ham o\'chirmoqchimisiz?')) return;

    try {
      const response = await deleteOrder(orderId);
      if (response.code === 200) {
        loadOrders();
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
      alert('O\'chirishda xatolik yuz berdi');
    }
  };

  const handleShowPhone = (phone) => {
    if (phone && phone.trim()) {
      setSelectedPhone(phone);
    } else {
      setSelectedPhone(null);
    }
    setShowPremiumModal(true);
  };

  const handleFindTransport = (order) => {
    // Check if user has offer permission
    if (!permissions?.offerToDriver) {
      setShowClubModal(true);
      return;
    }

    // Order ma'lumotlarini transport qidiruv parametrlariga map qilish
    const filters = {
      // From location
      fromCountry: order.fromLocation?.countryId,
      fromRegion: order.fromLocation?.regionId,
      fromCity: order.fromLocation?.cityId,
      // Vehicle type - order'dagi transport turini qidirishda ishlatamiz
      vehicleType: order.vehicleType
      // maxWeight ishlatmaymiz - foydalanuvchi o'zi kiritadi
    };

    console.log('Order data for transport search:', {
      orderId: order.id,
      fromCity: order.fromCity,
      toCity: order.toCity,
      weightKg: order.weightKg,
      vehicleType: order.vehicleType,
      filters: filters,
      originalOrder: order
    });

    navigate('/transports', {
      state: {
        orderId: order.id,
        fromOrder: true,
        orderInfo: {
          cargoName: order.cargoName,
          fromCity: order.fromCity,
          toCity: order.toCity,
          weightKg: order.weightKg,
          vehicleType: order.vehicleType,
          priceUzs: order.priceUzs
        },
        filters: filters
      }
    });
  };

  if (loading) return <div className="container"><div className="loading">Yuklanmoqda...</div></div>;
  if (error) return <div className="container"><div className="error-message">{error}</div></div>;

  return (
    <div className="container">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h1 className="page-title" style={{ margin: 0 }}>Buyurtmalarim</h1>
          <button
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '14px',
              minWidth: 'auto'
            }}
            title="Yangilash"
          >
            <span style={{
              display: 'inline-block',
              animation: refreshing ? 'spin 1s linear infinite' : 'none'
            }}>🔄</span>
          </button>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/create-order')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            fontSize: '15px',
            fontWeight: '600'
          }}
        >
          <span style={{ fontSize: '18px' }}>+</span>
          <span>Yangi buyurtma</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
          <h3 style={{ marginBottom: '10px', color: '#666' }}>
            Hozircha buyurtmalaringiz yo'q
          </h3>
          <p style={{ color: '#999', marginBottom: '30px' }}>
            Birinchi buyurtmangizni yarating va qulay transport toping
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/create-order')}
            style={{
              padding: '12px 30px',
              fontSize: '16px'
            }}
          >
            + Buyurtma yaratish
          </button>
        </div>
      ) : (
        <div className="grid">
          {orders.map(order => (
            <div key={order.id} className="card">
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  {order.cargoName || `${order.fromCity || ''} → ${order.toCity || ''}`}
                </h3>
                {order.status && (
                  <span className={`badge ${getOrderStatusClass(order.status)}`}>
                    {getOrderStatusText(order.status)}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
                {order.fromCity && (
                  <p style={{ margin: '8px 0' }}>
                    📍 Qayerdan: {order.fromCity}
                  </p>
                )}
                
                {order.toCity && (
                  <p style={{ margin: '8px 0' }}>
                    📍 Qayerga: {order.toCity}
                  </p>
                )}
                
                {order.weightKg && (
                  <p style={{ margin: '8px 0' }}>
                    ⚖️ Og'irligi: {order.weightKg} t
                  </p>
                )}
                
                {order.vehicleType && (
                  <p style={{ margin: '8px 0' }}>🚚 Transport turi: {order.vehicleType}</p>
                )}

                {order.priceUzs && order.priceUzs > 0 && (
                  <p style={{ margin: '8px 0' }}>
                    💰 Narxi: {order.priceUzs.toLocaleString('uz-UZ')} so'm
                  </p>
                )}

                {order.additionalPhone && order.additionalPhone.trim() && (
                  <p style={{ margin: '8px 0', fontWeight: 600 }}>
                    📞 Kontakt: {order.additionalPhone}
                  </p>
                )}

                {hasAppointedDriver(order.status) && order.driverPhone && order.driverPhone.trim() && (
                  <p style={{ 
                    margin: '12px 0', 
                    padding: '12px', 
                    backgroundColor: '#d4edda', 
                    borderRadius: '6px',
                    fontWeight: '600',
                    color: '#155724'
                  }}>
                    📞 Haydovchi telefoni: {order.driverPhone}
                  </p>
                )}
                
                {order.description && order.description !== 'null' && order.description.trim() && (
                  <p style={{ 
                    margin: '12px 0', 
                    fontStyle: 'italic', 
                    padding: '10px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '4px' 
                  }}>
                    {order.description}
                  </p>
                )}

                {order.createdTime && (
                  <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#999' }}>
                    {formatTimeAgo(order.createdTime)}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
                {!hasAppointedDriver(order.status) && (
                  <button
                    className="btn btn-success"
                    onClick={() => handleFindTransport(order)}
                    style={{ width: '100%' }}
                  >
                    🚚 Mashina topish
                  </button>
                )}

                {isInternalDispatcher && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setBroadcastOrder(order);
                      setShowBroadcastModal(true);
                    }}
                    style={{ width: '100%', backgroundColor: '#6f42c1', borderColor: '#6f42c1' }}
                  >
                    📡 Guruhlarga tarqatish
                  </button>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleShowPhone(order.additionalPhone)}
                    style={{ flex: 1 }}
                  >
                    Telefon raqam
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(order.id)}
                    style={{ flex: 1 }}
                  >
                    O'chirish
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPremiumModal && (
        <PhoneShowModal
          phoneNumber={selectedPhone}
          onClose={() => {
            setShowPremiumModal(false);
            setSelectedPhone(null);
          }}
        />
      )}

      <ClubMembershipModal
        isOpen={showClubModal}
        onClose={() => setShowClubModal(false)}
        featureKey="offerToDriver"
        message="Buyurtma uchun transport topish va taklif yuborish premium tarif orqali ochiladi."
      />

      <BroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => {
          setShowBroadcastModal(false);
          setBroadcastOrder(null);
        }}
        order={broadcastOrder}
      />
    </div>
  );
}
