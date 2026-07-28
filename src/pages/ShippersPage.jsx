import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReminderComposer from '../components/ReminderComposer';
import { createShipper, deleteShipper, getShippers, updateShipper } from '../services/api';
import { showError, showSuccess } from '../utils/toast';
import '../styles/dispatcher-crm.css';

const STATUS_OPTIONS = [
  { value: 'potential', label: 'Potensial' },
  { value: 'active', label: 'Faol' },
  { value: 'paused', label: 'Kutilmoqda' },
  { value: 'inactive', label: 'Nofaol' },
];

const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
const joinList = (items) => (items || []).join(', ');

const initialForm = {
  companyName: '',
  contactName: '',
  phone: '',
  additionalPhone: '',
  telegramUsername: '',
  clientType: 'company',
  status: 'potential',
  taxId: '',
  country: 'O‘zbekiston',
  region: '',
  city: '',
  address: '',
  cargoTypes: '',
  routes: '',
  preferredVehicleTypes: '',
  monthlyLoads: '',
  paymentType: '',
  paymentTerms: '',
  notes: '',
  tags: '',
  lastContactAt: '',
  customFields: [],
};

const toDateTimeLocal = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const fromShipper = (shipper) =>
  shipper
    ? {
        ...initialForm,
        ...shipper,
        cargoTypes: joinList(shipper.cargoTypes),
        routes: joinList(shipper.routes),
        preferredVehicleTypes: joinList(shipper.preferredVehicleTypes),
        tags: joinList(shipper.tags),
        monthlyLoads: shipper.monthlyLoads ?? '',
        lastContactAt: toDateTimeLocal(shipper.lastContactAt),
        customFields: Object.entries(shipper.customFields || {}).map(([key, value]) => ({
          key,
          value,
        })),
      }
    : initialForm;

const statusLabel = (status) =>
  STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
