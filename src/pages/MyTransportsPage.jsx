import React, { useState, useEffect } from 'react';
import { getMyTransports, deleteTransport } from '../services/api';

export default function MyTransportsPage() {
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTransports();
  }, []);

  const loadTransports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyTransports();
      if (response.code === 200) {
        setTransports(response.result);
      } else {
        setError(response.message || 'Transportlar yuklanmadi');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (transportId) => {
    if (!window.confirm('Haqiqatan ham o\'chirmoqchimisiz?')) return;

    try {
      const response = await deleteTransport(transportId);
      if (response.code === 200) {
        loadTransports();
      }
    } catch (err) {
      console.error('Failed to delete transport:', err);
      alert('O\'chirishda xatolik yuz berdi');
    }
  };

  if (loading) return <div className="container"><div className="loading">Yuklanmoqda...</div></div>;
  if (error) return <div className="container"><div className="error-message">{error}</div></div>;

  return (
    <div className="container">
      <h1 className="page-title">Transportlarim</h1>

      {transports.length === 0 ? (
        <div className="empty-state">Hozircha transportlaringiz yo'q</div>
      ) : (
        <div className="grid">
          {transports.map(transport => (
            <div key={transport.id} className="card">
              <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  {transport.loc1 || 'Transport'}
                </h3>
                {transport.status && (
                  <span className={`badge ${
                    transport.status === 'active' ? 'badge-success' : 
                    'badge-danger'
                  }`}>
                    {transport.status}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
                {transport.loc1 && (
                  <p style={{ margin: '8px 0' }}>📍 Joylashuv: {transport.loc1}</p>
                )}
                
                {transport.vehicleType && (
                  <p style={{ margin: '8px 0' }}>🚚 Turi: {transport.vehicleType}</p>
                )}
                
                {transport.maxWeight && (
                  <p style={{ margin: '8px 0' }}>⚖️ Max og'irligi: {transport.maxWeight} t</p>
                )}

                {transport.additionalPhone && (
                  <p style={{ margin: '8px 0' }}>📞 Telefon: {transport.additionalPhone}</p>
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

                {transport.time && (
                  <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#999' }}>
                    Yaratilgan: {new Date(transport.time).toLocaleDateString('uz-UZ')}
                  </p>
                )}
              </div>

              <div style={{ marginTop: '15px' }}>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(transport.id)}
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
