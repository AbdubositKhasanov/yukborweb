# 📊 Order Response Field Mapping - UPDATED

## ✅ Real Backend Response Structure

### GET /my/orders Response:
```json
{
  "code": 200,
  "result": [
    {
      "id": "69556a5fc7169166c58b4f98",
      "chatId": 1373227721,
      "fromCity": "Toshkent",                    // ✅ Display
      "toCity": "Farg'ona",                       // ✅ Display
      "cargoName": "test",                        // ✅ Title
      "additionalPhone": "+998test",              // ✅ Contact
      "description": "null",                      // ✅ Details (check for "null" string)
      "status": "new",                            // ✅ Badge
      "driverId": 0,
      "createdTime": 1767205514566,               // ✅ Timestamp
      "source": "bot",
      "fromLocation": {                           // ✅ For search filters
        "cityId": 0,
        "regionId": 1,
        "countryId": 1
      },
      "toLocation": {
        "cityId": 0,
        "regionId": 7,
        "countryId": 1
      },
      "weightKg": 10.0,                          // ✅ Display & Filter
      "vehicleType": null                         // ⚠️ May be null
    }
  ]
}
```

## 🗂️ Field Usage

### Display Fields (UI)
```javascript
// Card Title
order.cargoName || `${order.fromCity} → ${order.toCity}`

// From/To Locations
order.fromCity  // "Toshkent"
order.toCity    // "Farg'ona"

// Weight
order.weightKg  // 10.0 kg

// Vehicle Type
order.vehicleType  // May be null

// Description
order.description !== 'null' && order.description  // Check for string "null"

// Status Badge
order.status  // "new", "active", "completed", etc.

// Created Date
new Date(order.createdTime).toLocaleDateString('uz-UZ')

// Phone
order.additionalPhone
```

### Search Filter Fields
```javascript
// Location IDs for search
order.fromLocation.countryId  // 1
order.fromLocation.regionId   // 1
order.fromLocation.cityId     // 0

// Weight for max_weight filter
order.weightKg  // 10.0

// Vehicle type filter
order.vehicleType  // null or "Tent", "Ref", etc.
```

## 🔄 Order → Transport Search Mapping

### Step 1: Extract from Order
```javascript
const filters = {
  fromCountry: order.fromLocation?.countryId,  // 1
  fromRegion: order.fromLocation?.regionId,    // 1
  fromCity: order.fromLocation?.cityId,        // 0
  vehicleType: order.vehicleType,              // null
  maxWeight: order.weightKg                    // 10.0
};
```

### Step 2: Convert to API Parameters
```javascript
// Frontend state (strings for select elements)
{
  fromCountry: "1",
  fromRegion: "1",
  fromCity: "0",
  vehicleType: null,
  maxWeight: "10"
}

// API call parameters
GET /transports?from_country=1&from_region=1&from_city=0&max_weight=10
```

### Step 3: Pass Order Info for Display
```javascript
navigate('/transports', {
  state: {
    orderId: "69556a5fc7169166c58b4f98",
    fromOrder: true,
    orderInfo: {
      cargoName: "test",
      fromCity: "Toshkent",
      toCity: "Farg'ona",
      weightKg: 10.0
    },
    filters: { ... }
  }
});
```

## 🎨 UI Display Examples

### Order Card (MyOrdersPage)
```jsx
<div className="card">
  <h3>{order.cargoName || `${order.fromCity} → ${order.toCity}`}</h3>
  
  <span className="badge">
    {order.status}  {/* "new" */}
  </span>
  
  <p>📍 Qayerdan: {order.fromCity}</p>     {/* Toshkent */}
  <p>📍 Qayerga: {order.toCity}</p>         {/* Farg'ona */}
  <p>⚖️ Og'irligi: {order.weightKg} kg</p> {/* 10.0 kg */}
  
  {order.vehicleType && (
    <p>🚚 Transport turi: {order.vehicleType}</p>
  )}
  
  {order.description !== 'null' && order.description && (
    <p>{order.description}</p>
  )}
</div>
```

### Order Info Banner (BrowseTransportsPage)
```jsx
<div className="info-banner">
  <p><strong>Yuk:</strong> {orderInfo.cargoName}</p>
  <p><strong>Marshrut:</strong> {orderInfo.fromCity} → {orderInfo.toCity}</p>
  <p><strong>Og'irlik:</strong> {orderInfo.weightKg} kg</p>
</div>
```

