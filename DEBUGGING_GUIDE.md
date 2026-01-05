# 🔍 Order to Transport Search - Debugging Guide

## ✅ Tuzatilgan Muammolar

### 1. Order Ma'lumotlari To'g'ri Map Qilinmagan Edi
**Muammo:**
```javascript
// Noto'g'ri - order obyektida bunday field'lar yo'q
maxWeight: order.weightKg  // ❌
```

**Yechim:**
```javascript
// To'g'ri - ikkala variant ham ishlaydi
maxWeight: order.weightKg || order.weightOfCargo?.value  // ✅
```

### 2. Filter'lar Qo'llanilmagan Edi
**Muammo:** State initialFilters dan kelib, lekin loadTransports() ularga qaramaydi

**Yechim:** State'ga to'g'ri initial values berildi:
```javascript
const [fromCountry, setFromCountry] = useState(initialFilters.fromCountry?.toString() || '');
const [fromRegion, setFromRegion] = useState(initialFilters.fromRegion?.toString() || '');
const [fromCity, setFromCity] = useState(initialFilters.fromCity?.toString() || '');
const [vehicleType, setVehicleType] = useState(initialFilters.vehicleType || '');
const [maxWeight, setMaxWeight] = useState(initialFilters.maxWeight?.toString() || '');
```

### 3. Auto-search Ishlamayotgan Edi
**Yechim:** useEffect to'g'ri sozlandi:
```javascript
useEffect(() => {
  loadStaticData();
  if (fromOrder) {
    loadTransports(); // ✅ Avtomatik qidirish
  }
}, []);
```

## 📊 Order Model → Search Filters Mapping

### Backend Order Model (CargoDto):
```kotlin
data class CargoDto(
    val id: String?,
    var chatId: Long?,
    var fromLocation: LocationModel?,  // ← bu ishlatiladi
    var toLocation: LocationModel?,    // transport qidiruvda kerak emas
    var weightKg: Double?,              // ← bu ishlatiladi
    var vehicleType: String?,           // ← bu ishlatiladi
    var vehicleTypeId: Int?
)
```

### Frontend Order Object (response):
```javascript
{
  id: "abc123",
  chatId: 987654321,
  
  // Location fields
  fromLocation: {
    countryId: 1,
    regionId: 12,
    cityId: 245
  },
  
  // Weight fields (ikki variant bo'lishi mumkin)
  weightKg: 500,
  // YO'Q
  weightOfCargo: { value: 500, unit: "kg" },
  
  // Vehicle type
  vehicleType: "Tent",
  vehicleTypeId: 3,
  
  // Display fields
  loc1: "Tashkent",
  fullLoc1: "Tashkent, Toshkent, O'zbekiston"
}
```

### Search Filters Object:
```javascript
{
  fromCountry: 1,        // order.fromLocation.countryId
  fromRegion: 12,        // order.fromLocation.regionId
  fromCity: 245,         // order.fromLocation.cityId
  vehicleType: "Tent",   // order.vehicleType
  maxWeight: 500         // order.weightKg || order.weightOfCargo?.value
}
```

### Backend Search API Parameters:
```
GET /transports?from_country=1&from_region=12&from_city=245&vehicle_type=Tent&max_weight=500
```

## 🧪 Test Scenariylar

### Test 1: Oddiy Order
```javascript
// Order object
{
  id: "order123",
  fromLocation: { countryId: 1, regionId: 12, cityId: 245 },
  weightKg: 500,
  vehicleType: "Tent"
}

// Expected search filters
{
  fromCountry: "1",
  fromRegion: "12", 
  fromCity: "245",
  vehicleType: "Tent",
  maxWeight: "500"
}

// Expected API call
GET /transports?from_country=1&from_region=12&from_city=245&vehicle_type=Tent&max_weight=500
```

### Test 2: Order with weightOfCargo
```javascript
// Order object
{
  id: "order456",
  fromLocation: { countryId: 1, regionId: 12, cityId: 245 },
  weightOfCargo: { value: 1000, unit: "kg" },
  vehicleType: "Ref"
}

// Expected search filters
{
  fromCountry: "1",
  fromRegion: "12",
  fromCity: "245", 
  vehicleType: "Ref",
  maxWeight: "1000"  // from weightOfCargo.value
}
```

### Test 3: Order with Partial Location
```javascript
// Order object
{
  id: "order789",
  fromLocation: { countryId: 1, regionId: 12 },  // cityId yo'q
  weightKg: 750,
  vehicleType: "Tent"
}

// Expected search filters
{
  fromCountry: "1",
  fromRegion: "12",
  fromCity: undefined,  // bo'sh
  vehicleType: "Tent",
  maxWeight: "750"
}

// Expected API call (cityId yo'q)
GET /transports?from_country=1&from_region=12&vehicle_type=Tent&max_weight=750
```

## 🔍 Console Logs

