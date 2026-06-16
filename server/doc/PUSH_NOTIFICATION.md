# Push Notification (FCM) Flow

ระบบส่ง **push notification** ไปยังแอป mobile เมื่อเกิด event log แจ้งเตือน (กล้องออฟไลน์ / ใบงานเกินเวลา ฯลฯ)
ใช้ **Firebase Cloud Messaging (FCM HTTP v1)** ผ่าน `firebase-admin` SDK

> **TL;DR (EN):** Mobile registers an FCM token at login → can refresh it via `/device-token` → unregisters at logout. Schedulers that create event logs fire a multicast push to all active device tokens. Tokens live in a dedicated `UserDevices` table. The Admin SDK manages the OAuth access token automatically — no manual token minting.

---

## 1. ภาพรวม Flow

```
[Mobile]                         [Server]                                  [FCM]
   |  POST /login (firebaseToken) ----> auth.service: upsert UserDevices       |
   |                                     (IsActive=true)                        |
   |                                                                            |
   |  onTokenRefresh(newToken)                                                  |
   |  POST /device-token 🔒 --------> auth.service: upsert (token ใหม่)         |
   |                                                                            |
   |                              [scheduler รอบ ๆ]                              |
   |                              deviceStatus/missionAlert สร้าง EventLog       |
   |                              -> notifyEventLog(log, type)                  |
   |                              -> push.service: ดึง token ที่ active ทั้งหมด   |
   |  <------------------------------ sendEachForMulticast ------------------> ส่ง |
   |                              <- ผลต่อ token: token เสีย -> IsActive=false   |
   |                                                                            |
   |  POST /logout (firebaseToken) --> auth.service: deactivateUserDevice       |
```

จุดสำคัญ: push ถูก trigger ที่ **scheduler** (จุดที่สร้าง EventLog) ไม่ใช่ที่ WebSocket loop — เพื่อให้มือถือได้รับแจ้งเตือนแม้ไม่มีใครเปิดหน้าเว็บอยู่

---

## 2. องค์ประกอบ

| ส่วน | ไฟล์ | หน้าที่ |
|---|---|---|
| ตาราง token | `prisma/schema.prisma` (model `UserDevices`) | เก็บ FCM token ต่อเครื่อง |
| Firebase init | `src/lib/firebase.js` | init `firebase-admin` (lazy, กันพัง), คืน messaging |
| ส่ง push | `src/modules/notifications/push.service.js` | สร้าง message + multicast + cleanup token เสีย |
| Register/unregister | `src/modules/auth/auth.service.js` | upsert ตอน login/device-token, deactivate ตอน logout |
| Token CRUD | `src/modules/users/users.repository.js` | `upsertUserDevice` / `listActiveDeviceTokens` / `deactivateDeviceTokens` / `deactivateUserDevice` / `deactivateDeviceTokensNotSeenSince` |
| Trigger | `src/utils/deviceStatusScheduler.js`, `src/utils/missionAlertScheduler.js` | เรียก `notifyEventLog(log, type)` หลังสร้าง EventLog |
| Token cleanup | `src/modules/notifications/deviceToken.cleanup.service.js`, `src/utils/deviceTokenCleanupScheduler.js` | cron ปิด token ที่ `LastSeenAt` เก่าเกินกำหนด |

---

## 3. Database — ตาราง `UserDevices`

| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| DeviceTokenId | INT PK identity | |
| UserId | INT FK → Users | |
| DeviceId | NVARCHAR(100) | รหัสเครื่องที่ client ส่งมา |
| FirebaseToken | NVARCHAR(450) | FCM registration token |
| Platform | NVARCHAR(20) | default `'mobile'` |
| IsActive | BIT | default `1` — logout/มี token เสีย จะตั้งเป็น `0` |
| CreatedAt / UpdatedAt / LastSeenAt | DATETIME | |

- **Unique `(UserId, DeviceId)`** = key สำหรับ upsert → 1 เครื่อง = 1 แถว ไม่เกิดแถวค้างตอน token หมุน
- Index: `UserId`, `IsActive`, `FirebaseToken`
- Migration: `prisma/migrations/20260616000000_add_user_devices/migration.sql` (SQL Server) — **ต้องรันกับ DB** ด้วย `npx prisma migrate deploy` หรือรัน SQL ตรง

---

## 4. Endpoints

> Prefix จริงคือ `/api_internal` (ดู `src/routes/index.js`) — ตารางด้านล่างเขียน path แบบ relative เหมือน `API_SPEC.md`

### 4.1 Login (register token)

**POST** `/login`

| Field | Type | Required | Description |
|---|---|---|---|
| username | string | ✅ | |
| password | string | ✅ | |
| platform | string | ❌ | ต้องเป็น `"mobile"` ถึงจะ register token |
| deviceId | string | ❌ | รหัสเครื่อง (key ของ UserDevices) |
| firebaseToken | string | ❌ | FCM token — ถ้าส่งมาและ `platform=mobile` จะ upsert |

