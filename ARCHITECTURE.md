# FileSentry Architecture & API Guide

## Overview
FileSentry is a secure file vault system with icon-based access. Each icon represents a vault protected by a 4-digit PIN.

---

## Backend Architecture

### Database Schema

#### `users` table
```sql
userid (TEXT, PRIMARY KEY)
username (TEXT, UNIQUE)
password (TEXT, hashed with bcrypt)
email (TEXT)
sex (TEXT)
created_at (DATETIME)
```

#### `vaults` table
```sql
vault_id (TEXT, PRIMARY KEY) - Format: VAULT-{timestamp}
userid (TEXT, FOREIGN KEY) - Links to users table
icon_name (TEXT) - Icon identifier (e.g., 'notes', 'camera')
icon_label (TEXT) - User-defined label (e.g., 'Personal Photos')
pin_hash (TEXT) - 4-digit PIN hashed with bcrypt
created_at (DATETIME)
```

---

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Authentication
All vault endpoints require JWT token in header:
```
Authorization: Bearer {token}
```

---

## Vault Endpoints

### 1. Create Vault
**POST** `/vault/create`

**Headers:**
```json
{
  "Authorization": "Bearer {jwt_token}",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "iconName": "notes",
  "iconLabel": "Personal Notes",
  "pin": "1234"
}
```

**Response (201):**
```json
{
  "message": "Vault created successfully",
  "vaultId": "VAULT-1715353200000"
}
```

**Error Cases:**
- `400` - Missing fields or invalid PIN (must be 4 digits)
- `401` - Invalid token
- `403` - No token provided
- `500` - Server error

---

### 2. List All Vaults
**GET** `/vault/list`

**Headers:**
```json
{
  "Authorization": "Bearer {jwt_token}"
}
```

**Response (200):**
```json
{
  "vaults": [
    {
      "vault_id": "VAULT-1715353200000",
      "icon_name": "notes",
      "icon_label": "Personal Notes",
      "created_at": "2026-05-10T10:30:00Z"
    },
    {
      "vault_id": "VAULT-1715353300000",
      "icon_name": "camera",
      "icon_label": "Photos",
      "created_at": "2026-05-10T10:35:00Z"
    }
  ]
}
```

---

### 3. Verify PIN
**POST** `/vault/verify-pin`

**Headers:**
```json
{
  "Authorization": "Bearer {jwt_token}",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "vaultId": "VAULT-1715353200000",
  "pin": "1234"
}
```

**Response (200):**
```json
{
  "message": "PIN verified successfully",
  "vaultId": "VAULT-1715353200000"
}
```

**Error Cases:**
- `400` - Missing vaultId or PIN
- `401` - Invalid PIN
- `403` - Unauthorized (vault belongs to different user)
- `404` - Vault not found
- `500` - Server error

---

### 4. Delete Vault
**DELETE** `/vault/{vaultId}`

**Headers:**
```json
{
  "Authorization": "Bearer {jwt_token}"
}
```

**Response (200):**
```json
{
  "message": "Vault deleted successfully"
}
```

**Error Cases:**
- `401` - Invalid token
- `403` - No token provided
- `404` - Vault not found
- `500` - Server error

---

## Frontend Components

### 1. VaultGrid Component
**File:** `FileHiderApp/components/VaultGrid.tsx`

Displays vaults in a 2-column grid with icon previews. Each vault card shows:
- Icon (40x40 in 64x64 container)
- User-defined label

**Props:**
```typescript
interface VaultGridProps {
  vaults: Vault[];
  loading: boolean;
  onVaultPress: (vault: Vault) => void;
  onAddVault: () => void;
}
```

