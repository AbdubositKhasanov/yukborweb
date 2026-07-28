import React, { useEffect, useState } from 'react';
import { assignOrderToDriver, getMyInvitedUsers } from '../services/api';
import { showError, showSuccess } from '../utils/toast';

export default function AssignToDriverModal({ isOpen, onClose, cargo, onAssigned }) {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const loadDrivers = async () => {
      setLoading(true);
      try {
        const response = await getMyInvitedUsers();
        if (!cancelled && response.code === 200) {
          const items = (response.result || []).filter((user) => (user.type || 'driver') === 'driver');
          setDrivers(items);
          setSelectedDriver(items[0]?.id || items[0]?._id || items[0]?.chatId || '');
        }
      } catch (error) {
        if (!cancelled) showError(error.response?.data?.message || 'Haydovchilar yuklanmadi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadDrivers();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAssign = async () => {
    if (!selectedDriver || !cargo?.id) return;
    setAssigning(true);
    try {
      const response = await assignOrderToDriver(cargo.id, selectedDriver);
      if (response.code === 200) {
        showSuccess('Yuk haydovchiga biriktirildi');
        onAssigned?.(cargo.id);
        onClose();
      } else {
        showError(response.message || 'Yukni biriktirib bo\'lmadi');
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Yukni biriktirib bo\'lmadi');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-driver-title"
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <h3 id="assign-driver-title" style={{ marginTop: 0 }}>Haydovchiga biriktirish</h3>
        <p style={{ color: '#64748b', fontSize: 14 }}>
          Haydovchi tasdig‘i va Telegram taklifi talab qilinmaydi. Yuk darhol biriktiriladi.
        </p>
        <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', marginBottom: 14 }}>
          <strong>{cargo?.cargoName || 'Yuk'}</strong>
          <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>
            {cargo?.fromCity || '—'} → {cargo?.toCity || '—'}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 16, textAlign: 'center' }}>Haydovchilar yuklanmoqda...</div>
        ) : drivers.length === 0 ? (
          <div style={{ padding: 16, borderRadius: 8, background: '#fff3cd', color: '#664d03' }}>
            Avval “Hamkorlarim” bo‘limida haydovchi qo‘shing. U ro‘yxatdan o‘tmagan bo‘lishi ham mumkin.
          </div>
        ) : (
          <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>
            Haydovchi
            <select
              className="form-select"
              value={selectedDriver}
              onChange={(event) => setSelectedDriver(event.target.value)}
            >
              {drivers.map((driver) => {
                const reference = driver.id || driver._id || driver.chatId;
                return (
                  <option key={reference} value={reference}>
                    {driver.name || 'Noma\'lum'} · +{driver.phone}
                    {driver.isRegistered ? '' : ' · ro\'yxatdan o\'tmagan'}
                  </option>
                );
              })}
            </select>
          </label>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={assigning} style={{ flex: 1 }}>
            Bekor qilish
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={handleAssign}
            disabled={loading || assigning || !selectedDriver}
            style={{ flex: 1 }}
          >
            {assigning ? 'Biriktirilmoqda...' : 'Biriktirish'}
          </button>
        </div>
      </div>
    </div>
  );
}
