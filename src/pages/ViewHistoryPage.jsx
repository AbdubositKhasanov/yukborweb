import React, { useCallback, useEffect, useRef, useState } from 'react';
import { adminListInternalDispatchers, getViewHistory, getViewHistoryDetail } from '../services/api';
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

function formatMoney(value) {
  if (value == null) return null;
  return `${Number(value).toLocaleString('uz-UZ')} so‘m`;
}

function DetailRows({ rows }) {
  const visibleRows = rows.filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (!visibleRows.length) return null;
  return (
    <dl className="view-history-detail-rows">
      {visibleRows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ViewHistoryDetailDrawer({ panel, onClose, admin }) {
  useEffect(() => {
    if (!panel.open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panel.open, onClose]);

  if (!panel.open) return null;

  const historyItem = panel.data?.history || panel.item;
  const cargo = panel.data?.cargo;
  const transport = panel.data?.transport;
  const target = cargo || transport;
  const isCargo = historyItem?.targetType === 'cargo';
  const phone = target?.additionalPhone;
  const telegramUsername = target?.telegramUsername?.replace(/^@/, '');
  const title = cargo?.cargoName || transport?.vehicleType || transport?.name || historyItem?.targetName || 'Ma’lumot';
  const ownerName = target?.ownerName || transport?.name;

  const historyRows = historyItem
    ? [
        ['Ko‘rilgan vaqt', formatDate(historyItem.viewedAt)],
        ['Tarixdan o‘chadi', formatDate(historyItem.expiresAt)],
        ['Ko‘rgan xodim', admin ? historyItem.actorName || historyItem.actorId : null],
        ['Xodim telefoni', admin ? historyItem.actorPhone : null],
        [
          'Xodim Telegrami',
          admin && historyItem.actorTelegramUsername
            ? `@${historyItem.actorTelegramUsername.replace(/^@/, '')}`
            : null,
        ],
      ]
    : [];

  const cargoRows = cargo
    ? [
        ['Yuk nomi', cargo.cargoName],
        ['Qayerdan', cargo.fromCity],
        ['Qayerga', cargo.toCity],
        ['Transport turi', cargo.vehicleType],
        ['Og‘irlik', cargo.weightKg != null ? `${cargo.weightKg} t` : null],
        ['Narx', formatMoney(cargo.priceUzs)],
        ['Status', cargo.status],
        ['Yuk egasi', ownerName],
        ['Telefon', phone && <a href={`tel:${phone}`}>{phone}</a>],
        [
          'Telegram',
          telegramUsername && (
            <a href={`https://t.me/${telegramUsername}`} target="_blank" rel="noreferrer">
              @{telegramUsername}
            </a>
          ),
        ],
        ['Telegram ID', cargo.chatId],
        ['Yaratilgan vaqt', cargo.createdTime ? formatDate(cargo.createdTime) : null],
        ['Manba', cargo.source],
        ['Yuboruvchi turi', cargo.senderType],
      ]
    : [];

  const transportRows = transport
    ? [
        ['Egasi', ownerName],
        ['Joylashuv', transport.loc1],
        ['Transport turi', transport.vehicleType],
        ['Yuk sig‘imi', transport.weight != null ? `${transport.weight} t` : null],
        ['Davlat raqami', transport.stateNumber],
        ['Status', transport.status],
        ['Telefon', phone && <a href={`tel:${phone}`}>{phone}</a>],
        [
          'Telegram',
          telegramUsername && (
            <a href={`https://t.me/${telegramUsername}`} target="_blank" rel="noreferrer">
              @{telegramUsername}
            </a>
          ),
        ],
        ['Telegram ID', transport.chatId],
        ['Yangilangan vaqt', transport.time ? formatDate(transport.time) : null],
        ['Manba', transport.source],
      ]
    : [];

  const snapshotRows = historyItem
    ? [
        ['Nomi', historyItem.targetName],
        ['Yo‘nalish', routeText(historyItem)],
        ['Transport turi', historyItem.vehicleType],
        ['Og‘irlik', historyItem.weight != null ? `${historyItem.weight} t` : null],
        ['Davlat raqami', historyItem.stateNumber],
        ['Manba', historyItem.source],
      ]
    : [];

  return (
    <div
      className="view-history-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="view-history-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div className={`view-history-detail-icon view-history-icon--${isCargo ? 'cargo' : 'transport'}`}>
            {isCargo ? 'Y' : 'T'}
          </div>
          <div>
            <span>{isCargo ? 'Yuk ma’lumotlari' : 'Transport ma’lumotlari'}</span>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish">×</button>
        </header>

        {panel.loading ? (
          <div className="view-history-detail-state">To‘liq ma’lumot yuklanmoqda…</div>
        ) : panel.error ? (
          <div className="view-history-detail-state error">
            <strong>Ma’lumotni ochib bo‘lmadi</strong>
            <span>{panel.error}</span>
          </div>
        ) : (
          <div className="view-history-drawer-body">
            {(phone || telegramUsername || cargo?.messageUrl) && (
              <div className="view-history-detail-actions">
                {phone && <a href={`tel:${phone}`}>Qo‘ng‘iroq</a>}
                {telegramUsername && (
                  <a href={`https://t.me/${telegramUsername}`} target="_blank" rel="noreferrer">Telegram</a>
                )}
                {cargo?.messageUrl?.startsWith('http') && (
                  <a href={cargo.messageUrl} target="_blank" rel="noreferrer">Asl xabar</a>
                )}
              </div>
            )}

            <section>
              <h3>Ko‘rish tarixi</h3>
              <DetailRows rows={historyRows} />
            </section>

            {target ? (
              <section>
                <h3>{isCargo ? 'To‘liq yuk ma’lumotlari' : 'To‘liq transport ma’lumotlari'}</h3>
                <DetailRows rows={isCargo ? cargoRows : transportRows} />
                {(cargo?.description || transport?.otherDesc) && (
                  <p className="view-history-detail-note">{cargo?.description || transport?.otherDesc}</p>
                )}
                {cargo?.originMessage && (
                  <div className="view-history-original-message">
                    <strong>Asl e’lon matni</strong>
                    <p>{cargo.originMessage}</p>
                  </div>
                )}
              </section>
            ) : (
              <section>
                <h3>Saqlangan ma’lumot</h3>
                <p className="view-history-detail-warning">
                  Asl obyekt o‘chirilgan yoki mavjud emas. Tarixda saqlangan ma’lumot ko‘rsatilmoqda.
                </p>
                <DetailRows rows={snapshotRows} />
              </section>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

export default function ViewHistoryPage({ admin = false, mobile = false }) {
  const [history, setHistory] = useState(EMPTY_RESULT);
  const [dispatchers, setDispatchers] = useState([]);
  const [dispatcherId, setDispatcherId] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailPanel, setDetailPanel] = useState({
    open: false,
    loading: false,
    data: null,
    item: null,
    error: '',
  });
  const detailRequestId = useRef(0);

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

  const openDetails = async (item) => {
    const requestId = ++detailRequestId.current;
    setDetailPanel({ open: true, loading: true, data: null, item, error: '' });
    try {
      const response = await getViewHistoryDetail(item.id);
      if (response.code !== 200) throw new Error(response.message || 'Ma’lumot topilmadi');
      if (detailRequestId.current !== requestId) return;
      setDetailPanel((current) => ({ ...current, loading: false, data: response.result }));
    } catch (detailError) {
      if (detailRequestId.current !== requestId) return;
      setDetailPanel((current) => ({
        ...current,
        loading: false,
        error: detailError.response?.data?.message || detailError.message || 'Ma’lumot yuklanmadi',
      }));
    }
  };

  const closeDetails = useCallback(() => {
    detailRequestId.current += 1;
    setDetailPanel({ open: false, loading: false, data: null, item: null, error: '' });
  }, []);

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
            <button type="button" className="view-history-item" key={item.id} onClick={() => openDetails(item)}>
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
                  <strong>To‘liq ma’lumot →</strong>
                </div>
              </div>
            </button>
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
      <ViewHistoryDetailDrawer panel={detailPanel} onClose={closeDetails} admin={admin} />
    </main>
  );
}