const formatDate = (timestamp) =>
  timestamp
    ? new Date(timestamp).toLocaleString('uz-UZ', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Kiritilmagan';

export default function ShippersPage({ mobile = false }) {
  const [data, setData] = useState({ items: [], total: 0, hasMore: false, page: 0 });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reminderSubject, setReminderSubject] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getShippers({ query: query.trim(), status, page });
      if (response.code !== 200) throw new Error(response.message || 'Yukchilar yuklanmadi');
      setData(response.result || { items: [], total: 0, hasMore: false, page });
    } catch (error) {
      showError(error.response?.data?.message || error.message || 'Yukchilar yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [page, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => setPage(0), [query, status]);

  const stats = useMemo(
    () => ({
      all: data.total,
      active: data.items.filter((item) => item.status === 'active').length,
      needsContact: data.items.filter(
        (item) => !item.lastContactAt || Date.now() - item.lastContactAt > 7 * 86400000
      ).length,
    }),
    [data]
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (shipper) => {
    setEditing(shipper);
    setFormOpen(true);
  };
  const openReminder = (shipper) =>
    setReminderSubject({
      type: 'shipper',
      id: shipper.id,
      name: shipper.companyName || shipper.contactName,
    });

  const handleDelete = async (shipper) => {
    if (
      !window.confirm(
        `“${shipper.companyName || shipper.contactName}” va unga bog‘langan reminderlarni o‘chirasizmi?`
      )
    )
      return;
    try {
      const response = await deleteShipper(shipper.id);
      if (response.code !== 200) throw new Error(response.message);
      setSelected(null);
      showSuccess('Yukchi o‘chirildi');
      load();
    } catch (error) {
      showError(error.response?.data?.message || error.message || 'O‘chirilmadi');
    }
  };

  return (
    <main className={`crm-page ${mobile ? 'mobile' : ''}`}>
      <section className="crm-hero shippers-hero">
        <div>
          <span className="crm-eyebrow">Ichki logist CRM</span>
          <h1>Yukchilar bazasi</h1>
          <p>Aloqalar, yo‘nalishlar, yuk ehtiyoji va keyingi qadam bir joyda.</p>
        </div>
        <button className="crm-button primary hero-action" onClick={openCreate}>
          <span>＋</span> Yukchi qo‘shish
        </button>
      </section>

      <section className="crm-stat-grid">
        <div>
          <span>Jami baza</span>
          <strong>{stats.all}</strong>
        </div>
        <div>
          <span>Shu sahifada faol</span>
          <strong>{stats.active}</strong>
        </div>
        <div>
          <span>Aloqa kerak</span>
          <strong>{stats.needsContact}</strong>
        </div>
      </section>

      <section className="crm-toolbar shippers-toolbar">
        <label className="crm-search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kompaniya, kontakt, telefon, yo‘nalish…"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Tozalash">
              ×
            </button>
          )}
        </label>
        <div className="crm-filter-chips">
          <button className={!status ? 'active' : ''} onClick={() => setStatus('')}>
            Barchasi
          </button>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={status === option.value ? 'active' : ''}
              onClick={() => setStatus(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="crm-empty">
          <div className="crm-loader" />
          <p>Baza yuklanmoqda…</p>
        </div>
      ) : data.items.length ? (
        <div className="shipper-grid">
          {data.items.map((shipper) => (
            <div
              key={shipper.id}
              className="shipper-card"
              role="button"
              tabIndex={0}
              onClick={() => setSelected(shipper)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setSelected(shipper);
              }}
            >
              <div className="shipper-card-head">
                <div className="shipper-avatar">
                  {(shipper.companyName || shipper.contactName || 'Y').slice(0, 1).toUpperCase()}
                </div>
                <div className="shipper-title">
                  <span className={`crm-status ${shipper.status}`}>
                    {statusLabel(shipper.status)}
                  </span>
                  <h3>{shipper.companyName || shipper.contactName}</h3>
                  {shipper.companyName && <p>{shipper.contactName}</p>}
                </div>
                <button
                  className="crm-icon-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEdit(shipper);
                  }}
                  aria-label="Tahrirlash"
                >
                  •••
                </button>
              </div>
              <div className="shipper-contact">
                <a href={`tel:${shipper.phone}`} onClick={(event) => event.stopPropagation()}>
                  ☎ {shipper.phone}
                </a>
                <span>
                  ⌖{' '}
                  {[shipper.region, shipper.city].filter(Boolean).join(', ') ||
                    'Manzil kiritilmagan'}
                </span>
              </div>
              {(shipper.routes?.length > 0 || shipper.cargoTypes?.length > 0) && (
                <div className="shipper-tags">
                  {shipper.routes?.slice(0, 2).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                  {shipper.cargoTypes?.slice(0, 2).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              )}
              <div className="shipper-card-footer">
                <div>
                  <span>Oxirgi aloqa</span>
                  <strong>
                    {shipper.lastContactAt ? formatDate(shipper.lastContactAt) : 'Hali yo‘q'}
                  </strong>
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    openReminder(shipper);
                  }}
                >
                  ◷ Reminder
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="crm-empty">
          <div className="crm-empty-icon">◎</div>
          <h3>Yukchi topilmadi</h3>
          <p>Filterlarni tozalang yoki yangi yukchi qo‘shing.</p>
          <button className="crm-button primary" onClick={openCreate}>
            Yukchi qo‘shish
          </button>
        </div>
      )}

      {(page > 0 || data.hasMore) && (
        <div className="crm-pagination">
          <button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
            ← Oldingi
          </button>
          <span>{page + 1}-sahifa</span>
          <button disabled={!data.hasMore} onClick={() => setPage((value) => value + 1)}>
            Keyingi →
          </button>
        </div>
      )}

      <ShipperFormModal
        open={formOpen}
        shipper={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={(saved) => {
          setSelected(saved);
          load();
        }}
      />
      <ShipperDetails
        shipper={selected}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        onReminder={openReminder}
        onDelete={handleDelete}
      />
      <ReminderComposer
        open={Boolean(reminderSubject)}
        subject={reminderSubject}
        onClose={() => setReminderSubject(null)}
      />
    </main>
  );
}

function ShipperFormModal({ open, shipper, onClose, onSaved }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(fromShipper(shipper));
  }, [open, shipper]);
  if (!open) return null;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateCustom = (index, key, value) =>
    setForm((current) => ({
      ...current,
      customFields: current.customFields.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      ),
    }));
  const removeCustom = (index) =>
    setForm((current) => ({
      ...current,
      customFields: current.customFields.filter((_, itemIndex) => itemIndex !== index),
    }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        cargoTypes: splitList(form.cargoTypes),
        routes: splitList(form.routes),
        preferredVehicleTypes: splitList(form.preferredVehicleTypes),
        tags: splitList(form.tags),
        monthlyLoads: form.monthlyLoads === '' ? null : Number(form.monthlyLoads),
        lastContactAt: form.lastContactAt ? new Date(form.lastContactAt).getTime() : null,
        customFields: Object.fromEntries(
          form.customFields
            .filter((item) => item.key.trim())
            .map((item) => [item.key.trim(), item.value.trim()])
        ),
      };
      const response = shipper
        ? await updateShipper(shipper.id, payload)
        : await createShipper(payload);
      if (response.code !== 200) throw new Error(response.message || 'Saqlanmadi');
      showSuccess(shipper ? 'Yukchi yangilandi' : 'Yukchi bazaga qo‘shildi');
      onSaved?.(response.result);
      onClose();
    } catch (error) {
      showError(error.response?.data?.message || error.message || 'Saqlanmadi');
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
      <section className="crm-modal shipper-form-modal" role="dialog" aria-modal="true">
        <header className="crm-modal-header">
          <div>
            <span className="crm-eyebrow">Yukchi kartasi</span>
            <h2>{shipper ? 'Ma’lumotlarni tahrirlash' : 'Yangi yukchi'}</h2>
            <p>Majburiy maydonlar faqat ism va telefon — qolganini keyin to‘ldirish mumkin.</p>
          </div>
          <button className="crm-icon-button" onClick={onClose}>
            ×
          </button>
        </header>
        <form className="crm-form shipper-form" onSubmit={submit}>
          <h3 className="crm-form-section">Asosiy ma’lumotlar</h3>
          <label className="crm-field">
            <span>Kompaniya</span>
            <input
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
              placeholder="MChJ / fermer xo‘jaligi"
            />
          </label>
          <label className="crm-field">
            <span>Kontakt shaxs *</span>
            <input
              required
              value={form.contactName}
              onChange={(e) => update('contactName', e.target.value)}
            />
          </label>
          <label className="crm-field">
            <span>Asosiy telefon *</span>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+998 90 123 45 67"
            />
          </label>
          <label className="crm-field">
            <span>Qo‘shimcha telefon</span>
            <input
              type="tel"
              value={form.additionalPhone}
              onChange={(e) => update('additionalPhone', e.target.value)}
            />
          </label>
          <label className="crm-field">
            <span>Telegram</span>
            <input
              value={form.telegramUsername}
              onChange={(e) => update('telegramUsername', e.target.value)}
              placeholder="@username"
            />
          </label>
          <label className="crm-field">
            <span>Mijoz turi</span>
            <select value={form.clientType} onChange={(e) => update('clientType', e.target.value)}>
              <option value="company">Kompaniya</option>
              <option value="individual">Jismoniy shaxs</option>
            </select>
          </label>
          <label className="crm-field">
            <span>Status</span>
            <select value={form.status} onChange={(e) => update('status', e.target.value)}>
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="crm-field">
            <span>STIR / INN</span>
            <input value={form.taxId} onChange={(e) => update('taxId', e.target.value)} />
          </label>

          <h3 className="crm-form-section">Manzil va logistika profili</h3>
          <label className="crm-field">
            <span>Davlat</span>
            <input value={form.country} onChange={(e) => update('country', e.target.value)} />
          </label>
          <label className="crm-field">
            <span>Viloyat</span>
            <input value={form.region} onChange={(e) => update('region', e.target.value)} />
          </label>
          <label className="crm-field">
            <span>Shahar / tuman</span>
            <input value={form.city} onChange={(e) => update('city', e.target.value)} />
          </label>
          <label className="crm-field">
            <span>To‘liq manzil</span>
            <input value={form.address} onChange={(e) => update('address', e.target.value)} />
          </label>
          <label className="crm-field crm-field-wide">
            <span>
              Asosiy yo‘nalishlar <small>vergul bilan</small>
            </span>
            <input
              value={form.routes}
              onChange={(e) => update('routes', e.target.value)}
              placeholder="Toshkent → Samarqand, Farg‘ona → Toshkent"
            />
          </label>
          <label className="crm-field">
            <span>Yuk turlari</span>
            <input
              value={form.cargoTypes}
              onChange={(e) => update('cargoTypes', e.target.value)}
              placeholder="meva, tekstil"
            />
          </label>
          <label className="crm-field">
            <span>Kerakli transportlar</span>
            <input
              value={form.preferredVehicleTypes}
              onChange={(e) => update('preferredVehicleTypes', e.target.value)}
              placeholder="tent, ref"
            />
          </label>
          <label className="crm-field">
            <span>Oyiga yuklar soni</span>
            <input
              type="number"
              min="0"
              value={form.monthlyLoads}
              onChange={(e) => update('monthlyLoads', e.target.value)}
            />
          </label>

          <h3 className="crm-form-section">Kelishuv va aloqa</h3>
          <label className="crm-field">
            <span>To‘lov turi</span>
            <input
              value={form.paymentType}
              onChange={(e) => update('paymentType', e.target.value)}
              placeholder="naqd, o‘tkazma"
            />
          </label>
          <label className="crm-field">
            <span>To‘lov sharti</span>
            <input
              value={form.paymentTerms}
              onChange={(e) => update('paymentTerms', e.target.value)}
              placeholder="50% oldindan"
            />
          </label>
          <label className="crm-field">
            <span>Oxirgi aloqa</span>
            <input
              type="datetime-local"
              value={form.lastContactAt}
              onChange={(e) => update('lastContactAt', e.target.value)}
            />
          </label>
          <label className="crm-field">
            <span>Teglar</span>
            <input
              value={form.tags}
              onChange={(e) => update('tags', e.target.value)}
              placeholder="VIP, mavsumiy"
            />
          </label>
          <label className="crm-field crm-field-wide">
            <span>Izohlar</span>
            <textarea
              rows="4"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Kelishuvlar, odatlar va muhim eslatmalar…"
            />
          </label>

          <h3 className="crm-form-section">Qo‘shimcha maydonlar</h3>
          <div className="crm-custom-fields crm-field-wide">
            {form.customFields.map((item, index) => (
              <div key={index}>
                <input
                  value={item.key}
                  onChange={(e) => updateCustom(index, 'key', e.target.value)}
                  placeholder="Maydon nomi"
                />
                <input
                  value={item.value}
                  onChange={(e) => updateCustom(index, 'value', e.target.value)}
                  placeholder="Qiymat"
                />
                <button type="button" onClick={() => removeCustom(index)}>
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="crm-text-button"
              onClick={() => update('customFields', [...form.customFields, { key: '', value: '' }])}
            >
              ＋ Qo‘shimcha maydon
            </button>
          </div>

          <footer className="crm-modal-actions crm-field-wide">
            <button type="button" className="crm-button secondary" onClick={onClose}>
              Bekor qilish
            </button>
            <button className="crm-button primary" disabled={saving}>
              {saving ? 'Saqlanmoqda…' : 'Saqlash'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ShipperDetails({ shipper, onClose, onEdit, onReminder, onDelete }) {
  if (!shipper) return null;
  const details = [
    ['Kontakt', shipper.contactName],
    ['Telefon', shipper.phone],
    ['Qo‘shimcha telefon', shipper.additionalPhone],
    ['Telegram', shipper.telegramUsername ? `@${shipper.telegramUsername}` : null],
    ['STIR / INN', shipper.taxId],
    [
      'Manzil',
      [shipper.country, shipper.region, shipper.city, shipper.address].filter(Boolean).join(', '),
    ],
    ['Oyiga yuk', shipper.monthlyLoads != null ? `${shipper.monthlyLoads} ta` : null],
    ['To‘lov', [shipper.paymentType, shipper.paymentTerms].filter(Boolean).join(' · ')],
    ['Oxirgi aloqa', formatDate(shipper.lastContactAt)],
  ];
  return (
    <div
      className="crm-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="crm-drawer">
        <header>
          <div className="shipper-avatar large">
            {(shipper.companyName || shipper.contactName).slice(0, 1).toUpperCase()}
          </div>
          <div>
            <span className={`crm-status ${shipper.status}`}>{statusLabel(shipper.status)}</span>
            <h2>{shipper.companyName || shipper.contactName}</h2>
            {shipper.companyName && <p>{shipper.contactName}</p>}
          </div>
          <button className="crm-icon-button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="crm-drawer-actions">
          <a className="crm-button primary" href={`tel:${shipper.phone}`}>
            ☎ Qo‘ng‘iroq
          </a>
          <button className="crm-button reminder" onClick={() => onReminder(shipper)}>
            ◷ Reminder
          </button>
        </div>
        <dl>
          {details
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        {shipper.routes?.length > 0 && (
          <section>
            <h3>Yo‘nalishlar</h3>
            <div className="shipper-tags">
              {shipper.routes.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>
        )}
        {shipper.cargoTypes?.length > 0 && (
          <section>
            <h3>Yuk turlari</h3>
            <div className="shipper-tags">
              {shipper.cargoTypes.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>
        )}
        {shipper.notes && (
          <section>
            <h3>Izoh</h3>
            <p className="detail-note">{shipper.notes}</p>
          </section>
        )}
        {Object.keys(shipper.customFields || {}).length > 0 && (
          <section>
            <h3>Qo‘shimcha</h3>
            <dl>
              {Object.entries(shipper.customFields).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <footer>
          <button onClick={() => onEdit(shipper)}>Tahrirlash</button>
          <button className="danger" onClick={() => onDelete(shipper)}>
            O‘chirish
          </button>
        </footer>
      </aside>
    </div>
  );
}
