# Cargo Platform - Updated Version

## O'zgarishlar (Changes)

Ushbu versiyada quyidagi yangi funksiyalar qo'shildi:

### 1. Transport ma'lumotlarini tahrirlash modali
**Fayl:** `src/components/EditTransportModal.jsx`

- Driver Status sahifasida "Ma'lumotlarni tahrirlash" tugmasi bosilganda ochiladi
- Har safar ochilganda `GET /forms/driver/transport` dan yangi ma'lumot oladi
- Loading va error holatlari ko'rsatiladi
- Form maydonlari API javobidan to'ldiriladi

**Ishlatish:**
```jsx
import EditTransportModal from '../components/EditTransportModal';

<EditTransportModal
  isOpen={showEditModal}
  onClose={() => setShowEditModal(false)}
  onSuccess={handleEditSuccess}
  staticData={staticData}
/>
```

### 2. Telefon raqamni ko'rish logikasi
**Fayllar:**
- `src/services/phoneAccess.js` - Asosiy logika
- `src/components/PhoneAccessModal.jsx` - Modal component

**Holatlar:**
1. **401 (Unauthorized)**: "Tizimga kiring" xabari
2. **200 + bo'sh telefon**: Premium xizmat talab qilinadi + Telegram link
3. **200 + telefon bor**: Telefon raqam ko'rsatiladi

**Ishlatish:**
```jsx
import { handlePhoneAccess } from '../services/phoneAccess';
import PhoneAccessModal from './PhoneAccessModal';

const result = await handlePhoneAccess(requestCargoPhone, cargoId);
```

## Yangilangan fayllar

### Components
- ✅ `src/components/CargoCard.jsx` - Yangi telefon logikasi bilan
- ✅ `src/components/EditTransportModal.jsx` - Yangi
- ✅ `src/components/PhoneAccessModal.jsx` - Yangi
- ✅ `src/components/TransportCard.jsx` - Yangi

### Services
- ✅ `src/services/phoneAccess.js` - Yangi

### Pages
- ✅ `src/pages/DriverStatusPage.jsx` - Modal bilan yangilandi

### Styles
- ✅ `src/styles/main.css` - Modal stillari qo'shildi

## O'rnatish (Installation)

```bash
# Extract the archive
tar -xzf cargo-platform-updated.tar.gz

# Navigate to directory
cd cargo-platform-complete

# Install dependencies
npm install

# Run development server
npm run dev
```

## API Integration

### Task 1: Driver Transport Edit
```
GET /forms/driver/transport
PUT /update/transportForm/{id}
```

### Task 2: Phone Access
```
GET /cargo/{id}
GET /transport/{id}
```

## Xususiyatlar (Features)

✅ Har safar yangi ma'lumot yuklanadi (kesh yo'q)
✅ Loading va error holatlari
✅ 401 holati to'g'ri boshqariladi
✅ Premium talab qilinsa Telegram link ko'rsatiladi
✅ Narx va to'lov ko'rsatilmaydi
✅ Modal stillari responsive

## Muhim eslatmalar

1. **Har safar yangi ma'lumot**: Edit modal har ochilganda API chaqiradi
2. **401 holati**: Foydalanuvchini avtomatik redirect qilmaydi
3. **Premium**: Faqat xabar va Telegram link, narx yo'q
4. **Phone validation**: null yoki bo'sh string Premium talab qiladi

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Dependencies

Barcha kerakli dependencies `package.json` faylida mavjud.

## Testing

```bash
# Run tests
npm test

# Build for production
npm run build
```

## Support

Muammolar bo'lsa: https://t.me/yukborsupport
