import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateUser } from '../../services/api';
import { useMobileAuth } from '../context/MobileAuthContext';

const ROLE_OPTIONS = [
  {
    value: 'logist',
    icon: '📋',
    title: 'Logist',
    text: 'Yuk topaman, haydovchilar bilan ishlayman',
    path: '/mobile',
  },
  {
    value: 'factory',
    icon: '📦',
    title: 'Yuk beruvchi',
    text: 'Yuk joylayman va transport qidiraman',
    path: '/mobile/orders',
  },
  {
    value: 'driver',
    icon: '🚚',
    title: 'Haydovchi',
    text: 'Yuk qidiraman, transportimni joylayman',
    path: '/mobile/status',
  },
];

export default function MobileRoleSelect() {
  const navigate = useNavigate();
  const { user, telegramUser, refreshUser, setAuthenticated } = useMobileAuth();
  const [selectedRole, setSelectedRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const displayName = useMemo(() => {
    const telegramName = [telegramUser?.first_name, telegramUser?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    return user?.name || telegramName || telegramUser?.username || 'Foydalanuvchi';
  }, [telegramUser, user]);

  const handleSubmit = async () => {
    if (!selectedRole || saving) return;

    const role = ROLE_OPTIONS.find((item) => item.value === selectedRole);
    setSaving(true);
    setError('');

    try {
      const response = await updateUser({
        phone: user?.phone || '',
        name: user?.name || displayName,
        language: user?.language || telegramUser?.language_code?.slice(0, 2) || 'uz',
        type: selectedRole,
        gender: user?.gender || 'not_selected',
      });

      if (response.code === 200 && response.result) {
        setAuthenticated(response.result);
        await refreshUser();
        navigate(role?.path || '/mobile', { replace: true });
        return;
      }

      setError(response.message || 'Rolni saqlab bo\'lmadi');
    } catch (err) {
      setError('Rolni saqlab bo\'lmadi. Qayta urinib ko\'ring.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="m-role-screen">
      <section className="m-role-panel" aria-labelledby="mobile-role-title">
        <div className="m-role-user">
          <div className="m-role-avatar">{displayName.slice(0, 1).toUpperCase()}</div>
          <div>
            <p className="m-role-kicker">YukBor Mini App</p>
            <h1 id="mobile-role-title">Salom, {displayName}</h1>
          </div>
        </div>

        <p className="m-role-lead">Davom etish uchun o'zingizga mos rolni tanlang.</p>

        <div className="m-role-options">
          {ROLE_OPTIONS.map((role) => (
            <button
              key={role.value}
              type="button"
              className={`m-role-option ${selectedRole === role.value ? 'selected' : ''}`}
              onClick={() => setSelectedRole(role.value)}
            >
              <span className="m-role-option-icon">{role.icon}</span>
              <span className="m-role-option-body">
                <strong>{role.title}</strong>
                <span>{role.text}</span>
              </span>
              <span className="m-role-radio" aria-hidden="true" />
            </button>
          ))}
        </div>

        {error && <div className="m-role-error">{error}</div>}

        <button
          type="button"
          className="m-btn m-btn-primary m-btn-lg m-btn-full"
          disabled={!selectedRole || saving}
          onClick={handleSubmit}
        >
          {saving ? 'Saqlanmoqda...' : 'Davom etish'}
        </button>
      </section>
    </main>
  );
}