## ⚠️ Important Notes

### 1. String "null" Check
```javascript
// ❌ Wrong
if (order.description) { ... }

// ✅ Correct
if (order.description !== 'null' && order.description && order.description.trim()) { ... }
```

### 2. Null Vehicle Type
```javascript
// vehicleType may be null
{order.vehicleType && (
  <p>🚚 Transport turi: {order.vehicleType}</p>
)}
```

### 3. Zero cityId
```javascript
// cityId: 0 means not specified
// Still pass it to API, backend will handle it
fromCity: order.fromLocation?.cityId  // 0 is valid
```

### 4. Status Values
```javascript
// Known status values
"new"       → badge-success (green)
"active"    → badge-success (green)
"completed" → badge-warning (yellow)
other       → badge-danger (red)
```

## 🧪 Test Data

### Test Order 1 (From Example)
```json
{
  "id": "69556a5fc7169166c58b4f98",
  "cargoName": "test",
  "fromCity": "Toshkent",
  "toCity": "Farg'ona",
  "weightKg": 10.0,
  "fromLocation": {
    "countryId": 1,
    "regionId": 1,
    "cityId": 0
  },
  "status": "new"
}
```

**Expected Display:**
```
┌─────────────────────────────┐
│ test                   [new]│
│                             │
│ 📍 Qayerdan: Toshkent       │
│ 📍 Qayerga: Farg'ona        │
│ ⚖️ Og'irligi: 10.0 kg       │
│                             │
│ [🚚 Mashina topish]         │
│ [Telefon] [O'chirish]       │
└─────────────────────────────┘
```

**Expected Search Filters:**
```
Qayerdan: O'zbekiston > Toshkent viloyati > [Shahar tanlang]
Transport turi: [Hammasi]
Max og'irligi: 10
```

### Test Order 2 (With Vehicle Type)
```json
{
  "id": "test456",
  "cargoName": "Mebel",
  "fromCity": "Samarqand",
  "toCity": "Buxoro",
  "weightKg": 500.0,
  "vehicleType": "Tent",
  "fromLocation": {
    "countryId": 1,
    "regionId": 3,
    "cityId": 89
  }
}
```

**Expected Search Filters:**
```
Qayerdan: O'zbekiston > Samarqand viloyati > Samarqand
Transport turi: Tent
Max og'irligi: 500
```

## 🔍 Console Output Examples

### MyOrdersPage - handleFindTransport
```javascript
Order data for transport search: {
  orderId: "69556a5fc7169166c58b4f98",
  fromCity: "Toshkent",
  toCity: "Farg'ona",
  weightKg: 10.0,
  filters: {
    fromCountry: 1,
    fromRegion: 1,
    fromCity: 0,
    vehicleType: null,
    maxWeight: 10.0
  },
  originalOrder: { ... }
}
```

### BrowseTransportsPage - loadTransports
```javascript
Transport search filters: {
  fromCountry: "1",
  fromRegion: "1",
  fromCity: "0",
  vehicleType: "",
  maxWeight: "10",
  page: 0
}
From order: true
Order ID: "69556a5fc7169166c58b4f98"
Found transports: 3
```

## ✅ Verification Checklist

MyOrdersPage:
- [ ] Card title shows `cargoName` or `fromCity → toCity`
- [ ] Status badge displays correctly
- [ ] fromCity and toCity shown
- [ ] weightKg displays with "kg" unit
- [ ] vehicleType shown only if not null
- [ ] description shown only if not "null" string
- [ ] "Mashina topish" button present

BrowseTransportsPage:
- [ ] Info banner shows when fromOrder=true
- [ ] Order info displays: cargoName, route, weight
- [ ] Filters auto-filled from order
- [ ] Auto-search triggers on load
- [ ] "Taklif qilish" button visible
- [ ] Console logs show correct data

API Request:
- [ ] GET /transports with correct params
- [ ] from_country, from_region, from_city included
- [ ] max_weight = weightKg
- [ ] vehicle_type included if not null

Offer Feature:
- [ ] POST /offer_for_driver
- [ ] Body: { driver_id: chatId, order_id: orderId }
- [ ] Success message displays
- [ ] Button disabled after offer sent
