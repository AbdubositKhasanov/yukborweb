# 🚀 Tezkor O'rnatish Qo'llanmasi

## 1-Qadam: Talablar

Quyidagilar o'rnatilgan bo'lishi kerak:
- Node.js 16 yoki undan yuqori
- Backend serveri `http://167.172.68.133:8080` da ishlab turishi kerak

## 2-Qadam: Telegram Bot Username Sozlash

`.env` faylini oching va o'z bot usernameni kiriting:

```bash
VITE_TELEGRAM_BOT_USERNAME=sizning_bot_username
```

**Muhim:** `@` belgisisiz, faqat username kiriting. Masalan: `cargo_platform_bot`

## 3-Qadam: Dependency'larni O'rnatish

```bash
npm install
```

Bu quyidagi paketlarni o'rnatadi:
- React 18.2.0
- React Router DOM 6.20.0
- Axios 1.6.0
- Vite 5.0.8

## 4-Qadam: Development Serverini Ishga Tushirish

```bash
npm run dev
```

Brauzerda ochiladi: **http://localhost:3000**

## 5-Qadam: Tekshirish

### ✅ Asosiy Funksiyalarni Tekshirish

1. **Qidirish Sahifasi**
   - Sahifa ochildi
   - Filterlar ishlayapti
   - Yuklar ko'rinmoqda

2. **Login**
   - "Kirish" tugmasini bosing
   - Telegram redirect ishlayaptimi tekshiring
   - URL: `tg://resolve?domain=...`

3. **Premium Telefon Raqam**
   - Yuk kartochasida "Telefon raqamni ko'rish" tugmasi
   - Tugmani bosganizda modal oynasi ochiladi
   - Premium bo'lmasa: "Premium tarif kerak" xabari
   - Premium bo'lsa: Telefon raqam ko'rsatiladi

4. **Transport Yaratish**
   - Login qiling
   - "Transport yaratish" sahifasiga o'ting
   - Formani to'ldiring
   - Saqlang

5. **Harbinger Yaratish**
   - Login qiling
   - "Harbinger yaratish" sahifasiga o'ting
   - Formani to'ldiring
   - Saqlang

## 🔧 Muammolarni Hal Qilish

### Muammo: Backend'ga ulanmayapti

**Yechim:**
```bash
# Backend ishlayotganini tekshiring
curl http://167.172.68.133:8080/ping

# Agar ishlamasa, backend'ni ishga tushiring
```

### Muammo: Port band

**Yechim:**
```bash
# 3000 portni bo'shatish
lsof -ti:3000 | xargs kill -9

# Yoki vite.config.js'da portni o'zgartirish
server: { port: 3001 }
```

### Muammo: Telegram redirect ishlamayapti

**Yechim:**
1. `.env` faylidagi `VITE_TELEGRAM_BOT_USERNAME` to'g'riligini tekshiring
2. `@` belgisi bo'lmasligi kerak
3. Bot username haqiqiy bot username bo'lishi kerak

### Muammo: npm install xatolik beradi

**Yechim:**
```bash
# Cache'ni tozalash
npm cache clean --force

# Eski fayllarni o'chirish
rm -rf node_modules package-lock.json

# Qayta o'rnatish
npm install
```

## 📱 Production Uchun Build

```bash
# Build qilish
npm run build

# Preview qilish
npm run preview
```

Output: `dist/` papkasida

## ✅ Tekshirish Ro'yxati

Quyidagilarni tekshiring:

- [ ] Sahifa http://localhost:3000 da ochildi
- [ ] Navigation bar ko'rinmoqda
- [ ] "Qidirish" sahifasi ishlayapti
- [ ] Filterlar to'g'ri ishlayapti
- [ ] "Telefon raqamni ko'rish" tugmasi bor
- [ ] Telegram login redirect ishlayapti
- [ ] Transport yaratish ishlayapti (login qilgandan keyin)
- [ ] Harbinger yaratish ishlayapti (login qilgandan keyin)
- [ ] Barcha matnlar o'zbek tilida
- [ ] Mobil qurilmalarda to'g'ri ko'rinmoqda

## 🎯 Keyingi Qadamlar

1. Telegram botni to'liq sozlang
2. Backend'da CORS'ni yoqing (agar kerak bo'lsa)
3. Production API URL'ni `.env` ga kiriting
4. Premium funksiyani backend'da test qiling
5. Build qilib, serverga deploy qiling

## 💡 Maslahatlar

- **Development:** `npm run dev` ishlatiladi
- **Production:** `npm run build` keyin `dist/` serverga yuklanadi
- **Debug:** Brauzer consoleni oching (F12)
- **Network:** Network tab'da API requestlarni ko'ring

## 🆘 Yordam

Agar muammo bo'lsa:
1. Browser console'ni tekshiring
2. Network tab'da API requestlarni ko'ring
3. Backend loglarini ko'ring
4. README.md'ni o'qing

---

**Omad! 🚀**
