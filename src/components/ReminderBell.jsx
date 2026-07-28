import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReminderSummary, markReminderRead } from '../services/api';
import '../styles/dispatcher-crm.css';

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function ReminderBell({ mobile = false }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState({ unreadCount: 0, latest: [] });

  const load = useCallback(async () => {
    try {
      const response = await getReminderSummary();
      if (response.code === 200) setSummary(response.result || { unreadCount: 0, latest: [] });
    } catch (_) {
      // Bell background polling should remain quiet on transient network errors.
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const openCenter = () => {
    setOpen(false);
    navigate(mobile ? '/mobile/reminders' : '/reminders');
  };

  const openNotification = async (notification) => {
    if (!notification.readAt) {
      setSummary((current) => ({
        ...current,
        unreadCount: Math.max(0, current.unreadCount - 1),
        latest: current.latest.map((item) =>
          item.id === notification.id ? { ...item, readAt: Date.now() } : item
        ),
      }));
      markReminderRead(notification.id).catch(load);
    }
    openCenter();
  };

  return (
    <div className={`reminder-bell ${mobile ? 'mobile' : ''}`} ref={rootRef}>
      <button
        className="reminder-bell-button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Reminderlar"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {summary.unreadCount > 0 && (
          <span>{summary.unreadCount > 99 ? '99+' : summary.unreadCount}</span>
        )}
      </button>
      {open && (
        <section className="reminder-popover">
          <header>
            <div>
              <strong>Reminderlar</strong>
              <span>{summary.unreadCount} ta o‘qilmagan</span>
            </div>
            <button onClick={openCenter}>Barchasi</button>
          </header>
          {summary.latest.length ? (
            <div className="reminder-popover-list">
              {summary.latest.map((item) => (
                <button
                  key={item.id}
                  className={item.readAt ? 'read' : 'unread'}
                  onClick={() => openNotification(item)}
                >
                  <i />
                  <span>
                    <strong>{item.title}</strong>
                    {item.note && <small>{item.note}</small>}
                    <time>{formatTime(item.triggerAt)}</time>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="reminder-popover-empty">
              <b>✓</b>
              <span>Yangi reminder yo‘q</span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