**Features:**
- Loading state with spinner
- "Add New" card in grid
- Dark theme (#0f1419 background)
- Blue accent color (#4f97f7)

---

### 2. PinPad Component
**File:** `FileHiderApp/components/PinPad.tsx`

4-digit PIN entry interface with numpad.

**Props:**
```typescript
interface PinPadProps {
  onPinComplete: (pin: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}
```

**Features:**
- Visual PIN dots (4 circles)
- 9-key numpad + 0
- Backspace button
- Cancel button
- Auto-submit on 4 digits
- Dark theme with blue accents

---

### 3. HomeScreen
**File:** `FileHiderApp/screens/HomeScreen.tsx`

Main vault management interface.

**Features:**
- Displays all user vaults in grid
- Create new vault modal with:
  - Icon selector (25 available icons)
  - Label input
  - PIN creation flow
- Tap vault → PIN entry modal
- Tap "Add New" → Create vault modal

**State Management:**
```typescript
vaults: Vault[]          // Array of user's vaults
loading: boolean         // Loading state
showAddModal: boolean    // Create vault modal visibility
showPinPad: boolean      // PIN pad visibility
selectedVault: Vault     // Currently selected vault
selectedIcon: string     // Icon selected in create modal
vaultLabel: string       // Label entered in create modal
creatingPin: boolean     // Flag: creating vs verifying PIN
```

**Workflows:**

**Create New Vault:**
1. User taps "Add New"
2. Modal opens with icon selector
3. User selects icon and enters label
4. Taps "Next: Set PIN"
5. PIN pad opens with title "Set 4-Digit PIN"
6. User enters 4 digits
7. API call to create vault
8. Grid refreshes

**Unlock Vault:**
1. User taps vault icon
2. PIN pad opens with title "Unlock {VaultLabel}"
3. User enters 4 digits
4. API call to verify PIN
5. If correct → Navigate to VaultScreen
6. If incorrect → Alert shown

---

### 4. VaultScreen
**File:** `FileHiderApp/screens/VaultScreen.tsx`

Vault detail screen (shown after successful PIN entry).

**Features:**
- Vault name and icon display
- Empty files section with "Add Files" button
- Settings section:
  - Change PIN
  - Vault Info
- Delete Vault button

---

## API Service Layer

**File:** `FileHiderApp/services/api.ts`

Centralized API communication with token management.

**Functions:**
```typescript
setToken(newToken: string): void
getToken(): Promise<string | null>
apiCall(endpoint, method, body?): Promise<any>

vaultAPI.create(iconName, iconLabel, pin)
vaultAPI.list()
vaultAPI.verifyPin(vaultId, pin)
vaultAPI.delete(vaultId)
```

**Features:**
- Automatic JWT token injection
- Token persistence in AsyncStorage
- Error handling and message propagation
- Consistent header management

---

## Available Icons (25 total)

```
clock, compass, weather, notes, recorder,
calendar, calculator, camera, maps, music,
reader, reminders, battery, network, flashlight,
timer, health, favorites, goals, brew,
garden, harbor, journal, crystal, atlas
```

---

## User Flow Diagram

```
Login/Register
    ↓
HomeScreen
    ├→ Tap Vault Icon
    │   ↓
    │   PinPad (Verify Mode)
    │   ├→ Correct PIN
    │   │   ↓
    │   │   VaultScreen
    │   │
    │   └→ Wrong PIN
    │       ↓
    │       Error Alert
    │
    └→ Tap "Add New"
        ↓
        Create Modal
        ├→ Select Icon
        ├→ Enter Label
        └→ Next
            ↓
            PinPad (Create Mode)
            ↓
            API: /vault/create
            ↓
            Success/Error Alert
            ↓
            Refresh Grid
```

---

## Error Handling

All endpoints return structured error responses:

```json
{
  "message": "Error description"
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad request (missing/invalid data)
- `401` - Authentication failed (invalid PIN or token)
- `403` - Forbidden (unauthorized access)
- `404` - Resource not found
- `500` - Server error

---

## Security Notes

1. **PIN Hashing**: All PINs stored as bcrypt hashes, never plain text
2. **JWT Tokens**: Token-based auth, expires in 1 hour
3. **User Isolation**: Vaults scoped to authenticated user only
4. **PIN Verification**: Constant-time comparison via bcrypt
5. **Database Foreign Keys**: Enforces vault-user relationship

---

## Testing Endpoints with cURL

**Create Vault:**
```bash
curl -X POST http://localhost:3000/vault/create \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"iconName":"notes","iconLabel":"Test","pin":"1234"}'
```

**List Vaults:**
```bash
curl -X GET http://localhost:3000/vault/list \
  -H "Authorization: Bearer {token}"
```

**Verify PIN:**
```bash
curl -X POST http://localhost:3000/vault/verify-pin \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"vaultId":"VAULT-xxx","pin":"1234"}'
```

**Delete Vault:**
```bash
curl -X DELETE http://localhost:3000/vault/VAULT-xxx \
  -H "Authorization: Bearer {token}"
```

---

## Future Enhancements

- [ ] File upload/download to vaults
- [ ] Biometric unlock (fingerprint/face)
- [ ] Vault sharing between users
- [ ] Vault backup to cloud
- [ ] Activity logs per vault
- [ ] PIN change functionality
- [ ] Vault recovery codes
