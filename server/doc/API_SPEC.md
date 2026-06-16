# Bodycam Frontend System - API Specification

**Base URL:** `/api_internal`  
**Version:** 1.0  
**Last Updated:** 2026-06-16

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User Management](#2-user-management)
3. [Data & Reports](#3-data--reports)
4. [Mission Management](#4-mission-management)
5. [Streaming & Playback](#5-streaming--playback)
6. [Video Conversion & Download](#6-video-conversion--download)

---

## Authentication

All protected endpoints require `Authorization: Bearer <access_token>` header.

### 1.1 Register

**POST** `/register`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | ✅ | 3-50 characters |
| password | string | ✅ | 6-128 characters |
| roleId | number | ❌ | Role ID to assign |

**Response (201):**
```json
{
  "message": "Registration successful",
  "user": {
    "userId": 1,
    "username": "john_doe",
    "roleId": 2,
    "roleName": "Manager",
    "securityLevel": "medium"
  }
}
```

**Errors:**
- `400` - Username/password validation failed
- `409` - Username already exists

---

### 1.2 Login

**POST** `/login`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | ✅ | Username |
| password | string | ✅ | Password |
| deviceId | string | ❌ | Device identifier (default: "web") |
| platform | string | ❌ | "web" or "mobile" (default: "web") |
| firebaseToken | string | ❌ | FCM token — registers the device for push when `platform=mobile` |

**Response (200):**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "abc123...",  // Only for mobile platform
  "user": {
    "userId": 1,
    "username": "john_doe",
    "roleId": 2,
    "roleName": "Manager",
    "securityLevel": "medium"
  }
}
```

**Notes:**
- Web: Refresh token is set as httpOnly cookie
- Mobile: Refresh token is returned in response body

**Errors:**
- `400` - Missing username/password
- `401` - Invalid credentials
- `403` - Account is disabled

---

### 1.3 Refresh Token

**POST** `/refresh`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refreshToken | string | ❌ | Required for mobile (from body) |
| platform | string | ❌ | "web" or "mobile" |

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "newtoken...",  // Only for mobile
  "user": {
    "userId": 1,
    "username": "john_doe",
    "roleId": 2,
    "roleName": "Manager",
    "securityLevel": "medium"
  }
}
```

**Errors:**
- `401` - Refresh token not found / Invalid or expired

---

### 1.4 Logout

**POST** `/logout`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refreshToken | string | ❌ | Required for mobile |
| platform | string | ❌ | "web" or "mobile" |
| deviceId | string | ❌ | Scopes the FCM token unregister (mobile) |
| firebaseToken | string | ❌ | Unregisters this FCM token on logout (mobile) |

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

---

### 1.5 Get Current User

**GET** `/me` 🔒

**Response (200):**
```json
{
  "userId": 1,
  "username": "john_doe",
  "roleId": 2,
  "roleName": "Manager",
  "securityLevel": "medium"
}
```

**Errors:**
- `401` - Access token required / Invalid token
- `404` - User not found

---

### 1.6 Change Password

**PUT** `/me/password` 🔒

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| currentPassword | string | ✅ | Current password (6-128 chars) |
| newPassword | string | ✅ | New password (6-128 chars) |

**Response (200):**
```json
{
  "message": "Change password success",
  "data": {
    "userId": 1,
    "username": "john_doe"
  }
}
```

**Errors:**
- `400` - Current password is incorrect / New password validation failed
- `401` - Authentication required
- `404` - User not found

---

### 1.7 Update Device Token (FCM)

**POST** `/device-token` 🔒

ลงทะเบียน/อัปเดต FCM registration token ของเครื่องสำหรับ push notification **โดยไม่ต้อง login ใหม่** — ใช้รองรับกรณี FCM rotate token ระหว่างที่ผู้ใช้ login ค้างไว้

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| deviceId | string | ✅ | Device identifier (1-100 chars) — key ของเครื่อง ต้องตรงกับที่ส่งตอน login |
| firebaseToken | string | ✅ | FCM registration token (1-450 chars) |
| platform | string | ❌ | default `"mobile"` |

**Response (200):**
```json
{
  "message": "Device token updated"
}
```

**Behavior:**
- `userId` มาจาก access token (ไม่อ่านจาก body)
- upsert ด้วย key `(userId, deviceId)` → token ใหม่ทับแถวเดิม + ตั้ง `IsActive=true` + อัปเดต `LastSeenAt` (ไม่สร้างแถวค้าง)

**Errors:**
- `400` - Missing deviceId / firebaseToken
- `401` - Authentication required (no/invalid access token)
- `500` - Update failed

#### Client integration — ต้องเรียกเมื่อไหร่ (สำคัญสำหรับ login ค้างนาน)

FCM token เป็น **event-driven** (ไม่ refresh ตาม timer และไม่ refresh เพราะ login ค้าง) แต่หมุนได้เมื่อ reinstall / ล้าง app data / Google Play Services อัปเดต / ไม่ได้ใช้งานนาน (~270 วัน) ฯลฯ

ถ้า token หมุนแล้วแอป **ไม่ส่งของใหม่มา** → server ส่ง push ไป token เก่า, FCM ตอบ `registration-token-not-registered`, server ตั้ง `IsActive=false` → **ผู้ใช้เงียบ ไม่ได้รับ noti**

ดังนั้นแอป **ต้อง register token ใน 2 จังหวะ**:

1. **ทุกครั้งที่เปิดแอป / เข้า foreground (และทันทีหลัง login)** — เรียก `getToken()` แล้ว `POST /device-token`
   - กันเคสที่ token หมุน "ตอนแอปถูก kill" ซึ่ง `onTokenRefresh` ไม่ทำงาน จึงต้อง sync ทุก startup
2. **`onTokenRefresh` / `onNewToken`** — เมื่อ token หมุนระหว่างใช้งาน ส่ง update ทันที

ถ้า access token หมดอายุ → เรียก `/refresh` ก่อนแล้ว retry `/device-token` หนึ่งครั้ง

**ตัวอย่าง (pseudocode):**
```js
async function syncFcmToken() {
  const token = await messaging().getToken();
  if (!token) return;
  try {
    await api.post('/device-token', {
      deviceId: DEVICE_ID,          // ค่าคงที่ต่อ install ต้องตรงกับตอน login
      firebaseToken: token,
      platform: 'mobile',
    });
  } catch (e) {
    if (e.status === 401) { await refreshAccessToken(); return syncFcmToken(); }
    throw e;
  }
}

// 1) ทุก app start / resume และหลัง login
onAppStart(syncFcmToken);
onAppResume(syncFcmToken);
afterLogin(syncFcmToken);

// 2) ตอน FCM หมุน token
messaging().onTokenRefresh(syncFcmToken);   // Android service: onNewToken
```

> **`deviceId`** ต้องเป็นค่าคงที่ต่อ installation (เช่น UUID เก็บใน secure storage หรือ Android `ANDROID_ID`) และเป็นค่าเดียวกับที่ส่งตอน `/login` เพื่อให้ upsert ตรงแถวเดิม ไม่เกิดแถวซ้ำ

---

## 2. User Management

> **Authorization:** RoleId ≤ 2 (Admin/Manager) for read, RoleId = 1 (Admin) for write operations

### 2.1 List Users

**GET** `/users` 🔒

**Response (200):**
```json
[
  {
    "userId": 1,
    "username": "admin",
    "roleId": 1,
    "roleName": "Admin",
    "Active": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

---

### 2.2 Get User by ID

**GET** `/users/:userId` 🔒

**Response (200):**
```json
{
  "userId": 1,
  "username": "admin",
  "roleId": 1,
  "roleName": "Admin",
  "Active": true,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

**Errors:**
- `400` - Invalid userId
- `404` - User not found

---

### 2.3 Get User Details

**GET** `/users/:userId/details` 🔒

**Response (200):**
```json
{
  "userId": 1,
  "username": "admin",
  "roleId": 1,
  "roleName": "Admin",
  "Active": true,
  "status": "active",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "lastLoginAt": "2026-05-22T10:00:00.000Z",
  "lastLoginPlatform": "web"
}
```

---

### 2.4 Create User

**POST** `/users` 🔒 (Admin only)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | ✅ | 3-50 characters |
| password | string | ✅ | 6-128 characters |
| roleId | number | ❌ | Role ID |
| Active | boolean | ❌ | Account status (default: true) |
| status | string | ❌ | "active" or "inactive" |

**Response (201):**
```json
{
  "message": "Create user success",
  "data": {
    "userId": 2,
    "username": "new_user",
    "roleId": 3,
    "roleName": "User",
    "Active": true,
    "createdAt": "2026-05-22T10:00:00.000Z",
    "updatedAt": "2026-05-22T10:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Validation failed
- `409` - Username already exists

---

### 2.5 Update User

**PUT** `/users/:userId` 🔒 (Admin only)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | ❌ | New username |
| roleId | number | ❌ | New role ID |
| Active | boolean | ❌ | Account status |
| password | string | ❌ | New password (Admin only) |

**Response (200):**
```json
{
  "message": "Update user success",
  "data": {
    "userId": 2,
    "username": "updated_user",
    "roleId": 3,
    "roleName": "User",
    "Active": "active",
    "createdAt": "2026-05-22T10:00:00.000Z",
    "updatedAt": "2026-05-22T11:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid userId
- `403` - Only administrators can change passwords
- `404` - User not found
- `409` - Username already exists

---

### 2.6 Reset User Password

**PUT** `/users/:userId/password` 🔒 (Admin only)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| password | string | ✅ | New password (min 6 chars) |

**Response (200):**
```json
{
  "message": "Reset password success",
  "data": {
    "userId": 2,
    "username": "user"
  }
}
```

**Errors:**
- `400` - Invalid userId / Password validation failed
- `404` - User not found

---

### 2.7 Delete User

**DELETE** `/users/:userId` 🔒 (Admin only)

**Response (200):**
```json
{
  "message": "Delete user success"
}
```

**Errors:**
- `400` - Invalid userId
- `404` - User not found
- `409` - Cannot delete user due to related records

---

### 2.8 List Roles

**GET** `/roles` 🔒

**Response (200):**
```json
[
  { "roleId": 1, "roleName": "Admin" },
  { "roleId": 2, "roleName": "Manager" },
  { "roleId": 3, "roleName": "User" },
  { "roleId": 4, "roleName": "Viewer" }
]
```

---

## 3. Data & Reports

### 3.1 Get Reports (Missions)

**GET** `/getReport` 🔒

**Response (200):**
```json
[
  {
    "reportId": "RPT-001",
    "missionId": 1,
    "missionName": "Patrol Area A",
    "startTime": "2026-05-22T08:00:00.000Z",
    "endTime": "2026-05-22T12:00:00.000Z",
    "latitude": 13.7563,
    "longitude": 100.5018,
    "missionStatus": "2",
    "description": "Routine patrol",
    "officerId": 1,
    "officerName": "Officer John",
    "locationId": 1,
    "locationCode": "LOC-001",
    "deviceCode": "1000067",
    "priority": "high",
    "duration": 240,
    "note": "No incidents",
    "locationName": "Bangkok Central",
    "deviceName": "Bodycam-001",
    "deviceType": "bodycam",
    "serialNo": "BC001",
    "active": true
  }
]
```

---

### 3.2 Get Locations

**GET** `/getlocation` 🔒

**Response (200):**
```json
[
  {
    "locationId": 1,
    "locationCode": "LOC-001",
    "latitude": 13.7563,
    "longitude": 100.5018,
    "locationName": "Bangkok Central",
    "recordedAt": "2026-05-22T10:00:00.000Z",
    "devices": [
      {
        "deviceCode": "1000067",
        "deviceName": "Bodycam-001",
        "deviceType": "bodycam",
        "active": true,
        "serialNo": "BC001"
      },
      {
        "deviceCode": "1000068",
        "deviceName": "Bodycam-002",
        "deviceType": "bodycam",
        "active": false,
        "serialNo": "BC002"
      }
    ]
  }
]
```

---

### 3.3 Get Online Devices

**GET** `/getonlinedevices` 🔒

**Response (200):**
```json
[
  {
    "deviceCode": "1000067",
    "deviceName": "Bodycam-001",
    "status": "online",
    "locationId": 1,
    "locationCode": "LOC-001",
    "latitude": 13.7563,
    "longitude": 100.5018,
    "locationName": "Bangkok Central",
    "recordedAt": "2026-05-22T10:00:00.000Z"
  }
]
```

---

### 3.4 Get All Devices

**GET** `/getalldevices` 🔒

**Response (200):**
```json
[
  {
    "DeviceCode": "1000067",
    "DeviceName": "Bodycam-001",
    "DeviceType": "bodycam",
    "SerialNo": "BC001",
    "Active": true,
    "Status": "online",
    "Locations": [
      {
        "LocationId": 1,
        "LocationCode": "LOC-001",
        "LocationName": "Bangkok Central",
        "Latitude": 13.7563,
        "Longitude": 100.5018,
        "RecordedAt": "2026-05-22T10:00:00.000Z"
      }
    ]
  }
]
```

---

### 3.5 Get Officer Data

**GET** `/getofficerData` 🔒

**Response (200):**
```json
[
  {
    "officerId": 1,
    "officerName": "Officer John",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

---

### 3.6 Get Event Logs

**GET** `/geteventlogs` 🔒

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| startDate | string | ❌ | Filter start (YYYY-MM-DD or ISO) |
| endDate | string | ❌ | Filter end (YYYY-MM-DD or ISO) |
| limit | number | ❌ | Max results (default: 50) |

**Response (200):**
```json
[
  {
    "id": 1,
    "typeKey": "DEVICE_ONLINE",
    "officer": "Officer John",
    "time": "10:00",
    "date": "2026-05-22",
    "severity": "info",
    "location": "Bangkok Central",
    "details": "อุปกรณ์ Bodycam-001 (1000067) เชื่อมต่อ",
    "isRead": false,
    "deviceName": "Bodycam-001",
    "deviceCode": "1000067",
    "mission": {
      "missionId": 1,
      "reportId": "RPT-001",
      "missionName": "Patrol Area A",
      "missionStatus": "2",
      "deviceCode": "1000067",
      "locationCode": "LOC-001",
      "locationName": "Bangkok Central",
      "latitude": 13.7563,
      "longitude": 100.5018,
      "startTime": "2026-05-22T08:00:00.000Z",
      "endTime": "2026-05-22T12:00:00.000Z"
    }
  }
]
```

---

### 3.7 Mark Event Log as Read

**PATCH** `/eventlogs/:id/read` 🔒

**Response (200):**
```json
{
  "message": "Mark event log read success",
  "data": {
    "id": 1,
    "isRead": true
  }
}
```

**Errors:**
- `400` - Event log id is required

---

## 4. Mission Management

### Mission Status Codes

| Code | Status |
|------|--------|
| 1 | PENDING |
| 2 | IN_PROGRESS |
| 3 | COMPLETED |
| 4 | CANCELLED |
| 5 | EMERGENCY |
| 6 | EMERGENCY_IN_PROGRESS |
| 7 | EMERGENCY_COMPLETED |
| 8 | EMERGENCY_CANCELLED |

---

### 4.1 Create Mission

**POST** `/createmission` 🔒

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reportId | string | ❌ | Report ID |
| missionName | string | ❌ | Mission name |
| startTime | string | ❌ | ISO datetime |
| endTime | string | ❌ | ISO datetime |
| description | string | ❌ | Description |
| officerId | number | ❌ | Officer ID |
| locationCode | string | ❌ | Location code |
| deviceCode | string | ❌ | Device code |
| missionStatus | string | ❌ | Status (default: "PENDING") |
| duration | number | ❌ | Duration in minutes |
| latitude | number | ❌ | Latitude |
| longitude | number | ❌ | Longitude |
| note | string | ❌ | Note |
| priority | string | ❌ | Priority level |

**Response (201):**
```json
{
  "message": "Create mission success",
  "data": { ... }
}
```

---

### 4.2 Update Mission

**PUT** `/updatemission` 🔒

> **Note:** Only PENDING (1) or EMERGENCY (5) missions can be edited

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reportId | string | ✅ | Report ID to update |
| missionName | string | ❌ | New mission name |
| startTime | string | ❌ | New start time |
| endTime | string | ❌ | New end time |
| description | string | ❌ | New description |
| officerId | number | ❌ | New officer ID |
| locationCode | string | ❌ | New location code |
| deviceCode | string | ❌ | New device code |
| priority | string | ❌ | New priority |
| duration | number | ❌ | New duration |
| latitude | number | ❌ | New latitude |
| longitude | number | ❌ | New longitude |
| note | string | ❌ | New note |

**Response (200):**
```json
{
  "message": "Update mission success",
  "data": { ... }
}
```

**Errors:**
- `400` - reportId is required / Only pending or emergency missions can be edited
- `404` - Mission not found

---

### 4.3 Delete Mission

**DELETE** `/deletemission` 🔒

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reportId | string | ✅ | Report ID |
| deviceName | string | ✅ | Device name |

**Response (200):**
```json
{
  "message": "Delete mission success",
  "data": { ... }
}
```

**Errors:**
- `400` - reportId/deviceName is required / Device is currently active
- `404` - Device not found

---

### 4.4 Delete Cancelled Mission

**DELETE** `/deletecancelledmission` 🔒

> **Note:** Only CANCELLED (4) or EMERGENCY_CANCELLED (8) missions can be deleted

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reportId | string | ✅ | Report ID |

**Response (200):**
```json
{
  "message": "Delete cancelled mission success",
  "data": { ... }
}
```

**Errors:**
- `400` - reportId is required / Only cancelled missions can be deleted
- `404` - Mission not found

---

### 4.5 Confirm Mission

**PATCH** `/confirmmission` 🔒

> Changes status: PENDING (1) → IN_PROGRESS (2), EMERGENCY (5) → EMERGENCY_IN_PROGRESS (6)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reportId | string | ✅ | Report ID |
| deviceName | string | ✅ | Device name |

**Response (200):**
```json
{
  "message": "Confirm mission success",
  "data": { ... }
}
```

**Errors:**
- `400` - reportId/deviceName is required / Device is currently active
- `404` - Device not found

---

### 4.6 Complete Mission

**PATCH** `/completemission` 🔒

> Changes status: IN_PROGRESS (2) → COMPLETED (3), EMERGENCY_IN_PROGRESS (6) → EMERGENCY_COMPLETED (7)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reportId | string | ✅ | Report ID |
| deviceName | string | ✅ | Device name |

**Response (200):**
```json
{
  "message": "Complete mission success",
  "data": { ... }
}
```

**Errors:**
- `400` - reportId/deviceName is required
- `404` - Device not found

---

### 4.7 Cancel Mission

**PATCH** `/cancelmission` 🔒

> Changes status: normal → CANCELLED (4), emergency → EMERGENCY_CANCELLED (8)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reportId | string | ✅ | Report ID |
| deviceName | string | ✅ | Device name |

**Response (200):**
```json
{
  "message": "Cancel mission success",
  "data": { ... }
}
```

**Errors:**
- `400` - reportId/deviceName is required
- `404` - Device not found

---

## 5. Streaming & Playback

### 5.1 Get Live Stream

**POST** `/getstream` 🔒

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| deviceCode | string | ✅ | Device code (e.g. "1000067") |
| channelId | string | ✅ | Channel ID (e.g. "1000067$1$0$0") |

**Response (200):**
```json
{
  "code": 1000,
  "data": {
    "video_url": "http://example.com/stream.m3u8"
  }
}
```

**Errors:**
- `400` - No device code provided

---

### 5.2 Get Playback

**POST** `/getplayback` 🔒

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| deviceCode | string | ✅ | Device code |
| channelId | string | ✅ | Channel ID |
| startTime | string | ✅ | Start time (YYYY-MM-DD HH:mm:ss) |
| endTime | string | ✅ | End time (YYYY-MM-DD HH:mm:ss) |

**Response (200):**
```json
{
  "code": 1000,
  "data": {
    "video_url": "http://example.com/playback.m3u8"
  }
}
```

**Errors:**
- `400` - Missing required parameters

---

### 5.3 Search Recordings

**POST** `/recording/search` 🔒

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| channelId | string | ✅ | Channel ID |
| daysBack | number | ❌ | Days to search back (default: 3) |

**Response (200):**
```json
{
  "code": 1000,
  "data": {
    "recordings": [
      {
        "startTime": "2026-05-22 08:00:00",
        "endTime": "2026-05-22 12:00:00"
      }
    ]
  }
}
```

**Errors:**
- `400` - channelId is required
- `500` - Recording search API URL is not configured
- `502` - Unable to authenticate with DSS

---

## 6. Video Conversion & Download

### 6.1 Check Video Cache

**POST** `/check-video-cache` 🔒

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| playbackParams | object | ✅ | Playback parameters |
| playbackParams.deviceCode | string | ✅ | Device code |
| playbackParams.startTime | string/number | ✅ | Start time (timestamp or "YYYY-MM-DD HH:mm:ss") |
| playbackParams.endTime | string/number | ✅ | End time (timestamp or "YYYY-MM-DD HH:mm:ss") |

**Response (200) - Cached:**
```json
{
  "cached": true,
  "cacheKey": "abc123...",
  "size": 52428800,
  "createdAt": 1716364800000,
  "ageMinutes": 30,
  "expiresInMinutes": 1410
}
```

**Response (200) - Converting:**
```json
{
  "cached": false,
  "converting": true,
  "progress": 45
}
```

**Response (200) - Not Cached:**
```json
{
  "cached": false
}
```

---

### 6.2 Convert and Cache Video (Background)

**POST** `/convert-and-cache` 🔒

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| playbackParams | object | ✅ | Playback parameters |
| playbackParams.deviceCode | string | ✅ | Device code |
| playbackParams.channelId | string | ❌ | Channel ID (default: deviceCode$1$0$0) |
| playbackParams.startTime | string/number | ✅ | Start time |
| playbackParams.endTime | string/number | ✅ | End time |

**Response (200):**
```json
{
  "success": true,
  "cached": false,
  "converting": true,
  "cacheKey": "abc123...",
  "message": "Conversion started in background"
}
```

---

### 6.3 Cancel Conversion

**POST** `/cancel-conversion` 🔒

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| playbackParams | object | ✅ | Playback parameters |
| playbackParams.deviceCode | string | ✅ | Device code |
| playbackParams.startTime | string/number | ✅ | Start time |
| playbackParams.endTime | string/number | ✅ | End time |

**Response (200):**
```json
{
  "success": true,
  "cacheKey": "abc123...",
  "message": "Conversion cancelled and files cleaned up"
}
```

---

### 6.4 Download Video as MP4

**POST** `/download-mp4` 🔒

> All-in-one: fetch HLS + convert + download (with caching)
> Supports Range header for resume download

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| playbackParams | object | ✅ | Playback parameters |
| playbackParams.deviceCode | string | ✅ | Device code |
| playbackParams.channelId | string | ❌ | Channel ID |
| playbackParams.startTime | string/number | ✅ | Start time |
| playbackParams.endTime | string/number | ✅ | End time |
| filename | string | ❌ | Output filename |

**Response:** Binary MP4 file stream

**Headers:**
- `Content-Type: video/mp4`
- `Content-Disposition: attachment; filename="video.mp4"`
- `Accept-Ranges: bytes`
- `X-Cache: HIT` or `X-Cache: MISS`

---

### 6.5 Download Video (Mobile)

**POST** `/download-video-mobile` 🔒

> Mobile-friendly download with resume support
> Requires video to be cached first via `/convert-and-cache`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| deviceCode | string | ✅ | Device code |
| channelId | string | ❌ | Channel ID |
| startTime | string/number | ✅ | Start time |
| endTime | string/number | ✅ | End time |
| filename | string | ❌ | Output filename |

**Response (200):** Binary MP4 file stream

**Response (202) - Converting:**
```json
{
  "success": false,
  "converting": true,
  "progress": 45,
  "message": "Video is being converted, please try again later"
}
```

**Response (404) - Not Cached:**
```json
{
  "success": false,
  "cached": false,
  "cacheKey": "abc123...",
  "message": "Video not cached. Please call /api_internal/convert-and-cache first to start background conversion."
}
```

---

### 6.6 Stream Cached Video

**GET** `/stream-cached-video/:cacheKey`

> Stream cached video for playback in browser
> Supports Range requests for seeking
> **No authentication required**

**Response (200/206):** Binary MP4 stream

**Headers:**
- `Content-Type: video/mp4`
- `Accept-Ranges: bytes`
- `Content-Range: bytes 0-1023/52428800` (for 206)

**Errors:**
- `400` - cacheKey required
- `404` - Cached file not found / Cache expired

---

### 6.7 Convert HLS to MP4 (Stream)

**POST** `/convert-hls-stream` 🔒

> Real-time streaming conversion (no file saved)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| hlsUrl | string | ✅ | HLS URL to convert |
| filename | string | ❌ | Output filename |

**Response:** Binary MP4 stream (chunked transfer)

---

### 6.8 Convert HLS to MP4 (File)

**POST** `/convert-hls-file` 🔒

> Convert and save to temp file, returns download URL

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| hlsUrl | string | ❌ | HLS URL (or use playbackParams) |
| playbackParams | object | ❌ | Playback parameters |
| filename | string | ❌ | Output filename |

**Response (200):**
```json
{
  "success": true,
  "fileId": "1716364800_abc123",
  "filename": "video.mp4",
  "size": 52428800,
  "downloadUrl": "/api_internal/download-video/1716364800_abc123?filename=video.mp4"
}
```

---

### 6.9 Download Converted Video

**GET** `/download-video/:fileId` 🔒

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| filename | string | ❌ | Output filename |

**Response:** Binary MP4 file

**Errors:**
- `400` - File ID is required
- `404` - File not found or expired

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "message": "Access token required"
}
```

### 403 Forbidden
```json
{
  "message": "Insufficient permissions"
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error"
}
```

---

## Security Notes

1. **Rate Limiting:** 100 requests per 15 minutes per IP (global)
2. **Login Rate Limiting:** Additional rate limiting on login/register endpoints
3. **Token Expiry:**
   - Access Token: 15 minutes (configurable)
   - Refresh Token: 7 days (configurable)
4. **Password Requirements:** Minimum 6 characters
5. **Cookie Security:** httpOnly, secure (in production), sameSite: strict

---

## Role Permissions

| Role | RoleId | User Management | Mission Management | Video Access |
|------|--------|-----------------|-------------------|--------------|
| Admin | 1 | Full CRUD | Full | Full |
| Manager | 2 | Read Only | Full | Full |
| User | 3 | None | Full | Full |
| Viewer | 4 | None | Read Only | Full |
