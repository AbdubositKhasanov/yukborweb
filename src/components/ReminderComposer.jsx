import React, { useEffect, useMemo, useState } from 'react';
import { createReminder, updateReminder } from '../services/api';
import { showError, showSuccess } from '../utils/toast';

const WEEKDAYS = [
  { value: 1, label: 'Du' },
  { value: 2, label: 'Se' },
  { value: 3, label: 'Cho' },
  { value: 4, label: 'Pa' },
  { value: 5, label: 'Ju' },
  { value: 6, label: 'Sha' },
  { value: 7, label: 'Ya' },
];

const pad = (value) => String(value).padStart(2, '0');

const toLocalInputValue = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const defaultDate = () => toLocalInputValue(Date.now() + 60 * 60 * 1000);

export default function ReminderComposer({ open, onClose, onSaved, subject, reminder }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [recurrence, setRecurrence] = useState('once');
  const [firstTriggerAt, setFirstTriggerAt] = useState(defaultDate());
  const [intervalValue, setIntervalValue] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState('hours');
  const [weekdays, setWeekdays] = useState([1, 3, 5]);
  const [timeOfDay, setTimeOfDay] = useState('10:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (reminder) {
      setTitle(reminder.title || '');
      setNote(reminder.note || '');
      setRecurrence(reminder.recurrence || 'once');
      setFirstTriggerAt(toLocalInputValue(reminder.nextTriggerAt || Date.now() + 3600000));
      const minutes = reminder.intervalMinutes || 60;
      if (minutes % 1440 === 0) {
        setIntervalValue(minutes / 1440);
        setIntervalUnit('days');
      } else if (minutes % 60 === 0) {
        setIntervalValue(minutes / 60);
        setIntervalUnit('hours');
      } else {
        setIntervalValue(minutes);
        setIntervalUnit('minutes');
      }
      setWeekdays(reminder.weekdays?.length ? reminder.weekdays : [1, 3, 5]);
      setTimeOfDay(reminder.timeOfDay || '10:00');
    } else {
      setTitle(subject?.name ? `${subject.name} bilan qayta bog'lanish` : 'Qayta telefon qilish');
      setNote('');
      setRecurrence('once');
      setFirstTriggerAt(defaultDate());
      setIntervalValue(1);
      setIntervalUnit('hours');
      setWeekdays([1, 3, 5]);
      setTimeOfDay('10:00');
    }
  }, [open, reminder, subject]);

  const intervalMinutes = useMemo(() => {
    const factor = intervalUnit === 'days' ? 1440 : intervalUnit === 'hours' ? 60 : 1;
    return Math.max(1, Number(intervalValue) || 1) * factor;
  }, [intervalUnit, intervalValue]);

  if (!open) return null;

  const applyPreset = (minutes) =>
    setFirstTriggerAt(toLocalInputValue(Date.now() + minutes * 60 * 1000));

  const toggleWeekday = (day) => {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort()
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return showError('Reminder nomini kiriting');
    if (!firstTriggerAt) return showError('Reminder vaqtini kiriting');
    if (recurrence === 'weekly' && weekdays.length === 0) {
      return showError('Haftaning kamida bir kunini tanlang');
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        note: note.trim(),
        subjectType: subject?.type || reminder?.subjectType || 'general',
        subjectId: subject?.id || reminder?.subjectId || null,
        subjectName: subject?.name || reminder?.subjectName || null,
        recurrence,
        intervalMinutes: recurrence === 'interval' ? intervalMinutes : null,
        weekdays: recurrence === 'weekly' ? weekdays : [],
        timeOfDay: recurrence === 'weekly' ? timeOfDay : null,
        firstTriggerAt: new Date(firstTriggerAt).getTime(),
      };
      const response = reminder
        ? await updateReminder(reminder.id, payload)
        : await createReminder(payload);
      if (response.code !== 200) throw new Error(response.message || 'Reminder saqlanmadi');
      showSuccess(reminder ? 'Reminder yangilandi' : 'Reminder yaratildi');
      onSaved?.(response.result);
      onClose();
    } catch (error) {
      showError(error.response?.data?.message || error.message || 'Reminder saqlanmadi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="crm-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="crm-modal crm-reminder-composer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-composer-title"
      >
        <header className="crm-modal-header">
          <div>
            <span className="crm-eyebrow">Eslatma</span>
            <h2 id="reminder-composer-title">
              {reminder ? 'Reminderni tahrirlash' : 'Yangi reminder'}
            </h2>
            {subject?.name && <p>{subject.name} uchun bog‘langan eslatma</p>}
          </div>
          <button type="button" className="crm-icon-button" onClick={onClose} aria-label="Yopish">
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="crm-form">
          <label className="crm-field crm-field-wide">
            <span>Reminder nomi</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
            />
          </label>

          <label className="crm-field crm-field-wide">
            <span>Izoh</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Masalan: narxni qayta tushuntirish, manzilga yetib kelganini tekshirish..."
            />
          </label>

          <div className="crm-field crm-field-wide">
            <span>Qachon?</span>
            <div className="crm-preset-row">
              <button type="button" onClick={() => applyPreset(30)}>
                30 daqiqada
              </button>
              <button type="button" onClick={() => applyPreset(60)}>
                1 soatda
              </button>
              <button type="button" onClick={() => applyPreset(24 * 60)}>
                Ertaga
              </button>
              <button type="button" onClick={() => applyPreset(3 * 24 * 60)}>
                3 kundan keyin
              </button>
            </div>
            <input
              type="datetime-local"
              value={firstTriggerAt}
              min={toLocalInputValue(Date.now())}
              onChange={(event) => setFirstTriggerAt(event.target.value)}
            />
          </div>

          <div className="crm-field crm-field-wide">
            <span>Takrorlanish</span>
            <div className="crm-segmented">
              <button
                type="button"
                className={recurrence === 'once' ? 'active' : ''}
                onClick={() => setRecurrence('once')}
              >
                Bir marta
              </button>
              <button
                type="button"
                className={recurrence === 'interval' ? 'active' : ''}
                onClick={() => setRecurrence('interval')}
              >
                Interval
              </button>
              <button
                type="button"
                className={recurrence === 'weekly' ? 'active' : ''}
                onClick={() => setRecurrence('weekly')}
              >
                Haftalik
              </button>
            </div>
          </div>

          {recurrence === 'interval' && (
            <div className="crm-inline-fields crm-field-wide">
              <label className="crm-field">
                <span>Har</span>
                <input
                  type="number"
                  min="1"
                  value={intervalValue}
                  onChange={(event) => setIntervalValue(event.target.value)}
                />
              </label>
              <label className="crm-field">
                <span>Oraliq</span>
                <select
                  value={intervalUnit}
                  onChange={(event) => setIntervalUnit(event.target.value)}
                >
                  <option value="minutes">daqiqa</option>
                  <option value="hours">soat</option>
                  <option value="days">kun</option>
                </select>
              </label>
            </div>
          )}

          {recurrence === 'weekly' && (
            <div className="crm-field crm-field-wide">
              <span>Hafta kunlari va vaqt</span>
              <div className="crm-weekdays">
                {WEEKDAYS.map((day) => (
                  <button
                    type="button"
                    key={day.value}
                    className={weekdays.includes(day.value) ? 'active' : ''}
                    onClick={() => toggleWeekday(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <input
                type="time"
                value={timeOfDay}
                onChange={(event) => setTimeOfDay(event.target.value)}
              />
            </div>
          )}

          <footer className="crm-modal-actions crm-field-wide">
            <button type="button" className="crm-button secondary" onClick={onClose}>
              Bekor qilish
            </button>
            <button type="submit" className="crm-button primary" disabled={saving}>
              {saving ? 'Saqlanmoqda…' : reminder ? 'Yangilash' : 'Reminder yaratish'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
