import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  adminGetCallRecordings,
  adminListInternalDispatchers,
  getCallRecordingAudio,
} from '../services/api';
import './ViewHistoryPage.css';
import './AdminCallRecordingsPage.css';

const EMPTY_PAGE = {
  items: [],
  page: 0,
  size: 50,
  total: 0,
  hasMore: false,
};

const PHONE_MATCH_OPTIONS = [
  { value: 'all', label: 'Barchasi' },
  { value: 'matched', label: 'Cargover raqami' },
  { value: 'unmatched', label: 'Mos kelmagan' },
];

const DIRECTION_OPTIONS = [
  { value: 'all', label: 'Barcha yo‘nalishlar' },
  { value: 'INCOMING', label: 'Kiruvchi' },
  { value: 'OUTGOING', label: 'Chiquvchi' },
  { value: 'UNKNOWN', label: 'Noma’lum' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Barcha holatlar' },
  { value: 'ANSWERED', label: 'Javob berilgan' },
  { value: 'REJECTED', label: 'Rad etilgan' },
  { value: 'MISSED', label: 'O‘tkazib yuborilgan' },
  { value: 'ENDED', label: 'Yakunlangan' },
  { value: 'BLOCKED', label: 'Bloklangan' },
  { value: 'FAILED', label: 'Xatolik' },
  { value: 'UNKNOWN', label: 'Noma’lum' },
];

const DIRECTION_LABELS = Object.fromEntries(
  DIRECTION_OPTIONS.filter((option) => option.value !== 'all').map((option) => [option.value, option.label])
);

const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => [option.value, option.label])
);

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

function formatDuration(value) {
  const seconds = Math.max(0, Number(value) || 0);
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}:${String(seconds % 60).padStart(2, '0')}` : `${seconds} soniya`;
}

function dayBoundaryEpoch(date, endOfDay = false) {
  if (!date) return undefined;
  const parsed = new Date(`${date}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.getTime();
}

