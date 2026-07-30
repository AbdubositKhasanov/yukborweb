import React, { useState } from 'react';
import { getTelegramLoginUrl } from '../../config/config';
import { trackLogin } from '../../services/analytics';
import { useMobileAuth } from '../context/MobileAuthContext';

const CODE_LENGTH = 6;

const getFriendlyError = ({ status, message } = {}) => {
  if (status === 401) {
    return 'Kod noto‘g‘ri yoki muddati o‘tgan. Botdan yangi kod oling.';
  }
  if (status === 429) {
    return 'Urinishlar soni ko‘payib ketdi. Biroz kutib, qayta urinib ko‘ring.';
  }
  return message || 'Kirishda xatolik yuz berdi. Qayta urinib ko‘ring.';
};

export default function MobileBrowserLogin() {
  const { authenticateWithCode } = useMobileAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [botOpened, setBotOpened] = useState(false);

  const handleCodeChange = (event) => {
    const nextCode = event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(nextCode);
    if (error) setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (code.length !== CODE_LENGTH) {
      setError('Bot yuborgan 6 xonali kodni to‘liq kiriting.');
      return;
    }

    setSubmitting(true);
    setError('');

    const result = await authenticateWithCode(code);
    if (!result.success) {
      setError(getFriendlyError(result));
      setSubmitting(false);
      return;
    }

    trackLogin('telegram_code', result.user?.type || 'unknown');
  };

  return (
    <main className="m-role-screen m-login-screen">
      <section className="m-role-panel m-login-panel" aria-labelledby="mobile-login-title">
        <div className="m-role-user m-login-header">
          <div className="m-role-avatar" aria-hidden="true">
            Y
          </div>
          <div>
            <p className="m-role-kicker">YukBor mobil platformasi</p>
            <h1 id="mobile-login-title">Kirish</h1>
          </div>
        </div>

        <p className="m-role-lead">
          Telegram botdan bir martalik kod oling va shu yerga kiriting. Saytni Telegram ichida qayta
          ochish shart emas.
        </p>

        <ol className="m-login-steps" aria-label="Kirish bosqichlari">
          <li className="m-login-step">
            <span className="m-login-step-number" aria-hidden="true">
              1
            </span>
            <span>
              <strong>Botdan kod oling</strong>
              <small>Bot 6 xonali kirish kodini yuboradi.</small>
            </span>
          </li>
          <li className="m-login-step">
            <span className="m-login-step-number" aria-hidden="true">
              2
            </span>
            <span>
              <strong>Kodni kiriting</strong>
              <small>Kod 10 daqiqa davomida bir marta ishlaydi.</small>
            </span>
          </li>
        </ol>

        <a
          className="m-btn m-btn-telegram m-btn-lg m-btn-full"
          href={getTelegramLoginUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setBotOpened(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21.7 3.3a1.2 1.2 0 0 0-1.2-.2L3.1 9.8c-1.2.5-1.2 1.2-.2 1.5l4.5 1.4 1.7 5.2c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.2-2.1 4.6 3.4c.9.5 1.5.2 1.7-.8l3-14.1c.3-1.2-.5-1.7-.6-1.3ZM9.1 12.4l8.8-5.6c.4-.3.8-.1.5.2l-7.3 6.6-.3 3.1-1.7-4.3Z" />
          </svg>
          Botdan kod olish
        </a>

        {botOpened && (
          <p className="m-login-status" role="status">
            Bot ochildi. Kod kelgach shu sahifaga qaytib, quyidagi maydonga kiriting.
          </p>
        )}

        <div className="m-login-divider">
          <span>Kod olgan bo‘lsangiz</span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="m-form-label" htmlFor="mobile-login-code">
            Kirish kodi
          </label>
          <input
            id="mobile-login-code"
            className={`m-form-input m-login-code-input${error ? ' error' : ''}`}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={CODE_LENGTH}
            value={code}
            onChange={handleCodeChange}
            placeholder="• • • • • •"
            aria-describedby={error ? 'mobile-login-error' : 'mobile-login-help'}
            aria-invalid={Boolean(error)}
            disabled={submitting}
          />

          {error ? (
            <p id="mobile-login-error" className="m-role-error m-login-error" role="alert">
              {error}
            </p>
          ) : (
            <p id="mobile-login-help" className="m-login-help">
              Telegramdagi YukBor botidan kelgan kodni kiriting.
            </p>
          )}

          <button
            type="submit"
            className="m-btn m-btn-primary m-btn-lg m-btn-full"
            disabled={submitting || code.length !== CODE_LENGTH}
          >
            {submitting ? 'Tekshirilmoqda...' : 'Kirish'}
          </button>
        </form>

        <p className="m-login-security">
          Kodni boshqa odamlarga bermang. YukBor xodimlari bu kodni so‘ramaydi.
        </p>
      </section>
    </main>
  );
}
