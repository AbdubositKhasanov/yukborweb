import React, { useCallback, useEffect, useState } from 'react';
import { adminListInternalDispatchers, getViewHistory } from '../services/api';
import './ViewHistoryPage.css';

const EMPTY_RESULT = {
  items: [],
  page: 0,
  size: 50,
  hasMore: false,
  total: 0,
  cargoViews: 0,
  transportViews: 0,
  retentionHours: 24,
  serverTime: Date.now(),
};

const TYPE_OPTIONS = [
  { value: 'all', label: 'Barchasi' },
  { value: 'cargo', label: 'Yuklar' },
  { value: 'transport', label: 'Transportlar' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function remainingTime(expiresAt, serverTime) {
  const remainingMinutes = Math.max(0, Math.ceil((expiresAt - serverTime) / 60_000));
  if (remainingMinutes < 60) return `${remainingMinutes} daqiqa`;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  return minutes ? `${hours} soat ${minutes} daqiqa` : `${hours} soat`;
}

function routeText(item) {
  const points = [item.fromLocation, item.toLocation].filter(Boolean);
  return points.length ? points.join(' → ') : 'Yo‘nalish ko‘rsatilmagan';
}

export default function ViewHistoryPage({ admin = false, mobile = false }) {
  const [history, setHistory] = useState(EMPTY_RESULT);
  const [dispatchers, setDispatchers] = useState([]);
  const [dispatcherId, setDispatcherId] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!admin) return undefined;
    let cancelled = false;
    adminListInternalDispatchers()
      .then((response) => {
        if (!cancelled && response.code === 200) setDispatchers(response.result || []);
      })
      .catch(() => {
        if (!cancelled) setDispatchers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [admin]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getViewHistory({
        dispatcherId: admin ? dispatcherId : '',
        targetType,
        page,
        size: 50,
      });
      if (response.code === 200) {
        setHistory(response.result || EMPTY_RESULT);
      } else {
        setError(response.message || 'Tarixni yuklab bo‘lmadi');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Tarixni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [admin, dispatcherId, page, targetType]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const changeType = (value) => {
    setTargetType(value);
    setPage(0);
  };

  const changeDispatcher = (value) => {
    setDispatcherId(value);
    setPage(0);
  };

  return (
    <main className={`view-history-page ${mobile ? 'view-history-page--mobile' : ''}`}>
      <header className="view-history-header">
        <div>
          <span className="view-history-eyebrow">24 soatlik jurnal</span>
          <h1>{admin ? 'Ichki dispetcherlar ko‘rish tarixi' : 'Ko‘rish tarixim'}</h1>
          <p>
            Yuk va transport ma’lumotlarini ochish harakatlari 24 soatdan keyin avtomatik o‘chiriladi.
          </p>
        </div>
        <button type="button" className="view-history-refresh" onClick={loadHistory} disabled={loading}>
          {loading ? 'Yangilanmoqda…' : 'Yangilash'}
        </button>
      </header>

      <section className="view-history-stats" aria-label="Ko‘rishlar statistikasi">
        <article>
          <span>Jami ko‘rish</span>
          <strong>{history.cargoViews + history.transportViews}</strong>
        </article>
        <article>
          <span>Yuklar</span>
          <strong>{history.cargoViews}</strong>
        </article>
        <article>
          <span>Transportlar</span>
          <strong>{history.transportViews}</strong>
        </article>
        <article>
          <span>Saqlash muddati</span>
          <strong>{history.retentionHours} soat</strong>
        </article>
      </section>

      <section className="view-history-filters">
        {admin && (
          <label>
            <span>Ichki dispetcher</span>
            <select value={dispatcherId} onChange={(event) => changeDispatcher(event.target.value)}>
              <option value="">Barcha ichki dispetcherlar</option>
              {dispatchers.map((dispatcher) => (
                <option key={dispatcher.id} value={dispatcher.chatId}>
                  {dispatcher.name || 'Ismsiz'} · {dispatcher.phone || dispatcher.chatId}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="view-history-types" role="group" aria-label="Ma’lumot turi">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={targetType === option.value ? 'active' : ''}
              onClick={() => changeType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="view-history-error">
          <span>{error}</span>
          <button type="button" onClick={loadHistory}>Qayta urinish</button>
        </div>
      )}

      {!error && loading && history.items.length === 0 && (
        <div className="view-history-empty">Tarix yuklanmoqda…</div>
      )}

      {!error && !loading && history.items.length === 0 && (
        <div className="view-history-empty">
          <strong>Hozircha tarix yo‘q</strong>
          <span>Yuk yoki transport ma’lumoti ochilganda bu yerda ko‘rinadi.</span>
        </div>
      )}

      {history.items.length > 0 && (
        <section className={`view-history-list ${loading ? 'is-loading' : ''}`} aria-live="polite">
          {history.items.map((item) => (
            <article className="view-history-item" key={item.id}>
              <div className={`view-history-icon view-history-icon--${item.targetType}`} aria-hidden="true">
                {item.targetType === 'cargo' ? 'Y' : 'T'}
              </div>
              <div className="view-history-item-main">
                <div className="view-history-item-title">
                  <div>
                    <span className={`view-history-kind view-history-kind--${item.targetType}`}>
                      {item.targetType === 'cargo' ? 'Yuk' : 'Transport'}
                    </span>
                    <strong>{item.targetName}</strong>
                  </div>
                  <time dateTime={new Date(item.viewedAt).toISOString()}>{formatDate(item.viewedAt)}</time>
                </div>
                <div className="view-history-route">{routeText(item)}</div>
                <div className="view-history-details">
                  {item.vehicleType && <span>Transport: {item.vehicleType}</span>}
                  {item.weight != null && <span>Og‘irlik: {item.weight} t</span>}
                  {item.stateNumber && <span>Davlat raqami: {item.stateNumber}</span>}
                  {item.source && <span>Manba: {item.source}</span>}
                </div>
                <div className="view-history-meta">
                  {admin && (
                    <span className="view-history-actor">
                      {item.actorName || item.actorId}
                      {item.actorPhone ? ` · ${item.actorPhone}` : ''}
                    </span>
                  )}
                  <span>{remainingTime(item.expiresAt, history.serverTime)}dan keyin o‘chadi</span>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {(page > 0 || history.hasMore) && (
        <nav className="view-history-pagination" aria-label="Tarix sahifalari">
          <button type="button" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}>
            Oldingi
          </button>
          <span>{page + 1}-sahifa</span>
          <button type="button" disabled={!history.hasMore || loading} onClick={() => setPage((value) => value + 1)}>
            Keyingi
          </button>
        </nav>
      )}
    </main>
  );
}
