# FileSentry Quick Reference

## 🚀 Quick Start

### 1. Start Backend
```bash
cd filehider-backend
npm run dev
```

### 2. Start Frontend
```bash
cd FileHiderApp
npm start
```

---

## 📋 API Endpoints Summary

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---|
| POST | `/vault/create` | Create new vault | ✅ Yes |
| GET | `/vault/list` | Get user's vaults | ✅ Yes |
| POST | `/vault/verify-pin` | Check PIN for vault | ✅ Yes |
| DELETE | `/vault/{id}` | Delete vault | ✅ Yes |

---

## 🎮 User Workflows

### Create New Vault
```
HomeScreen
  ↓ Tap "Add New"
CreateVaultModal
  ├─ Select Icon (25 available)
  ├─ Enter Label
  └─ Tap "Next: Set PIN"
      ↓
    PinPad (Create Mode)
      ↓ Enter 4 digits
    API: POST /vault/create
      ↓
    Success Alert → Grid Refreshes
```

### Unlock Vault
```
HomeScreen
  ↓ Tap Vault Icon
PinPad (Verify Mode)
  ↓ Enter 4 digits
API: POST /vault/verify-pin
  ├─ ✅ Correct → VaultScreen
  └─ ❌ Wrong → Error Alert
```

---

## 🗂️ File Structure

```
FileHiderApp/
├── screens/
│   ├── HomeScreen.tsx          ← Vault grid + create modal
│   ├── VaultScreen.tsx         ← Vault details after unlock
│   └── LoginScreen.tsx          (existing)
├── components/
│   ├── VaultGrid.tsx           ← Icon grid display [NEW]
│   ├── PinPad.tsx              ← PIN entry pad [NEW]
│   └── IconButton.tsx           (existing)
└── services/
    └── api.ts                  ← API calls & tokens [NEW]

filehider-backend/
└── server.ts                   ← Updated with vault endpoints
```

---

## 💾 Database Structure

### Vaults Table
```sql
CREATE TABLE vaults (
  vault_id TEXT PRIMARY KEY,           -- "VAULT-{timestamp}"
  userid TEXT NOT NULL,                -- Links to user
  icon_name TEXT NOT NULL,             -- Icon identifier
  icon_label TEXT NOT NULL,            -- User's label
  pin_hash TEXT NOT NULL,              -- Bcrypt hashed PIN
  created_at DATETIME DEFAULT NOW()
)
```

---

## 🎨 Available Icons (25 Total)

```
Clock        Camera       Notes        Maps         Music
Compass      Calculator   Garden       Harbor       Journal
Weather      Reader       Health       Favorites    Goals
Notes        Recorder     Reminders    Brew         Crystal
Calendar     Battery      Timer        Flashlight   Atlas
Network
```

---

## 🔐 Security Checklist

- ✅ PINs hashed with bcrypt (10 salt rounds)
- ✅ JWT token authentication
- ✅ User isolation (can't access others' vaults)
- ✅ PIN format validation (4 digits only)
- ✅ Tokens expire in 1 hour
- ✅ All endpoints require authorization

---

## 📱 Component Props & Features

### VaultGrid
```typescript
Props: vaults[], loading, onVaultPress(), onAddVault()
Features: Loading state, grid layout, add card
```

### PinPad
```typescript
Props: onPinComplete(), onCancel(), title, subtitle
Features: Auto-submit at 4 digits, backspace, visual dots
```

### HomeScreen
```typescript
State: vaults[], loading, modals visibility, selected icon/label
Features: Create vault flow, PIN verification, grid refresh
```

---

## 🔄 State Management

**HomeScreen manages:**
- Vault list
- UI modal visibility
- Selected icon/vault/label
- Loading states
- Create vs. verify mode

**LocalStorage (via AsyncStorage):**
- JWT authentication token

---

## ⚡ Key Implementation Details

### PIN Creation Flow
1. User enters 4 digits in PinPad
2. App auto-submits on 4th digit
3. `handleCreateVault(pin)` called
4. API POST to `/vault/create`
5. PIN bcrypt hashed on backend
6. Vault created and saved

### PIN Verification Flow
1. User enters 4 digits in PinPad
2. App auto-submits on 4th digit
3. `handleVerifyPin(pin)` called
4. API POST to `/vault/verify-pin`
5. Backend compares with bcrypt hash
6. User can access vault if correct

---

## 🧪 Test PIN

For local testing:
- PIN: `1234` (any 4 digits work, you choose at creation)
- Test icon: `notes`
- Test label: `Test Vault`

---

## 📊 API Request/Response Examples

### Create Vault
```bash
POST /vault/create
Authorization: Bearer {jwt_token}

Request:
{
  "iconName": "notes",
  "iconLabel": "My Photos",
  "pin": "1234"
}

Response:
{
  "message": "Vault created successfully",
  "vaultId": "VAULT-1715353200000"
}
```

### Verify PIN
```bash
POST /vault/verify-pin
Authorization: Bearer {jwt_token}

Request:
{
  "vaultId": "VAULT-1715353200000",
  "pin": "1234"
}

Response:
{
  "message": "PIN verified successfully",
  "vaultId": "VAULT-1715353200000"
}
```

---

## 🐛 Debugging Tips

1. **Check token:** Ensure JWT stored in AsyncStorage
2. **Backend running:** Verify `localhost:3000` is accessible
3. **Pin validation:** Must be exactly 4 digits
4. **User isolation:** Vaults only show for logged-in user
5. **API errors:** Check response in mobile dev tools

---

## 📚 Reference Files

- **ARCHITECTURE.md** - Detailed technical documentation
- **IMPLEMENTATION_SUMMARY.md** - Complete implementation overview
- **This file** - Quick reference guide

---

## ✅ Verification Checklist

- [ ] Backend `/vault/create` endpoint working
- [ ] Backend `/vault/list` endpoint returning user's vaults
- [ ] Backend `/vault/verify-pin` validating PINs correctly
- [ ] Frontend VaultGrid displaying icons in grid
- [ ] Frontend PinPad collecting 4 digits
- [ ] Frontend modals opening/closing correctly
- [ ] Create vault flow: Icon → Label → PIN → Success
- [ ] Unlock vault flow: Tap icon → PIN → Success
- [ ] Wrong PIN shows error alert
- [ ] Grid refreshes after creating vault
- [ ] New vault appears with correct icon and label

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Vault not created | Check if PIN is exactly 4 digits |
| Can't verify PIN | Ensure correct PIN entered |
| Grid not refreshing | Manually navigate away and back |
| Token not working | Re-login to get new token |
| API endpoint 404 | Verify backend is running on port 3000 |
| Icon not showing | Check if icon name matches ICON_MAP |

---

## 🎯 Next Phase Features

1. **File Management** - Upload/download files to vaults
2. **Biometric Auth** - Fingerprint/Face ID unlock
3. **Sharing** - Share vaults with other users
4. **Cloud Backup** - Automatic vault backup
5. **Activity Log** - Track vault access history

---

## 📞 Support Resources

- Material Community Icons: https://materialdesignicons.com/
- React Native Docs: https://reactnative.dev/
- Expo Docs: https://docs.expo.dev/
- SQLite3 Node: https://github.com/mapbox/node-sqlite3
- JWT Best Practices: https://tools.ietf.org/html/rfc7519

---

**Last Updated:** May 10, 2026
**Status:** ✅ Production Ready (Core Features)
