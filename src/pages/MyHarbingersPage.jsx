import React, { useState, useEffect } from 'react';
import { getMyHarbingers, deleteHarbinger, resumeHarbinger } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function MyHarbingersPage() {
  const navigate = useNavigate();
  const [harbingers, setHarbingers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumingId, setResumingId] = useState(null);

  useEffect(() => {
    loadHarbingers();
  }, []);

  const loadHarbingers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyHarbingers();
      if (response.code === 200) {
        setHarbingers(response.result);
      } else {
        setError(response.message || 'Xabarchilar yuklanmadi');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (harbingerId) => {
    if (!window.confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;

    try {
      const response = await deleteHarbinger(harbingerId);
      if (response.code === 200) {
        loadHarbingers();
      }
    } catch (err) {
      console.error('Failed to delete harbinger:', err);
      alert("O'chirishda xatolik yuz berdi");
    }
  };

  const handleResume = async (harbingerId) => {
    if (!harbingerId || resumingId) return;
    setResumingId(harbingerId);
    setError(null);
    try {
      const response = await resumeHarbinger(harbingerId);
      if (response.code === 200 && response.result) {
        setHarbingers((items) => items.map((item) => (item.id === harbingerId ? response.result : item)));
      } else {
        setError(response.message || 'Xabarchini davom ettirib bo‘lmadi');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xabarchini davom ettirib bo‘lmadi');
    } finally {
      setResumingId(null);
    }
  };

  if (loading)
    return (
      <div className="container">
        <div className="loading">Yuklanmoqda...</div>
      </div>
    );
  if (error && harbingers.length === 0)
    return (
      <div className="container">
        <div className="error-message">{error}</div>
      </div>
    );

  return (
    <div className="container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>
          Xabarchilarim
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/create-harbinger')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            fontSize: '15px',
            fontWeight: '600',
          }}
        >
          <span style={{ fontSize: '18px' }}>+</span>
          <span>Xabarchi yaratish</span>
        </button>
      </div>

      {error && (
        <div className="error-message" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {harbingers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚚</div>
          <h3 style={{ marginBottom: '10px', color: '#666' }}>Hozircha xabarchilaringiz yo‘q</h3>
          <p style={{ color: '#999', marginBottom: '30px' }}>Birinchi xabarchiingizni yarating va yangi yuklar xabarini oling</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/create-harbinger')}
            style={{
              padding: '12px 30px',
              fontSize: '16px',
            }}
          >
            + Xabarchi yaratish
          </button>
        </div>
      ) : (
        <div className="grid">
          {harbingers.map((harbinger) => {
            const isPaused = harbinger.status === 'paused_confirmation_required';
            const isActive = harbinger.status === 'new' || harbinger.status === 'active';
            const batchSize = harbinger.confirmationBatchSize || 100;
            return (
              <div key={harbinger.id} className="card" style={isPaused ? { borderColor: '#f59e0b' } : undefined}>
                <div
                  style={{
                    marginBottom: '15px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h3 className="card-title" style={{ margin: 0 }}>
                    {harbinger.loc1 || 'Transport'}
                  </h3>
                  {harbinger.status && <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>{isPaused ? 'Tasdiq kutilmoqda' : isActive ? 'Faol' : 'To‘xtatilgan'}</span>}
                </div>

                <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
                  {harbinger.loc1 && <p style={{ margin: '8px 0' }}>📍 Joylashuv: {harbinger.fullLoc1 || harbinger.loc1}</p>}

                  {(harbinger.minWeight || harbinger.maxWeight) && (
                    <p style={{ margin: '8px 0' }}>
                      ⚖️ Og‘irligi:
                      {harbinger.minWeight && ` ${harbinger.minWeight.value} ${harbinger.minWeight.unit || 't'}`}
                      {harbinger.minWeight && harbinger.maxWeight && ' - '}
                      {harbinger.maxWeight && ` ${harbinger.maxWeight.value} ${harbinger.maxWeight.unit || 't'}`}
                    </p>
                  )}

                  {harbinger.weightOfCargo && (
                    <p style={{ margin: '8px 0' }}>
                      ⚖️ Yuk og‘irligi: {harbinger.weightOfCargo.value} {harbinger.weightOfCargo.unit || 't'}
                    </p>
                  )}

                  {harbinger.offersCount !== undefined && harbinger.offersCount > 0 && <p style={{ margin: '8px 0' }}>📊 Yuborilgan xabarlar: {harbinger.offersCount}</p>}

                  {isActive && (
                    <p style={{ margin: '8px 0' }}>
                      ⏱ Shu soatda: {harbinger.hourlyNotificationCount || 0}/{harbinger.hourlyNotificationLimit || 10}
                    </p>
                  )}

                  {harbinger.createdTime && <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#999' }}>Yaratilgan: {new Date(harbinger.createdTime).toLocaleDateString('uz-UZ')}</p>}
                </div>

                {isPaused && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      borderRadius: 8,
                      background: '#fffbeb',
                      color: '#78350f',
                    }}
                  >
                    <strong>Xabarchi vaqtincha to‘xtadi</strong>
                    <p style={{ margin: '6px 0 12px', fontSize: 14, lineHeight: 1.45 }}>
                      {batchSize} ta mos yuk xabari yuborildi. Davom ettirsangiz, yana {batchSize} tagacha xabar olasiz.
                    </p>
                    <button className="btn btn-primary" type="button" disabled={resumingId === harbinger.id} onClick={() => handleResume(harbinger.id)} style={{ width: '100%' }}>
                      {resumingId === harbinger.id ? 'Davom ettirilmoqda...' : `Yana ${batchSize} ta xabar olish`}
                    </button>
                  </div>
                )}

                <div style={{ marginTop: '15px' }}>
                  <button className="btn btn-danger" onClick={() => handleDelete(harbinger.id)} style={{ width: '100%' }}>
                    O‘chirish
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