- ลงทะเบียนแบบ **safe**: ถ้า upsert ล้มเหลว **ไม่ block** การ login
- ไม่ส่ง `firebaseToken` → login ได้ปกติ แค่ไม่ register

### 4.2 Update device token (FCM rotate) 🔒

**POST** `/device-token` — ต้องมี access token (`Authorization: Bearer ...`)

| Field | Type | Required | Description |
|---|---|---|---|
| deviceId | string | ✅ | |
| firebaseToken | string | ✅ | token ใหม่หลัง FCM rotate |
| platform | string | ❌ | default `"mobile"` |

- ดึง `userId` จาก access token (ไม่เชื่อจาก body)
- upsert ด้วย key `(UserId, DeviceId)` → token ใหม่ทับแถวเดิม ไม่ต้อง login ใหม่
- **Errors:** `401` ไม่มี auth · `400` ขาด deviceId/firebaseToken · `500` upsert ล้มเหลว (งานหลักของ request นี้ จึงไม่ swallow error)

### 4.3 Logout (unregister token)

**POST** `/logout`

| Field | Type | Required | Description |
|---|---|---|---|
| refreshToken | string | ❌ | required สำหรับ mobile |
| platform | string | ❌ | `"web"` / `"mobile"` |
| deviceId | string | ❌ | ใช้ scope การ unregister |
| firebaseToken | string | ❌ | ใช้ unregister แบบตรงตัว |

- เฉพาะ `platform=mobile`: deactivate แถวที่ match **`FirebaseToken` ตรงตัว** หรือ **`(UserId, DeviceId)`** ของ session นั้น
- `web` ไม่แตะ device token (พฤติกรรมเหมือนเดิม)
- ทำงานได้แม้ refresh token หมดอายุ (ยัง unregister ด้วย token ได้)

---

## 5. การส่ง Push (event log → FCM)

### 5.1 Trigger & ผู้รับ
- `deviceStatusScheduler` → `notifyEventLog(log, "camera")`
- `missionAlertScheduler` → `notifyEventLog(log, "mission")`
- ส่งแบบ **fire-and-forget** หลัง `logsCreated > 0` (ไม่บล็อก scheduler)
- **ผู้รับ:** ทุก device token ที่ `IsActive = true` (unique) — multicast batch ละ 500

### 5.2 รูปแบบ message (ต่อ token)
```jsonc
{
  "message": {
    "token": "<active device token>",
    "notification": { "title": "🔴 กล้องออฟไลน์ระหว่างปฏิบัติงาน", "body": "BodyCam 001 (CAM-001) · สถานีกลาง" },
    "data": { "type": "camera", "id": "CAM-001" },
    "android": { "priority": "HIGH", "notification": { "channelId": "alerts_high", "sound": "default" } },
    "apns":    { "headers": { "apns-priority": "10" }, "payload": { "aps": { "sound": "default" } } }
  }
}
```
> ในโค้ดใช้ `firebase-admin` SDK (`sendEachForMulticast`) ตั้ง `android.priority: "high"` ซึ่ง SDK แปลงเป็น `"HIGH"` ใน REST v1 ให้เอง — payload บนสายเหมือน curl ทุกประการ

### 5.3 Title / Body (derive ใหม่ ไม่ยุ่งกับ Details เดิม)
- **title** = `{emoji} {TypeKey}` · emoji: `Severity=HIGH → 🔴`, อื่น → `⚠️`
- **body** สั้นเฉพาะ push:
  - `type=camera` → `{ชื่อกล้อง (รหัส)} · {LocationName}`
  - `type=mission` → `{ชื่อใบงาน} · {OfficerName}`
  - fallback → ประโยคแรกของ `Details` (ตัด metadata หลัง `|` ทิ้ง)
- ชื่อกล้อง/ใบงาน parse จาก `Details` (regex เดิม) fallback เป็น `DeviceCode` / `OfficerName`
- **`Details` ในฐานข้อมูลไม่ถูกแตะ** — เว็บและ socket ยังใช้ regex แกะได้เหมือนเดิม

### 5.4 `data` mapping (สำหรับ deep-link ฝั่งแอป)
| แหล่งที่มา | `type` | `id` |
|---|---|---|
| กล้อง (deviceStatus) | `"camera"` | `DeviceCode` |
| ใบงาน (missionAlert) | `"mission"` | `MissionId` |
| ขาดข้อมูล entity | `"eventlog"` | `LogId` |

### 5.5 Channel ตาม Severity
| Severity | emoji | android `channelId` |
|---|---|---|
| HIGH | 🔴 | `alerts_high` |
| อื่น ๆ | ⚠️ | `alerts_default` |

