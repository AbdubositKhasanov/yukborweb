import React, { useCallback, useEffect, useState } from 'react';
import ReminderComposer from '../components/ReminderComposer';
import {
  deleteReminder,
  getReminderCenter,
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

export default function RemindersPage({ mobile = false }) {
  const [center, setCenter] = useState({ unreadCount: 0, notifications: [], schedules: [] });
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);

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
                      {notification.subjectName && (
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
                {schedule.subjectName && (
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
    </main>
  );
}
