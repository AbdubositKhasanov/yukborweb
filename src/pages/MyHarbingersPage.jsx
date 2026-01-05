import React, { useState, useEffect } from 'react';
import { getMyHarbingers, deleteHarbinger } from '../services/api';

export default function MyHarbingersPage() {
  const [harbingers, setHarbingers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setError(response.message || 'Harbingerlar yuklanmadi');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (harbingerId) => {
    if (!window.confirm('Haqiqatan ham o\'chirmoqchimisiz?')) return;

    try {
      const response = await deleteHarbinger(harbingerId);
      if (response.code === 200) {
        loadHarbingers();
      }
    } catch (err) {
      console.error('Failed to delete harbinger:', err);
      alert('O\'chirishda xatolik yuz berdi');
    }
  };

  if (loading) return <div className="container"><div className="loading">Yuklanmoqda...</div></div>;
  if (error) return <div className="container"><div className="error-message">{error}</div></div>;

  return (
    <div className="container">
      <h1 className="page-title">Harbingerlarim</h1>

      {harbingers.length === 0 ? (
        <div className="empty-state">Hozircha harbingerlaringiz yo'q</div>
      ) : (
        <div className="grid">
          {harbingers.map(harbinger => (
            <div key={harbinger.id} className="card">
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  {`${harbinger.loc1 || ''} → ${harbinger.loc2 || ''}`}
                </h3>
                {harbinger.status && (
                  <span className={`badge ${
                    harbinger.status === 'new' ? 'badge-success' : 
                    harbinger.status === 'completed' ? 'badge-warning' : 
                    'badge-danger'
                  }`}>
                    {harbinger.status}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
                {harbinger.loc1 && (
                  <p style={{ margin: '8px 0' }}>
                    📍 Qayerdan: {harbinger.fullLoc1 || harbinger.loc1}
                  </p>
                )}
                
                {harbinger.loc2 && (
                  <p style={{ margin: '8px 0' }}>
                    📍 Qayerga: {harbinger.fullLoc2 || harbinger.loc2}
                  </p>
                )}
                
                {(harbinger.minWeight || harbinger.maxWeight) && (
                  <p style={{ margin: '8px 0' }}>
                    ⚖️ Og'irligi: 
                    {harbinger.minWeight && ` ${harbinger.minWeight.value} ${harbinger.minWeight.unit || 't'}`}
                    {harbinger.minWeight && harbinger.maxWeight && ' - '}
                    {harbinger.maxWeight && ` ${harbinger.maxWeight.value} ${harbinger.maxWeight.unit || 't'}`}
                  </p>
                )}

                {harbinger.weightOfCargo && (
                  <p style={{ margin: '8px 0' }}>
                    ⚖️ Yuk og'irligi: {harbinger.weightOfCargo.value} {harbinger.weightOfCargo.unit || 't'}
                  </p>
                )}

                {harbinger.offersCount !== undefined && harbinger.offersCount > 0 && (
                  <p style={{ margin: '8px 0' }}>
                    📊 Takliflar: {harbinger.offersCount}
                  </p>
                )}

                {harbinger.createdTime && (
                  <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#999' }}>
                    Yaratilgan: {new Date(harbinger.createdTime).toLocaleDateString('uz-UZ')}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '15px' }}>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(harbinger.id)}
                  style={{ width: '100%' }}
                >
                  O'chirish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
