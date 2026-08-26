import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  adminGetDriverLocationHistory,
  adminListDriverLocations,
  adminNotifyDriver,
  adminRequestDriverLocationRefresh,
  adminBulkRefreshDriverLocations,
} from '../services/api';
import { showError, showSuccess } from '../utils/toast';
import './AdminDriverLocationsPage.css';

const PAGE_SIZE = 20;
const FILTERS = [
  { value: 'all', label: 'Barchasi' },
  { value: 'live', label: 'Jonli' },
  { value: 'stale', label: 'Eskirgan' },
  { value: 'off', label: 'Sessiya o‘chiq' },
];

function relativeTime(timestamp) {
  if (!timestamp) return 'Hali yuborilmagan';
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'hozirgina';
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return new Date(timestamp).toLocaleString('uz-UZ');
}

function freshnessLabel(value) {
  if (value === 'live') return 'Jonli';
  if (value === 'stale') return 'Eskirgan';
  return 'O‘chiq';
}

function mapEmbedUrl(location) {
  if (!location) return '';
  const lat = Number(location.latitude);
  const lon = Number(location.longitude);
  const bbox = [lon - 0.02, lat - 0.012, lon + 0.02, lat + 0.012].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;
}

export default function AdminDriverLocationsPage({ mobile = false }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ liveCount: 0, staleCount: 0, sharingOffCount: 0 });
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const [firebaseStatusKnown, setFirebaseStatusKnown] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [freshness, setFreshness] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [bulkVehicleType, setBulkVehicleType] = useState('');
  const [bulkStaleHours, setBulkStaleHours] = useState('');
  const [bulkRefreshing, setBulkRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshingRequest, setRefreshingRequest] = useState('');
  const [notification, setNotification] = useState({ title: '', body: '' });
  const [sendingNotification, setSendingNotification] = useState(false);
  const listAbortRef = useRef(null);
  const detailAbortRef = useRef(null);
  const detailPanelRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const loadList = useCallback(
    async (nextPage = 0, append = false, silent = false) => {
      listAbortRef.current?.abort();
      const controller = new AbortController();
      listAbortRef.current = controller;
      if (!silent) {
        if (append) setLoadingMore(true);
        else setLoading(true);
      }
      setError('');
      try {
        const response = await adminListDriverLocations(
          {
            search: debouncedSearch || undefined,
            freshness: freshness === 'all' ? undefined : freshness,
            page: nextPage,
            size: PAGE_SIZE,
          },
          controller.signal
        );
        if (controller.signal.aborted) return;
        if (response.code !== 200) throw new Error(response.message || 'Lokatsiyalar yuklanmadi');
        const result = response.result || {};
        setItems((current) =>
          append ? [...current, ...(result.items || [])] : result.items || []
        );
        setSummary({
          liveCount: result.liveCount || 0,
          staleCount: result.staleCount || 0,
          sharingOffCount: result.sharingOffCount || 0,
        });
        setFirebaseConfigured(result.firebaseConfigured === true);
        setFirebaseStatusKnown(true);
        setHasMore(result.hasMore === true);
        setPage(nextPage);
      } catch (requestError) {
        if (axios.isCancel(requestError) || requestError.code === 'ERR_CANCELED') return;
        const message =
          requestError.response?.data?.message || requestError.message || 'Lokatsiyalar yuklanmadi';
        setError(message);
        if (!silent) showError(message);
      } finally {
        if (controller === listAbortRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedSearch, freshness]
  );

  const loadDetail = useCallback(async (driverId, silent = false) => {
    if (!driverId) return;
    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;
    if (!silent) setDetailLoading(true);
    try {
      const response = await adminGetDriverLocationHistory(
        driverId,
        { limit: 100 },
        controller.signal
      );
      if (controller.signal.aborted) return;
      if (response.code !== 200) throw new Error(response.message || 'Lokatsiya tarixi yuklanmadi');
      setDetail(response.result || null);
    } catch (requestError) {
      if (axios.isCancel(requestError) || requestError.code === 'ERR_CANCELED') return;
      showError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Lokatsiya tarixi yuklanmadi'
      );
    } finally {
      if (controller === detailAbortRef.current) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList(0, false);
    return () => listAbortRef.current?.abort();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return undefined;
    }
    loadDetail(selectedId);
    return () => detailAbortRef.current?.abort();
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!selectedId || !window.matchMedia('(max-width: 980px)').matches) return undefined;
    const frame = window.requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedId]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => {
      loadList(0, false, true);
      if (selectedId) loadDetail(selectedId, true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadList, loadDetail, selectedId]);

  const selectedDriver = detail?.driver || items.find((item) => item.userId === selectedId) || null;
  const latest = selectedDriver?.latest;
  const mapUrl = useMemo(() => mapEmbedUrl(latest), [latest]);

  const requestRefresh = async (driverId, showNotification) => {
    if (!driverId || refreshingRequest) return;
    const requestKey = `${driverId}:${showNotification ? 'visible' : 'silent'}`;
    setRefreshingRequest(requestKey);
    try {
      const response = await adminRequestDriverLocationRefresh(driverId, showNotification);
      const result = response.result || {};
      if (response.code !== 200 || result.delivered < 1) {
        throw new Error(result.message || response.message || 'Refresh eventi yuborilmadi');
      }
      showSuccess(
        `${result.delivered} ta qurilmaga ${
          showNotification ? 'notificationli' : 'bildirishnomasiz'
        } lokatsiya so‘rovi yuborildi`
      );
    } catch (requestError) {
      showError(
        requestError.response?.data?.message || requestError.message || 'Refresh eventi yuborilmadi'
      );
    } finally {
      setRefreshingRequest('');
    }
  };

  const sendNotification = async (event) => {
    event.preventDefault();
    if (!selectedId || sendingNotification) return;
    const title = notification.title.trim();
    const body = notification.body.trim();
    if (title.length < 2 || body.length < 2) {
      showError('Sarlavha va xabarni kiriting');
      return;
    }
    setSendingNotification(true);
    try {
      const response = await adminNotifyDriver(selectedId, {
        title,
        body,
        deepLink: 'https://cargover.uz/mobile/status',
      });
      const result = response.result || {};
      if (response.code !== 200 || result.delivered < 1) {
        throw new Error(result.message || response.message || 'Notification yuborilmadi');
      }
      showSuccess(`${result.delivered} ta qurilmaga notification yuborildi`);
      setNotification({ title: '', body: '' });
    } catch (requestError) {
      showError(
        requestError.response?.data?.message || requestError.message || 'Notification yuborilmadi'
      );
    } finally {
      setSendingNotification(false);
    }
  };

  const handleBulkRefresh = async () => {
    setBulkRefreshing(true);
    try {
      const response = await adminBulkRefreshDriverLocations({
        vehicleType: bulkVehicleType.trim() || undefined,
        staleHours: bulkStaleHours === '' ? undefined : Number(bulkStaleHours),
      });
      const result = response.result || {};
      if (response.code !== 200) {
        throw new Error(result.message || response.message || 'Yangilash yuborilmadi');
      }
      showSuccess(
        `${result.attempted || 0} ta qurilmaga so‘rov yuborildi (${result.delivered || 0} yetkazildi)`
      );
      loadList(0, false, true);
    } catch (requestError) {
      showError(
        requestError.response?.data?.message || requestError.message || 'Yangilash yuborilmadi'
      );
    } finally {
      setBulkRefreshing(false);
    }
  };

  return (
    <main className={`driver-locations-page ${mobile ? 'is-mobile' : ''}`}>
      <header className="driver-locations-hero">
        <div>
          <span className="driver-locations-eyebrow">Operatsion nazorat</span>
          <h1>Haydovchi lokatsiyalari</h1>
          <p>
            Faqat haydovchi rozilik bilan ulashgan koordinata, qurilma holati va 30 kunlik tarix.
          </p>
        </div>
        <label className="driver-locations-auto-refresh">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
          />
          15 soniyada yangilash
        </label>
      </header>

      {firebaseStatusKnown && !firebaseConfigured && (
        <section className="driver-locations-warning" role="status">
          <strong>Firebase server credential sozlanmagan.</strong>
          <span>
            GPS ma’lumotlari ishlaydi, lekin refresh eventi va push notification credential
            berilmaguncha yuborilmaydi.
          </span>
        </section>
      )}

      <section className="driver-locations-summary" aria-label="Lokatsiya statistikasi">
        <button type="button" onClick={() => setFreshness('live')} className="is-live">
          <span>Jonli</span>
          <strong>{summary.liveCount}</strong>
          <small>5 daqiqagacha</small>
        </button>
        <button type="button" onClick={() => setFreshness('stale')} className="is-stale">
          <span>Eskirgan</span>
          <strong>{summary.staleCount}</strong>
          <small>yangilash kerak</small>
        </button>
        <button type="button" onClick={() => setFreshness('off')} className="is-off">
          <span>Sharing o‘chiq</span>
          <strong>{summary.sharingOffCount}</strong>
          <small>kuzatilmaydi</small>
        </button>
      </section>

      <section className="driver-locations-controls">
        <label>
          <span>Haydovchini qidirish</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ism, telefon yoki chat ID"
          />
        </label>
        <label>
          <span>Holat</span>
          <select value={freshness} onChange={(event) => setFreshness(event.target.value)}>
            {FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => loadList(0, false)} disabled={loading}>
          Yangilash
        </button>
      </section>

      <section className="driver-locations-controls">
        <label>
          <span>Mashina turi (ixtiyoriy)</span>
          <input
            value={bulkVehicleType}
            onChange={(event) => setBulkVehicleType(event.target.value)}
            placeholder="Masalan: Fura, Isuzu"
          />
        </label>
        <label>
          <span>Faqat shundan eski (soat)</span>
          <input
            type="number"
            min="0"
            value={bulkStaleHours}
            onChange={(event) => setBulkStaleHours(event.target.value)}
            placeholder="6"
          />
        </label>
        <button
          type="button"
          onClick={handleBulkRefresh}
          disabled={bulkRefreshing || !firebaseConfigured}
          title={!firebaseConfigured ? 'Firebase sozlanmagan' : undefined}
        >
          {bulkRefreshing ? 'Yuborilmoqda…' : 'Ommaviy yangilash'}
        </button>
      </section>

      <div className="driver-locations-workspace">
        <section className="driver-locations-list" aria-label="Haydovchilar ro‘yxati">
          {loading && items.length === 0 && (
            <div className="driver-locations-state">Lokatsiyalar yuklanmoqda…</div>
          )}
          {!loading && error && items.length === 0 && (
            <div className="driver-locations-state is-error">
              <strong>Ma’lumot yuklanmadi</strong>
              <span>{error}</span>
              <button type="button" onClick={() => loadList(0, false)}>
                Qayta urinish
              </button>
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="driver-locations-state">
              <strong>Natija topilmadi</strong>
              <span>Qidiruv yoki holat filtrini o‘zgartiring.</span>
            </div>
          )}
          {items.map((driver) => (
            <button
              key={driver.userId}
              type="button"
              className={`driver-location-card ${selectedId === driver.userId ? 'is-selected' : ''}`}
              onClick={() => setSelectedId(driver.userId)}
            >
              <span className={`driver-location-status is-${driver.freshness}`}>
                {freshnessLabel(driver.freshness)}
              </span>
              <span className="driver-location-name">{driver.name || 'Ismsiz haydovchi'}</span>
              <span className="driver-location-phone">
                +{String(driver.phone || '').replace(/^\+/, '')}
              </span>
              <span className="driver-location-meta">
                {driver.latest
                  ? `${relativeTime(driver.latest.receivedAt)} · ±${Math.round(driver.latest.accuracyMeters)} m`
                  : 'Koordinata yo‘q'}
              </span>
              <span className="driver-location-device">
                {driver.registeredDevices} ta Android qurilma
              </span>
            </button>
          ))}
          {hasMore && (
            <button
              className="driver-locations-load-more"
              type="button"
              onClick={() => loadList(page + 1, true)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Yuklanmoqda…' : 'Yana ko‘rsatish'}
            </button>
          )}
        </section>

        <aside
          ref={detailPanelRef}
          className={`driver-location-detail ${selectedDriver ? 'has-driver' : ''}`}
        >
          {!selectedDriver && !detailLoading && (
            <div className="driver-locations-state">
              <strong>Haydovchini tanlang</strong>
              <span>Xarita, aniqlik, batareya va tarix shu yerda ko‘rinadi.</span>
            </div>
          )}
          {detailLoading && !selectedDriver && (
            <div className="driver-locations-state">Tarix yuklanmoqda…</div>
          )}
          {selectedDriver && (
            <>
              <div className="driver-location-detail-head">
                <div>
                  <span className={`driver-location-status is-${selectedDriver.freshness}`}>
                    {freshnessLabel(selectedDriver.freshness)}
                  </span>
                  <h2>{selectedDriver.name || 'Ismsiz haydovchi'}</h2>
                  <a href={`tel:+${String(selectedDriver.phone || '').replace(/^\+/, '')}`}>
                    +{String(selectedDriver.phone || '').replace(/^\+/, '')}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId('')}
                  aria-label="Tafsilotni yopish"
                >
                  ×
                </button>
              </div>

              {latest ? (
                <>
                  <iframe
                    className="driver-location-map"
                    title={`${selectedDriver.name} lokatsiyasi`}
                    src={mapUrl}
                    loading="lazy"
                  />
                  <div className="driver-location-facts">
                    <div>
                      <span>Oxirgi signal</span>
                      <strong>{relativeTime(latest.receivedAt)}</strong>
                    </div>
                    <div>
                      <span>Aniqlik</span>
                      <strong>±{Math.round(latest.accuracyMeters)} m</strong>
                    </div>
                    <div>
                      <span>Tezlik</span>
                      <strong>
                        {latest.speedMps == null
                          ? '—'
                          : `${Math.round(latest.speedMps * 3.6)} km/soat`}
                      </strong>
                    </div>
                    <div>
                      <span>Batareya</span>
                      <strong>
                        {latest.batteryPercent == null
                          ? '—'
                          : `${latest.batteryPercent}%${latest.charging ? ' ⚡' : ''}`}
                      </strong>
                    </div>
                  </div>
                  <a
                    className="driver-location-open-map"
                    href={`https://www.openstreetmap.org/?mlat=${latest.latitude}&mlon=${latest.longitude}#map=15/${latest.latitude}/${latest.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Katta xaritada ochish
                  </a>
                </>
              ) : (
                <div className="driver-locations-state compact">
                  Haydovchi hali koordinata yubormagan.
                </div>
              )}

              <div className="driver-location-refresh-actions" aria-label="Lokatsiya so‘rovi turi">
                <button
                  className="driver-location-refresh is-secondary"
                  type="button"
                  disabled={
                    !selectedDriver.sharingEnabled ||
                    Boolean(refreshingRequest) ||
                    !firebaseConfigured
                  }
                  onClick={() => requestRefresh(selectedDriver.userId, false)}
                >
                  {refreshingRequest === `${selectedDriver.userId}:silent`
                    ? 'So‘rov yuborilmoqda…'
                    : 'Faqat lokatsiyani so‘rash'}
                </button>
                <button
                  className="driver-location-refresh"
                  type="button"
                  disabled={
                    !selectedDriver.sharingEnabled ||
                    Boolean(refreshingRequest) ||
                    !firebaseConfigured
                  }
                  onClick={() => requestRefresh(selectedDriver.userId, true)}
                >
                  {refreshingRequest === `${selectedDriver.userId}:visible`
                    ? 'Notification yuborilmoqda…'
                    : 'Notification bilan so‘rash'}
                </button>
              </div>
              <p className="driver-location-refresh-help">
                “Faqat lokatsiya” faol Android xizmatidan jim yangilanish so‘raydi. Xizmat faol
                bo‘lmasa, haydovchiga xavfsiz fallback notification ko‘rsatiladi.
              </p>

              <section className="driver-location-history">
                <h3>So‘nggi harakatlar</h3>
                {(detail?.history || []).length === 0 ? (
                  <p>Tarix mavjud emas.</p>
                ) : (
                  <ol>
                    {(detail?.history || []).slice(0, 20).map((point) => (
                      <li key={`${point.capturedAt}-${point.latitude}-${point.longitude}`}>
                        <span>{new Date(point.capturedAt).toLocaleString('uz-UZ')}</span>
                        <strong>±{Math.round(point.accuracyMeters)} m</strong>
                        <small>
                          {point.speedMps == null
                            ? 'Tezlik noma’lum'
                            : `${Math.round(point.speedMps * 3.6)} km/soat`}
                        </small>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <form className="driver-location-notify" onSubmit={sendNotification}>
                <h3>Haydovchiga notification</h3>
                <label>
                  <span>Sarlavha</span>
                  <input
                    maxLength={80}
                    value={notification.title}
                    onChange={(event) =>
                      setNotification((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Masalan: Dispetcher xabari"
                  />
                </label>
                <label>
                  <span>Xabar</span>
                  <textarea
                    maxLength={500}
                    value={notification.body}
                    onChange={(event) =>
                      setNotification((current) => ({ ...current, body: event.target.value }))
                    }
                    placeholder="Qisqa va tushunarli xabar yozing"
                  />
                </label>
                <button type="submit" disabled={sendingNotification || !firebaseConfigured}>
                  {sendingNotification ? 'Yuborilmoqda…' : 'Notification yuborish'}
                </button>
              </form>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
