import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserMe } from '../services/api';

const ADMIN_LINKS = [
  {
    section: 'adminUsers',
    label: 'Foydalanuvchilar',
    path: '/admin/users',
    description: "Barcha userlar, rollar, ulangan/ulanmagan holat va tariflarni ko'rish.",
  },
  {
    section: 'adminDrivers',
    label: 'Haydovchilar',
    path: '/admin/drivers',
    description: 'Haydovchilar, transport, xabarchi va takliflar tarixi.',
  },
  {
    section: 'adminDriverLocations',
    label: 'Haydovchi lokatsiyalari',
    path: '/admin/driver-locations',
    description: 'Rozilik bilan ulashilgan jonli xarita, qurilma, signal va lokatsiya tarixi.',
  },
  {
    section: 'adminCargoOwners',
    label: 'Yuk egalari',
    path: '/admin/cargo-owners',
    description: 'Yuk egalari, ehtiyoj profili va yuk yaratish boshqaruvi.',
  },
  {
    section: 'adminTariffs',
    label: 'Tariflar',
    path: '/admin/tariffs',
    description: 'Premium tariflar, bepul limitlar, muddat va funksiya sozlamalari.',
  },
  {
    section: 'adminBroadcasts',
    label: 'Broadcast',
    path: '/admin/broadcasts',
    description: 'Rejalangan yoki test ommaviy xabarlarni boshqarish.',
  },
  {
    section: 'adminPremiumOrders',
    label: 'Premium yuklar',
    path: '/admin/premium-orders',
    description: 'Premium yuklar monitoringi, bloklash va tozalash.',
  },
  {
    section: 'adminUserbots',
    label: 'Userbotlar',
    path: '/admin/userbots',
    description: 'Userbot servis holati, monitoring va akkauntlar.',
  },
  {
    section: 'adminSenderBlacklist',
    label: 'Dispetcher blacklist',
    path: '/admin/sender-blacklist',
    description: "Yuk egasi filteridan chiqariladigan logist/dispetcher akkauntlar.",
  },
  {
    section: 'adminHarbingers',
    label: 'Xabarchilar',
    path: '/admin/harbingers',
    description: "Foydalanuvchi xabarchilarini ko'rish, egasiga o'tish va o'chirish.",
  },
  {
    section: 'adminViewHistory',
    label: 'Ko‘rish tarixi',
    path: '/admin/view-history',
    description: 'Ichki dispetcherlarning oxirgi 24 soatdagi yuk va transport ko‘rishlari.',
  },
  {
    section: 'adminCallRecordings',
    label: 'Qo‘ng‘iroq yozuvlari',
    path: '/admin/call-recordings',
    description: 'Barcha call yozuvlari, mos kelmagan qisqa raqamlar va audio ijrosi.',
  },
  {
    section: 'adminSettings',
    label: 'Sozlamalar',
    path: '/admin/settings',
    description: "Ruxsatlar, bo'lim ko'rinishi, media, limit va avtomatsiyalar.",
  },
];

// Yangi alohida admin panel manzili (faqat adminlarga ko'rinadigan tugma uchun)
const ADMIN_PANEL_URL =
  import.meta.env.VITE_ADMIN_PANEL_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : 'https://cargover.uz/panel/');

export default function AdminDashboardPage({ mobile = false }) {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSections, setAdminSections] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await getUserMe();
        if (response.code === 200 && response.result) {
          setIsAdmin(response.result.isAdmin === true);
          setAdminSections(response.result.navigation?.adminSections || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  const visibleLinks = useMemo(() => {
    if (!Array.isArray(adminSections)) return ADMIN_LINKS;
    return ADMIN_LINKS.filter((link) => adminSections.includes(link.section));
  }, [adminSections]);

  if (!authChecked) return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  if (!isAdmin) return <div style={{ padding: 24, color: '#c00' }}>Bu sahifa faqat adminlar uchun.</div>;

  return (
    <div style={{ ...pageStyle, padding: mobile ? '16px 12px 90px' : pageStyle.padding }}>
      <header style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Admin panel</h2>
          <p style={hintStyle}>
            Admin bo&apos;limlar bitta joyda. Top menyuda faqat bitta Admin tab ko&apos;rinadi.
          </p>
        </div>
        <a href={ADMIN_PANEL_URL} target="_blank" rel="noopener noreferrer" style={newPanelBtnStyle}>
          🚀 Yangi admin panel
        </a>
      </header>

      <section style={ruleCardStyle}>
        <strong>Tarif va Funksiya ruxsatlari qanday ishlaydi?</strong>
        <p style={{ ...hintStyle, margin: '6px 0 0' }}>
          Ruxsat &quot;Tarif yoki Funksiya ruxsati&quot; qoidasida ishlaydi. Agar tarifda funksiya ochiq bo&apos;lsa, user foydalanadi.
          Agar global Funksiya ruxsatlarida user guruhi ruxsatli bo&apos;lsa, tarifsiz ham foydalanadi. &quot;Hammasi&quot; tanlansa,
          bu funksiya barcha userlarga ochiladi va tarif cheklovi o&apos;sha funksiya uchun amalda bloklamaydi.
        </p>
      </section>

      {visibleLinks.length === 0 ? (
        <div style={emptyStyle}>
          Admin bo&apos;limlari hozircha ko&apos;rinmayapti. Bo&apos;lim ko&apos;rinishini sozlamalardan qayta yoqing.
        </div>
      ) : (
        <div style={{ ...gridStyle, gridTemplateColumns: mobile ? '1fr' : gridStyle.gridTemplateColumns }}>
          {visibleLinks.map((link) => (
            <button
              key={link.section}
              type="button"
              onClick={() => navigate(link.path)}
              style={cardStyle}
            >
              <span style={cardTitleStyle}>{link.label}</span>
              <span style={cardTextStyle}>{link.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const pageStyle = {
  padding: 24,
  maxWidth: 1120,
  margin: '0 auto',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 14,
};

const hintStyle = {
  margin: '5px 0 0',
  color: '#64748b',
  fontSize: 14,
  lineHeight: 1.45,
};

const ruleCardStyle = {
  background: '#f8fbff',
  border: '1px solid #dbeafe',
  borderRadius: 8,
  padding: 14,
  marginBottom: 16,
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 12,
};

const cardStyle = {
  display: 'grid',
  gap: 8,
  textAlign: 'left',
  border: '1px solid #e5e7eb',
  background: '#fff',
  borderRadius: 8,
  padding: 16,
  minHeight: 132,
  cursor: 'pointer',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

const cardTitleStyle = {
  color: '#111827',
  fontSize: 18,
  fontWeight: 900,
};

const cardTextStyle = {
  color: '#64748b',
  fontSize: 14,
  lineHeight: 1.45,
};

const newPanelBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 14px',
  background: '#2563eb',
  color: '#fff',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 700,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

const emptyStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 18,
  color: '#64748b',
};
