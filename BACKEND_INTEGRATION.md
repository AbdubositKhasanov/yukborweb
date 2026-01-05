# EditTransportModal - Backend Integration

## API Endpoints

### GET Request
```
GET /forms/driver/transport
```

**Response Model (SavedTransportModelDto):**
```kotlin
data class SavedTransportModelDto(
    val id: String?,
    var chatId: Long,
    var loc1: String,
    var fromLocation: LocationModelDto? = LocationModelDto(),
    var maxWeight: Double? = null,
    var vehicleType: String? = null,           // ⚠️ String
    var additionalPhone: String? = "",         // ⚠️ additionalPhone
    var otherDesc: String? = "",               // ℹ️ Read-only
    var time: Long? = 0,
    var source: String? = "bot",
    var status: String = "active"
)
```

### PUT Request
```
PUT /update/transportForm/{id}
```

**Request Model (CreateTransportRequestModel):**
```kotlin
data class CreateTransportRequestModel(
    var additionalContact: String? = null,     // ⚠️ additionalContact
    var fromLocation: LocationModel?=null,
    var maxWeight: Double? = null,
    var vehicleTypeId: Int? = null,            // ⚠️ Int (ID)
) {
    data class LocationModel(
        var cityId: Int? = null,
        var regionId: Int? = null,
        var countryId: Int? = null
    )
}
```

## Field Mapping

### Response → Form Display
| Backend Field | Frontend State | Type | Notes |
|--------------|----------------|------|-------|
| `fromLocation.countryId` | `fromCountry` | String | Convert to string for select |
| `fromLocation.regionId` | `fromRegion` | String | Convert to string for select |
| `fromLocation.cityId` | `fromCity` | String | Convert to string for select |
| `maxWeight` | `maxWeight` | String | Convert to string for input |
| `vehicleType` | `vehicleTypeId` | String | **Match name → get ID** |
| `additionalPhone` | `additionalPhone` | String | Direct mapping |
| `otherDesc` | - | - | **Not editable** |

### Form Submit → Request
| Frontend State | Backend Field | Type | Conversion |
|---------------|---------------|------|------------|
| `additionalPhone` | `additionalContact` | String | **Rename field** |
| `fromCountry` | `fromLocation.countryId` | Int | `parseInt()` |
| `fromRegion` | `fromLocation.regionId` | Int | `parseInt()` |
| `fromCity` | `fromLocation.cityId` | Int | `parseInt()` |
| `maxWeight` | `maxWeight` | Double | `parseFloat()` |
| `vehicleTypeId` | `vehicleTypeId` | Int | `parseInt()` |

## Critical Conversions

### 1. Vehicle Type: String → ID
**GET Response:**
```json
{
  "vehicleType": "Tent"
}
```

**Frontend Logic:**
```javascript
// Find vehicle ID by matching name
const matchedVehicle = staticData.vehicleTypes.find(
  v => v.name === form.vehicleType  // "Tent"
);
setVehicleTypeId(matchedVehicle.id);  // 3
```

**PUT Request:**
```json
{
  "vehicleTypeId": 3
}
```

### 2. Phone Field Rename
**GET Response:**
```json
{
  "additionalPhone": "+998901234567"
}
```

**PUT Request:**
```json
{
  "additionalContact": "+998901234567"
}
```

### 3. Location IDs
**GET Response:**
```json
{
  "fromLocation": {
    "countryId": 1,
    "regionId": 12,
    "cityId": 245
  }
}
```

**Frontend Processing:**
```javascript
setFromCountry("1");    // String for select
setFromRegion("12");    // String for select  
setFromCity("245");     // String for select
```

**PUT Request:**
```json
{
  "fromLocation": {
    "countryId": 1,      // parseInt("1")
    "regionId": 12,      // parseInt("12")
    "cityId": 245        // parseInt("245")
  }
}
```

## Component Flow

```
1. User clicks "Ma'lumotlarni tahrirlash"
   ↓
2. Modal opens (isOpen = true)
   ↓
3. useEffect triggers loadTransportData()
   ↓
4. GET /forms/driver/transport
   ↓
5. Response received (SavedTransportModelDto)
   ↓
6. Convert fields:
   - vehicleType (String) → vehicleTypeId (find ID)
   - location IDs (Int) → strings for selects
   - additionalPhone → additionalPhone (same name)
   ↓
7. Form displays with populated data
   ↓
8. User edits fields
   ↓
9. User clicks "Saqlash"
   ↓
10. handleSubmit converts:
    - additionalPhone → additionalContact
    - vehicleTypeId (String) → vehicleTypeId (Int)
    - location IDs (String) → (Int)
    ↓
11. PUT /update/transportForm/{id} (CreateTransportRequestModel)
    ↓
12. Success → onSuccess() → Modal closes
```

## Example Request/Response

### GET Response Example
```json
{
  "code": 200,
  "result": {
    "id": "abc123",
    "chatId": 987654321,
    "loc1": "Tashkent, Toshkent, O'zbekiston",
    "fromLocation": {
      "countryId": 1,
      "regionId": 12,
      "cityId": 245
    },
    "maxWeight": 5000.0,
    "vehicleType": "Tent",
    "additionalPhone": "+998901234567",
    "otherDesc": "Some description",
    "time": 1640000000000,
    "source": "bot",
    "status": "active"
  }
}
```

### PUT Request Example
```json
{
  "additionalContact": "+998901234567",
  "fromLocation": {
    "cityId": 245,
    "regionId": 12,
    "countryId": 1
  },
  "maxWeight": 5000.0,
  "vehicleTypeId": 3
}
```

## Key Points

✅ **Always fresh data**: Modal calls GET on every open
✅ **Field rename**: `additionalPhone` → `additionalContact`
✅ **Type conversion**: `vehicleType` (String) → `vehicleTypeId` (Int)
✅ **ID lookup**: Match vehicle name to get ID from staticData
✅ **Number parsing**: All IDs and weights converted to numbers
✅ **Null handling**: Empty strings → null in request
✅ **otherDesc**: Read-only, not sent in PUT request

## Testing Checklist

- [ ] Modal opens on button click
- [ ] GET request fires immediately
- [ ] Form fields populate correctly
- [ ] Vehicle type dropdown shows correct selection
- [ ] Location dropdowns cascade properly
- [ ] Edit fields and click "Saqlash"
- [ ] PUT request has correct field names
- [ ] All IDs are integers, not strings
- [ ] additionalContact (not additionalPhone) in request
- [ ] vehicleTypeId is integer (not string name)
- [ ] Success closes modal and refreshes data