function RecordingAudioPlayer({ recording }) {
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(null);

  useEffect(
    () => () => {
      requestRef.current?.abort();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl]
  );

  const loadAudio = async () => {
    if (loading || audioUrl) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const blob = await getCallRecordingAudio(recording.id, controller.signal);
      if (!blob?.size) throw new Error('Audio fayl bo‘sh');
      setAudioUrl(URL.createObjectURL(blob));
    } catch (requestError) {
      if (requestError.code !== 'ERR_CANCELED') {
        setError(requestError.response?.data?.message || requestError.message || 'Audio yuklanmadi');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  if (audioUrl) {
    // Call recordings do not have a caption source; use accessible native controls.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <audio className="admin-call-history-audio" controls preload="metadata" src={audioUrl} />;
  }

  return (
    <div className="admin-call-history-audio-action">
      <button type="button" className="view-history-audio-load" onClick={loadAudio} disabled={loading}>
        <span aria-hidden="true">▶</span>
        {loading ? 'Audio yuklanmoqda…' : 'Yozuvni eshitish'}
      </button>
      {error && (
        <div className="view-history-audio-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadAudio}>Qayta urinish</button>
        </div>
      )}
    </div>
  );
}

function CallRecordingCard({ recording }) {
  const isCargoverNumber = recording.isCargoverNumber === true;
  const direction = DIRECTION_LABELS[recording.direction] || recording.direction || 'Noma’lum';
  const status = STATUS_LABELS[recording.status] || recording.status || 'Noma’lum';

  return (
    <article className="view-history-item admin-call-history-item">
      <div
        className={`view-history-icon admin-call-history-icon admin-call-history-icon--${recording.direction?.toLowerCase()}`}
        aria-hidden="true"
      >
        ☎
      </div>
      <div className="view-history-item-main">
        <div className="view-history-item-title">
          <div>
            <span className={`view-history-kind admin-call-history-direction admin-call-history-direction--${recording.direction?.toLowerCase()}`}>
              {direction}
            </span>
            <strong>{recording.phoneNumber}</strong>
          </div>
          <time dateTime={new Date(recording.startedAt).toISOString()}>{formatDate(recording.startedAt)}</time>
        </div>
        <div className="view-history-route">{status} · {formatDuration(recording.durationSeconds)}</div>
        <div className="view-history-details">
          {recording.deviceId && <span>Qurilma: {recording.deviceId}</span>}
          {recording.operatorName && <span>Ichki logist: {recording.operatorName}</span>}
          {recording.recordingSource && <span>Manba: {recording.recordingSource}</span>}
        </div>
        <div className="view-history-meta admin-call-history-meta">
          <span className={isCargoverNumber ? 'admin-call-history-match is-matchable' : 'admin-call-history-match'}>
            {isCargoverNumber ? 'Cargover raqami' : 'Mos kelmagan call'}
          </span>
          <RecordingAudioPlayer recording={recording} />
        </div>
      </div>
    </article>
  );
}

export default function AdminCallRecordingsPage({ mobile = false }) {
  const [recordsPage, setRecordsPage] = useState(EMPTY_PAGE);
  const [dispatchers, setDispatchers] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [phoneMatch, setPhoneMatch] = useState('all');
  const [operatorId, setOperatorId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [direction, setDirection] = useState('all');
  const [status, setStatus] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
  }, []);

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminGetCallRecordings({
        page,
        size: 50,
        search,
        phoneMatch,
        operatorId,
        deviceId,
        direction,
        status,
        from: dayBoundaryEpoch(fromDate),
        to: dayBoundaryEpoch(toDate, true),
      });
      if (response.code !== 200) throw new Error(response.message || 'Qo‘ng‘iroqlar yuklanmadi');
      setRecordsPage(response.result || EMPTY_PAGE);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Qo‘ng‘iroqlar yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [deviceId, direction, fromDate, operatorId, page, phoneMatch, search, status, toDate]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const resetPageAndSet = (setter, value) => {
    setPage(0);
    setter(value);
  };

  const applySearch = (event) => {
    event.preventDefault();
    resetPageAndSet(setSearch, searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setPhoneMatch('all');
    setOperatorId('');
    setDeviceId('');
    setDirection('all');
    setStatus('all');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  const pageMatched = recordsPage.items.filter((item) => item.isCargoverNumber).length;
  const pageUnmatched = recordsPage.items.length - pageMatched;

  return (
    <main className={`view-history-page admin-call-history-page ${mobile ? 'view-history-page--mobile' : ''}`}>
      <header className="view-history-header">
        <div>
          <span className="view-history-eyebrow">Qo‘ng‘iroqlar jurnali</span>
          <h1>Barcha qo‘ng‘iroq yozuvlari</h1>
          <p>
            Cargover raqamlariga bog‘langan va mos kelmagan barcha yozuvlar. Audio faqat
            so‘ralganda yuklanadi.
          </p>
        </div>
        <button type="button" className="view-history-refresh" onClick={loadRecordings} disabled={loading}>
          {loading ? 'Yangilanmoqda…' : 'Yangilash'}
        </button>
      </header>

      <section className="view-history-stats" aria-label="Qo‘ng‘iroqlar statistikasi">
        <article>
          <span>Jami yozuvlar</span>
          <strong>{Number(recordsPage.total || 0).toLocaleString('uz-UZ')}</strong>
        </article>
        <article>
          <span>Bu sahifada Cargover raqami</span>
          <strong>{pageMatched}</strong>
        </article>
        <article>
          <span>Bu sahifada mos kelmagan</span>
          <strong>{pageUnmatched}</strong>
        </article>
        <article>
          <span>Sahifa</span>
          <strong>{page + 1}</strong>
        </article>
      </section>

      <section className="view-history-filters admin-call-history-filters">
        <div className="admin-call-filter-grid">
          <label>
            <span>Ichki logist</span>
            <select value={operatorId} onChange={(event) => resetPageAndSet(setOperatorId, event.target.value)}>
              <option value="">Barcha ichki logistlar</option>
              {dispatchers.map((dispatcher) => (
                <option key={dispatcher.id} value={dispatcher.chatId}>
                  {dispatcher.name || 'Ismsiz'} · {dispatcher.phone || dispatcher.chatId}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Yo‘nalish</span>
            <select value={direction} onChange={(event) => resetPageAndSet(setDirection, event.target.value)}>
              {DIRECTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Holati</span>
            <select value={status} onChange={(event) => resetPageAndSet(setStatus, event.target.value)}>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span>Qurilma ID</span>
            <input value={deviceId} onChange={(event) => resetPageAndSet(setDeviceId, event.target.value)} placeholder="Masalan: samsung-main" />
          </label>
          <label>
            <span>Dan sana</span>
            <input type="date" value={fromDate} onChange={(event) => resetPageAndSet(setFromDate, event.target.value)} />
          </label>
          <label>
            <span>Gacha sana</span>
            <input type="date" value={toDate} onChange={(event) => resetPageAndSet(setToDate, event.target.value)} />
          </label>
          <form className="admin-call-history-search" onSubmit={applySearch}>
            <label htmlFor="admin-call-search">Raqam, qurilma yoki operator qidirish</label>
            <div>
              <input
                id="admin-call-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Masalan: 0611"
              />
              <button type="submit">Qidirish</button>
            </div>
          </form>
        </div>
        <div className="admin-call-filter-actions">
          <div className="view-history-types" role="group" aria-label="Raqam mosligi">
            {PHONE_MATCH_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={phoneMatch === option.value ? 'active' : ''}
                onClick={() => resetPageAndSet(setPhoneMatch, option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="admin-call-clear-filters" onClick={clearFilters}>Tozalash</button>
        </div>
      </section>

      {error && (
        <div className="view-history-error">
          <span>{error}</span>
          <button type="button" onClick={loadRecordings}>Qayta urinish</button>
        </div>
      )}

      {!error && loading && recordsPage.items.length === 0 && (
        <div className="view-history-empty">Qo‘ng‘iroqlar yuklanmoqda…</div>
      )}

      {!error && !loading && recordsPage.items.length === 0 && (
        <div className="view-history-empty">
          <strong>Tanlangan filter uchun yozuv yo‘q</strong>
          <span>Filterlarni o‘zgartiring yoki tozalang.</span>
        </div>
      )}

      {recordsPage.items.length > 0 && (
        <section className={`view-history-list ${loading ? 'is-loading' : ''}`} aria-live="polite">
          {recordsPage.items.map((recording) => <CallRecordingCard key={recording.id} recording={recording} />)}
        </section>
      )}

      {(page > 0 || recordsPage.hasMore) && (
        <nav className="view-history-pagination" aria-label="Qo‘ng‘iroqlar sahifalari">
          <button type="button" disabled={page === 0 || loading} onClick={() => setPage((value) => value - 1)}>Oldingi</button>
          <span>{page + 1}-sahifa</span>
          <button type="button" disabled={!recordsPage.hasMore || loading} onClick={() => setPage((value) => value + 1)}>Keyingi</button>
        </nav>
      )}
    </main>
  );
}
