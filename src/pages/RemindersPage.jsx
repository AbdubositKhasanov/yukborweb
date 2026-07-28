import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReminderComposer from '../components/ReminderComposer';
import {
  deleteReminder,
  getReminderCenter,
  getReminderSubjectDetails,
  markAllRemindersRead,
  markReminderRead,
} from '../services/api';
import { showError, showSuccess } from '../utils/toast';
import '../styles/dispatcher-crm.css';

const recurrenceLabel = (item) => {
  if (item.recurrence === 'interval') {
    const minutes = item.intervalMinutes || 0;
    if (minutes % 1440 === 0) return `Har ${minutes / 1440} kunda`;
    if (minutes % 60 === 0) return `Har ${minutes / 60} soatda`;
    return `Har ${minutes} daqiqada`;
  }
  if (item.recurrence === 'weekly') return 'Haftalik';
  return 'Bir martalik';
};

const formatDateTime = (timestamp) =>
  new Date(timestamp).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatOptionalDateTime = (timestamp) => (timestamp ? formatDateTime(timestamp) : null);

const hasSubjectDetails = (item) =>
  Boolean(item.subjectId && ['driver', 'shipper'].includes(item.subjectType));

const shipperStatusLabel = {
  potential: 'Potensial',
  active: 'Faol',
  paused: 'Kutilmoqda',
  inactive: 'Nofaol',
};

const userTypeLabel = {
  driver: 'Haydovchi',
  factory: 'Yuk egasi',
  logist: 'Logist',
  not_selected: 'Tanlanmagan',
};

const genderLabel = {
  male: 'Erkak',
  female: 'Ayol',
  not_selected: 'Ko‘rsatilmagan',
};