### 5.6 Cleanup token เสีย (2 ชั้น)
**ชั้น 1 — reactive (ตอนส่ง):** ถ้า FCM ตอบ error `registration-token-not-registered`, `invalid-registration-token`, `invalid-argument`
→ token นั้นถูกตั้ง `IsActive = false` (`deactivateDeviceTokens`) เพื่อไม่ส่งซ้ำอีก

**ชั้น 2 — proactive (cron):** `deviceTokenCleanupScheduler` รันตาม cron ปิด token ที่ `IsActive=true` แต่ไม่ได้อัปเดต `LastSeenAt`
นานเกิน `DEVICE_TOKEN_RETENTION_DAYS` (default 60 วัน) → กวาด token ค้าง (เครื่องถอนแอป/เลิกใช้โดยไม่ logout) ออกจากรายชื่อผู้รับก่อนที่จะ push fail
เครื่องที่กลับมาใช้และ re-register (`/login` หรือ `/device-token`) จะถูกตั้ง `IsActive=true` คืนเอง

---

## 6. Token Lifecycle
```
login(mobile + token)  -> upsert  (IsActive=true)
device-token (rotate)  -> upsert  (token ใหม่, IsActive=true)
push ส่งไม่ได้ (token เสีย) -> IsActive=false   (reactive)
logout                 -> IsActive=false
cron (LastSeenAt เก่า)  -> IsActive=false   (proactive, default > 60 วัน)
login ใหม่/device-token  -> upsert กลับมา IsActive=true
```

---

## 7. Firebase Authentication
ใช้ **`firebase-admin` SDK** ซึ่ง **mint / cache / refresh OAuth2 access token (`firebase.messaging`) ให้อัตโนมัติ** จาก service account
→ **ไม่ต้องเขียน `getAccessToken()` (google-auth-library) เอง** วิธีนั้นจำเป็นเฉพาะถ้ายิง REST API ตรง (ซึ่ง REST v1 ไม่มี multicast ต้อง loop เอง)

---

## 8. Configuration (ENV)
optional ทั้งหมด มี default — ดู `.env.example`

| ตัวแปร | Default | หน้าที่ |
|---|---|---|
| `FIREBASE_PUSH_ENABLED` | `true` | ตั้ง `false` เพื่อปิด push (เช่นตอน dev) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | `firebase/service_account.json` | path ของ service account (relative กับ server root) |
| `DEVICE_TOKEN_RETENTION_DAYS` | `60` | ปิด token ที่ `LastSeenAt` เก่าเกินกี่วัน |
| `DEVICE_TOKEN_CLEANUP_CRON` | `0 3 * * *` | ตารางเวลา cron ของ cleanup |
| `DEVICE_TOKEN_CLEANUP_TIMEZONE` | `Asia/Bangkok` | timezone ของ cron |

> ไฟล์ `firebase/service_account.json` เป็น **secret** และถูก `.gitignore` ไว้ (`/firebase`) — อย่า commit

---

## 9. สิ่งที่ฝั่ง Mobile ต้องทำ (server กำหนดให้ไม่ได้)
- **Android 8+:** แอปต้องสร้าง 2 notification channel เอง
  - `alerts_high` — IMPORTANCE_HIGH + เสียง (สำหรับ HIGH)
  - `alerts_default` — สำหรับ WARNING/อื่น ๆ
  - ถ้าไม่สร้าง channelId ที่ส่งไปจะไม่มีผล (เสียง/ความเด่นไม่ขึ้น)
- **iOS:** ขอ permission notification; `sound:"default"` ใช้ได้เลย (custom sound / time-sensitive ต้องตั้งในแอป + entitlement)
- เรียก `/device-token` ทุกครั้งที่ได้ token ใหม่จาก `onTokenRefresh` **และทุกครั้งที่เปิดแอป** (ถ้า access token หมดอายุ ให้ `/refresh` ก่อน) — กันเคส token หมุนตอนแอปถูก kill เพื่อให้ login ค้างนานๆ ยังได้ noti ต่อเนื่อง

---

## 10. Testing
Smoke tests (อยู่ใน `npm run smoke` แล้ว — self-contained ไม่ต่อ DB/FCM จริง):

| Script | ครอบคลุม |
|---|---|
| `npm run smoke:device-token-lifecycle` | login register / device-token rotate + validation / logout unregister / web ไม่แตะ |
| `npm run smoke:push-event-log` | message format (title/body/data/channel/apns) · multicast นับ sent-fail · ปิด token เสีย · skip เมื่อไม่มี token |
| `npm run smoke:device-token-cleanup` | cron cleanup: cutoff = now − retentionDays, deactivate ตาม LastSeenAt |

---

## 11. Deployment note
1. `npx prisma migrate deploy` (หรือรัน SQL ของ migration `20260616000000_add_user_devices`)
2. `npx prisma generate` (ให้ client มี model `UserDevices`)
3. วาง `firebase/service_account.json` ที่ server root
4. `npm run check` + `npm run smoke`