### MyOrdersPage - handleFindTransport:
```javascript
console.log('Order data for transport search:', {
  orderId: order.id,
  filters: filters,
  originalOrder: order
});
```

**Expected output:**
```
Order data for transport search: {
  orderId: "order123",
  filters: {
    fromCountry: 1,
    fromRegion: 12,
    fromCity: 245,
    vehicleType: "Tent",
    maxWeight: 500
  },
  originalOrder: { ... }
}
```

### BrowseTransportsPage - loadTransports:
```javascript
console.log('Transport search filters:', filters);
console.log('From order:', fromOrder);
console.log('Order ID:', orderId);
console.log('Found transports:', response.result?.length);
```

**Expected output:**
```
Transport search filters: {
  fromCountry: "1",
  fromRegion: "12",
  fromCity: "245",
  vehicleType: "Tent",
  maxWeight: "500",
  page: 0
}
From order: true
Order ID: "order123"
Found transports: 5
```

## 🐛 Debugging Checklist

### MyOrdersPage ga o'tganda:
- [ ] "Mashina topish" tugmasi har bir order kartochkasida?
- [ ] Console'da "Order data for transport search" log'i chiqadimi?
- [ ] filters obyektida to'g'ri qiymatlar bormi?

### "Mashina topish" bosilganda:
- [ ] `/transports` sahifasiga o'tdimi?
- [ ] URL da state bor: `{ orderId, fromOrder: true, filters }`
- [ ] Info banner ko'rinadimi? ("Yukingiz uchun mos haydovchilar...")

### BrowseTransportsPage yuklanganida:
- [ ] Console'da "Transport search filters" log'i chiqadimi?
- [ ] fromOrder = true?
- [ ] orderId to'g'rimi?
- [ ] Filter'lar select'larda to'g'ri tanlanganmi?
- [ ] Avtomatik qidiruv ishga tushdimi?

### Network tab (DevTools):
- [ ] GET /transports request ketdimi?
- [ ] Query params to'g'rimi?
  ```
  ?from_country=1&from_region=12&from_city=245&vehicle_type=Tent&max_weight=500
  ```
- [ ] Response 200 OK?
- [ ] response.result da transportlar bormi?

### Transport Card:
- [ ] "Taklif qilish" tugmasi ko'rinadimi?
- [ ] "Taklif qilish" bosilsa confirm dialog chiqadimi?
- [ ] POST /offer_for_driver request ketdimi?
- [ ] Body da driver_id va order_id bormi?
- [ ] Success xabari chiqadimi?

## 🔧 Agar Ishlamasa

### Problem 1: Filter'lar bo'sh
**Sabab:** Order obyektida field'lar noto'g'ri nomlangan
**Yechim:** Console'da originalOrder ni tekshiring:
```javascript
console.log('Original order:', order);
console.log('fromLocation:', order.fromLocation);
console.log('weightKg:', order.weightKg);
console.log('vehicleType:', order.vehicleType);
```

### Problem 2: Transportlar topilmadi
**Sabab:** Backend'da mos transportlar yo'q yoki filter'lar noto'g'ri
**Yechim:** 
1. Network tab'da request params tekshiring
2. Backend'da matching transportlar bormi?
3. Filter'larni qo'lda o'zgartiring va qayta qidiring

### Problem 3: "Taklif qilish" tugmasi ko'rinmaydi
**Sabab:** fromOrder = false yoki state yo'qolgan
**Yechim:**
```javascript
console.log('fromOrder:', fromOrder);
console.log('location.state:', location.state);
```

### Problem 4: Taklif yuborilmayapti
**Sabab:** driver_id yoki order_id noto'g'ri
**Yechim:**
```javascript
console.log('transport.chatId:', transport.chatId);
console.log('orderId:', orderId);
```

## 📝 Code Review Checklist

- [x] Order fields to'g'ri map qilingan (fromLocation, weightKg, vehicleType)
- [x] Filter state'lar initialFilters dan to'g'ri set qilingan
- [x] Auto-search fromOrder bo'lsa ishga tushadi
- [x] Console.log'lar debugging uchun qo'shilgan
- [x] Info banner fromOrder bo'lsa ko'rinadi
- [x] "Taklif qilish" tugmasi faqat fromOrder=true da
- [x] Error handling bor
- [x] Success feedback bor

## ✅ Final Verification

1. **MyOrdersPage'dan boshlang:**
   ```
   /my-orders → "Mashina topish" → /transports?state={...}
   ```

2. **Console'ni oching:**
   ```
   F12 → Console tab
   ```

3. **Network'ni oching:**
   ```
   F12 → Network tab → XHR filter
   ```

4. **Har bir qadamni kuzating:**
   - Order data log
   - Filter state log
   - API request
   - Response data
   - Transport cards render
   - Offer button visible
   - Offer request/response

Hammasi ishlasa - SUCCESS! 🎉