function DetailRows({ rows }) {
  const visibleRows = rows.filter(
    ([, value]) => value !== null && value !== undefined && value !== ''
  );
  if (!visibleRows.length) return null;
  return (
    <dl>
      {visibleRows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetailTags({ title, items }) {
  if (!items?.length) return null;
  return (
    <section>
      <h3>{title}</h3>
      <div className="shipper-tags">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function ReminderSubjectDrawer({ panel, onClose }) {
  useEffect(() => {
    if (!panel.open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panel.open, onClose]);

  if (!panel.open) return null;

  const driver = panel.data?.driver;
  const shipper = panel.data?.shipper;
  const transport = driver?.driverTransportForm;
  const person = driver || shipper;
  const title =
    driver?.name || shipper?.companyName || shipper?.contactName || panel.subjectName || 'Ma’lumot';
  const subtitle = driver
    ? 'Haydovchi ma’lumotlari'
    : shipper?.companyName && shipper.companyName !== shipper.contactName
      ? shipper.contactName
      : 'Yukchi ma’lumotlari';
  const phone = person?.phone;
  const telegramUsername = person?.telegramUsername?.replace(/^@/, '');

  const driverRows = driver
    ? [
        ['Telefon', phone && <a href={`tel:${phone}`}>{phone}</a>],
        [
          'Telegram',
          telegramUsername && (
            <a href={`https://t.me/${telegramUsername}`} target="_blank" rel="noreferrer">
              @{telegramUsername}
            </a>
          ),
        ],
        ['Ro‘yxatdan o‘tgan', driver.isRegistered ? 'Ha' : 'Hali yo‘q'],
        ['Roli', userTypeLabel[driver.type] || driver.type],
        ['Jinsi', genderLabel[driver.gender] || driver.gender],
        ['Til', driver.language?.toUpperCase()],
        ['Telegram ID', driver.isRegistered ? driver.chatId : null],
        [
          'Balans',
          driver.balance != null ? `${Number(driver.balance).toLocaleString('uz-UZ')} so‘m` : null,
        ],
        ['Oxirgi yangilanish', formatOptionalDateTime(driver.driverInfoUpdatedAt)],
        ['Yangilagan', driver.driverInfoUpdatedByName],
      ]
    : [];

  const transportRows = transport
    ? [
        ['Joriy status', driver.driverCurrentStatus ? 'Faol — yuk qidirmoqda' : 'Nofaol'],
        ['Joylashuv', transport.loc1],
        ['Transport turi', transport.vehicleType],
        ['Yuk sig‘imi', transport.maxWeight != null ? `${transport.maxWeight} t` : null],
        ['Davlat raqami', transport.stateNumber],
        [
          'Qo‘shimcha telefon',
          transport.additionalPhone && (
            <a href={`tel:${transport.additionalPhone}`}>{transport.additionalPhone}</a>
          ),
        ],
        ['Manba', transport.source],
        ['Transport yangilangan', formatOptionalDateTime(transport.time)],
      ]
    : [];

  const shipperRows = shipper
    ? [
        ['Kompaniya', shipper.companyName],
        ['Kontakt', shipper.contactName],
        ['Telefon', phone && <a href={`tel:${phone}`}>{phone}</a>],
        [
          'Qo‘shimcha telefon',
          shipper.additionalPhone && (
            <a href={`tel:${shipper.additionalPhone}`}>{shipper.additionalPhone}</a>
          ),
        ],
        [
          'Telegram',
          telegramUsername && (
            <a href={`https://t.me/${telegramUsername}`} target="_blank" rel="noreferrer">
              @{telegramUsername}
            </a>
          ),
        ],
        ['Mijoz turi', shipper.clientType === 'individual' ? 'Jismoniy shaxs' : 'Kompaniya'],
        ['STIR / INN', shipper.taxId],
        [
          'Manzil',
          [shipper.country, shipper.region, shipper.city, shipper.address]
            .filter(Boolean)
            .join(', '),
        ],
        ['Oyiga yuklar', shipper.monthlyLoads != null ? `${shipper.monthlyLoads} ta` : null],
        ['To‘lov turi', shipper.paymentType],
        ['To‘lov sharti', shipper.paymentTerms],
        ['Oxirgi aloqa', formatOptionalDateTime(shipper.lastContactAt)],
        ['Yangilangan', formatOptionalDateTime(shipper.updatedAt)],
      ]
    : [];

  return (
    <div
      className="crm-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="crm-drawer reminder-subject-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div className={`reminder-subject-avatar ${driver ? 'driver' : 'shipper'}`}>
            {(title || '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            {!panel.loading && !panel.error && (
              <span
                className={`crm-status ${driver?.driverCurrentStatus || shipper?.status === 'active' ? 'active' : shipper?.status || 'inactive'}`}
              >
                {driver
                  ? driver.driverCurrentStatus
                    ? 'Faol'
                    : 'Nofaol'
                  : shipperStatusLabel[shipper?.status] || 'Yukchi'}
              </span>
            )}
            <h2>{panel.loading ? 'Ma’lumot yuklanmoqda…' : title}</h2>
            {!panel.loading && !panel.error && <p>{subtitle}</p>}
          </div>
          <button className="crm-icon-button" type="button" onClick={onClose} aria-label="Yopish">
            ×
          </button>
        </header>

        {panel.loading ? (
          <div className="reminder-subject-state">
            <div className="crm-loader" />
            <p>To‘liq ma’lumot olinmoqda…</p>
          </div>
        ) : panel.error ? (
          <div className="reminder-subject-state error">
            <strong>Ma’lumotni ochib bo‘lmadi</strong>
            <p>{panel.error}</p>
          </div>
        ) : (
          <>
            {(phone || telegramUsername || driver?.deepLink) && (
              <div className="crm-drawer-actions reminder-subject-actions">
                {phone && (
                  <a className="crm-button primary" href={`tel:${phone}`}>
                    ☎ Qo‘ng‘iroq
                  </a>
                )}
                {telegramUsername && (
                  <a
                    className="crm-button secondary"
                    href={`https://t.me/${telegramUsername}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Telegram
                  </a>
                )}
                {!telegramUsername && driver?.deepLink && (
                  <a
                    className="crm-button secondary"
                    href={driver.deepLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Bot havolasi
                  </a>
                )}
              </div>
            )}

            {driver && (
              <>
                <section className="reminder-detail-section first">
                  <h3>Shaxsiy ma’lumotlar</h3>
                  <DetailRows rows={driverRows} />
                </section>
                <section className="reminder-detail-section">
                  <h3>Transport ma’lumotlari</h3>
                  {transport ? (
                    <>
                      <DetailRows rows={transportRows} />
                      {transport.otherDesc && <p className="detail-note">{transport.otherDesc}</p>}
                    </>
                  ) : (
                    <p className="reminder-detail-empty">Transport formasi hali kiritilmagan.</p>
                  )}
                </section>
              </>
            )}

            {shipper && (
              <>
                <section className="reminder-detail-section first">
                  <h3>Asosiy ma’lumotlar</h3>
                  <DetailRows rows={shipperRows} />
                </section>
                <DetailTags title="Yo‘nalishlar" items={shipper.routes} />
                <DetailTags title="Yuk turlari" items={shipper.cargoTypes} />
                <DetailTags title="Kerakli transportlar" items={shipper.preferredVehicleTypes} />
                <DetailTags title="Teglar" items={shipper.tags} />
                {shipper.notes && (
                  <section>
                    <h3>Izoh</h3>
                    <p className="detail-note">{shipper.notes}</p>
                  </section>
                )}
                {Object.keys(shipper.customFields || {}).length > 0 && (
                  <section>
                    <h3>Qo‘shimcha maydonlar</h3>
                    <DetailRows rows={Object.entries(shipper.customFields)} />
                  </section>
                )}
              </>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

export default function RemindersPage({ mobile = false }) {
  const [center, setCenter] = useState({ unreadCount: 0, notifications: [], schedules: [] });
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [subjectPanel, setSubjectPanel] = useState({
    open: false,
    loading: false,
    data: null,
    error: '',
    subjectName: '',
  });
  const detailRequestId = useRef(0);

  const loadCenter = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await getReminderCenter();
      if (response.code !== 200) throw new Error(response.message || 'Reminderlar yuklanmadi');
      setCenter(response.result || { unreadCount: 0, notifications: [], schedules: [] });
    } catch (error) {
      if (!silent)
        showError(error.response?.data?.message || error.message || 'Reminderlar yuklanmadi');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCenter();
    const interval = window.setInterval(() => loadCenter(true), 30_000);
    return () => window.clearInterval(interval);
  }, [loadCenter]);

  const handleRead = async (notification) => {
    if (notification.readAt) return;
    setCenter((current) => ({
      ...current,
      unreadCount: Math.max(0, current.unreadCount - 1),
      notifications: current.notifications.map((item) =>
        item.id === notification.id ? { ...item, readAt: Date.now() } : item
      ),
    }));
    try {
      await markReminderRead(notification.id);
    } catch (_) {
      loadCenter(true);
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllRemindersRead();
      setCenter((current) => ({
        ...current,
        unreadCount: 0,
        notifications: current.notifications.map((item) => ({
          ...item,
          readAt: item.readAt || Date.now(),
        })),
      }));
      showSuccess('Barcha reminderlar o‘qildi');
    } catch (error) {
      showError(error.response?.data?.message || 'Belgilanmadi');
    }
  };

  const handleDelete = async (reminder) => {
    if (!window.confirm(`“${reminder.title}” rejasini o‘chirasizmi?`)) return;
    try {
      const response = await deleteReminder(reminder.id);
      if (response.code !== 200) throw new Error(response.message);
      setCenter((current) => ({
        ...current,
        schedules: current.schedules.filter((item) => item.id !== reminder.id),
        notifications: current.notifications.filter((item) => item.reminderId !== reminder.id),
      }));
      showSuccess('Reminder o‘chirildi');
    } catch (error) {
      showError(error.response?.data?.message || error.message || 'O‘chirilmadi');
    }
  };

  const openSubjectDetails = async (item, event, markRead = false) => {
    event?.stopPropagation();
    if (!hasSubjectDetails(item)) return;
    if (markRead) handleRead(item);
    const requestId = ++detailRequestId.current;
    setSubjectPanel({
      open: true,
      loading: true,
      data: null,
      error: '',
      subjectName: item.subjectName || '',
    });
    try {
      const response = await getReminderSubjectDetails(item.subjectType, item.subjectId);
      if (response.code !== 200) throw new Error(response.message || 'Ma’lumot topilmadi');
      if (detailRequestId.current !== requestId) return;
      setSubjectPanel((current) => ({ ...current, loading: false, data: response.result }));
    } catch (error) {
      if (detailRequestId.current !== requestId) return;
      setSubjectPanel((current) => ({
        ...current,
        loading: false,
        error: error.response?.data?.message || error.message || 'Ma’lumot yuklanmadi',
      }));
    }
  };

  const closeSubjectDetails = useCallback(() => {
    detailRequestId.current += 1;
    setSubjectPanel({ open: false, loading: false, data: null, error: '', subjectName: '' });
  }, []);

  return (
    <main className={`crm-page ${mobile ? 'mobile' : ''}`}>
      <section className="crm-hero reminder-hero">
        <div>
          <span className="crm-eyebrow">Ichki logist ish maydoni</span>
          <h1>Reminder markazi</h1>
          <p>Qo‘ng‘iroq, status va kelishuvlarni o‘z vaqtida kuzating.</p>
        </div>
        <button
          className="crm-button primary hero-action"
          onClick={() => {
            setEditingReminder(null);
            setComposerOpen(true);
          }}
        >
          <span>＋</span> Yangi reminder
        </button>
      </section>

      <section className="crm-toolbar reminder-toolbar">
        <div className="crm-tabs">
          <button
            className={activeTab === 'notifications' ? 'active' : ''}
            onClick={() => setActiveTab('notifications')}
          >
            Xabarlar <span>{center.notifications.length}</span>
          </button>
          <button
            className={activeTab === 'schedules' ? 'active' : ''}
            onClick={() => setActiveTab('schedules')}
          >
            Rejalar <span>{center.schedules.length}</span>
          </button>
        </div>
        {activeTab === 'notifications' && center.unreadCount > 0 && (
          <button className="crm-text-button" onClick={handleReadAll}>
            Hammasini o‘qilgan qilish
          </button>
        )}
      </section>

      <div className="crm-expiry-note">
        <span>ⓘ</span> Xabarlar o‘qilgan yoki o‘qilmaganidan qat’i nazar, signal vaqtidan 48 soat
        o‘tib avtomatik o‘chadi.
      </div>

      {loading ? (
        <div className="crm-empty">
          <div className="crm-loader" />
          <p>Reminderlar yuklanmoqda…</p>
        </div>
      ) : activeTab === 'notifications' ? (
        center.notifications.length ? (
          <div className="reminder-list">
            {center.notifications.map((notification) => (
              <div
                key={notification.id}
                className={`reminder-card ${notification.readAt ? 'read' : 'unread'}`}
                role="button"
                tabIndex={0}
                onClick={() => handleRead(notification)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') handleRead(notification);
                }}
              >
                <div className="reminder-status-dot" />
                <div className="reminder-content">
                  <div className="reminder-card-head">
                    <div>
                      {hasSubjectDetails(notification) && (
                        <button
                          type="button"
                          className="crm-subject-link"
                          onClick={(event) => openSubjectDetails(notification, event, true)}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <span>
                            {notification.subjectType === 'driver' ? 'Haydovchi' : 'Yukchi'}
                          </span>
                          {notification.subjectName ||
                            (notification.subjectType === 'driver' ? 'Haydovchi' : 'Yukchi')}
                          <b>To‘liq ma’lumot →</b>
                        </button>
                      )}
                      {notification.subjectName && !hasSubjectDetails(notification) && (
                        <span className="crm-subject-chip">{notification.subjectName}</span>
                      )}
                      <h3>{notification.title}</h3>
                    </div>
                    <time>{formatDateTime(notification.triggerAt)}</time>
                  </div>
                  {notification.note && <p>{notification.note}</p>}
                  <div className="reminder-meta">
                    <span>{recurrenceLabel(notification)}</span>
                    <span>{notification.readAt ? 'O‘qilgan' : 'Yangi xabar'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="crm-empty">
            <div className="crm-empty-icon">✓</div>
            <h3>Hammasi nazoratda</h3>
            <p>Hozircha yangi reminder xabari yo‘q.</p>
          </div>
        )
      ) : center.schedules.length ? (
        <div className="schedule-grid">
          {center.schedules.map((schedule) => (
            <article key={schedule.id} className="schedule-card">
              <div className="schedule-icon">◷</div>
              <div className="schedule-main">
                {hasSubjectDetails(schedule) && (
                  <button
                    type="button"
                    className="crm-subject-link"
                    onClick={(event) => openSubjectDetails(schedule, event)}
                  >
                    <span>{schedule.subjectType === 'driver' ? 'Haydovchi' : 'Yukchi'}</span>
                    {schedule.subjectName ||
                      (schedule.subjectType === 'driver' ? 'Haydovchi' : 'Yukchi')}
                    <b>To‘liq ma’lumot →</b>
                  </button>
                )}
                {schedule.subjectName && !hasSubjectDetails(schedule) && (
                  <span className="crm-subject-chip">{schedule.subjectName}</span>
                )}
                <h3>{schedule.title}</h3>
                {schedule.note && <p>{schedule.note}</p>}
                <div className="schedule-next">
                  <strong>{formatDateTime(schedule.nextTriggerAt)}</strong>
                  <span>{recurrenceLabel(schedule)}</span>
                </div>
              </div>
              <div className="schedule-actions">
                <button
                  onClick={() => {
                    setEditingReminder(schedule);
                    setComposerOpen(true);
                  }}
                >
                  Tahrirlash
                </button>
                <button className="danger" onClick={() => handleDelete(schedule)}>
                  O‘chirish
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="crm-empty">
          <div className="crm-empty-icon">◷</div>
          <h3>Reja hali yo‘q</h3>
          <p>Bir martalik, interval yoki haftalik reminder yarating.</p>
        </div>
      )}

      <ReminderComposer
        open={composerOpen}
        reminder={editingReminder}
        onClose={() => {
          setComposerOpen(false);
          setEditingReminder(null);
        }}
        onSaved={() => loadCenter(true)}
      />
      <ReminderSubjectDrawer panel={subjectPanel} onClose={closeSubjectDetails} />
    </main>
  );
}
