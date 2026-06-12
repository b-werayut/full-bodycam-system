# Bodycam Server

Express API server for authentication, user management, internal reporting, missions, DSS camera access, video conversion, realtime socket updates, and device-status monitoring.

## Production Readiness

From the current refactor/architecture perspective, this server is ready to deploy to production when the production environment is prepared correctly:

- Production `.env` is configured with real database, JWT, DSS, CORS, and scheduler values.
- Database schema/migrations and Prisma client are generated for the target environment.
- FFmpeg is installed and available on the server `PATH` for video conversion endpoints.
- `npm run check` and `npm run smoke` pass before deployment.
- Frontend build/deployment points to the correct API host.
- Secrets are not copied from `.env.example`.

This README does not replace environment-specific deployment checks such as backups, DB connectivity, SSL/reverse proxy configuration, process manager setup, or dependency vulnerability review.

## Architecture

Runtime entrypoints:

- `server.js`: thin entrypoint. Loads `.env` and starts the runtime.
- `src/app.js`: Express app factory. Builds middleware and routes without starting sockets/schedulers.
- `src/runtime/startServer.js`: HTTP server, WebSocket setup, scheduler startup, and graceful shutdown.
- `src/routes/index.js`: central route registry for `/api_internal`.
- `src/config`: central environment/config reader.

Main modules:

- `src/modules/auth`: login, register, refresh token, password change, token/password services.
- `src/modules/users`: user/role management services and repository.
- `src/modules/dss`: DSS login, live stream, playback, and recording search.
- `src/modules/video`: video cache, playback URL retrieval, metadata probing, HLS/MP4 conversion endpoints.
- `src/modules/devices`: online/offline device status and emergency event handling.
- `src/modules/realtime`: WebSocket/realtime device updates.
- `src/modules/internal-api`: reports, devices, missions, and event logs.

Legacy compatibility:

- `Controllers/*` files are intentionally kept as tiny wrappers for old imports.
- New route/runtime code should import from `src/modules/*`, not from `Controllers/*`.
- Smoke boundary scripts guard the important import boundaries.

## Install

```bash
cd server
npm install
npx prisma generate
```

Install FFmpeg on the host and confirm it is available:

```bash
ffmpeg -version
```

## Environment

Create a production `.env` from `server/.env.example`, then replace every placeholder.

Required groups:

- Database: `DATABASE_URL`
- Server/CORS: `PORT`, `NODE_ENV`, `FRONTEND_URL`
- Auth: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, password hashing values
- DSS: `LOGIN_API_URL`, `STREAM_API_URL`, `PLAYBACK_API_URL`, optional `LOCATION_API_URL`, optional `RECORDING_SEARCH_API_URL`, `USER_DSS`, `PWD_DSS`
- Device scheduler: `DEVICE_STATUS_CHECK_INTERVAL_SECONDS`, `DEVICE_STATUS_ALERT_DELAY_SECONDS`, `DEVICE_STATUS_CACHE_RESET_SECONDS`, `DEVICE_STATUS_ONLINE_INACTIVE_REPEAT_SECONDS`
- Mission alert scheduler: `MISSION_ALERT_CHECK_INTERVAL_SECONDS`, `MISSION_ALERT_OVERDUE_GRACE_SECONDS`, `MISSION_ALERT_REPEAT_SECONDS`

Production notes:

- Use long random JWT secrets.
- Set `NODE_ENV=production`.
- Set `FRONTEND_URL` to the exact production frontend origin.
- Confirm SQL Server SSL/trust settings match the production database policy.

## Verification

Run before deploy:

```bash
cd server
npm run check
npm run smoke
```

Recommended full repository verification:

```bash
npm run build
npm run lint
```

Smoke scripts:

- `smoke-app`: app factory and route registry import check.
- `smoke:auth-boundary`: route files must use shared auth middleware.
- `smoke:runtime-boundary`: runtime utilities must not import legacy controllers.
- `smoke:dss-boundary`: routes must import DSS module instead of legacy DSS controllers.
- `smoke:video-boundary`: routes must import video module instead of legacy video controller.

## Run

Development-style Node start:

```bash
cd server
npm run start:node
```

For production, run `node server.js` under a process manager such as PM2, systemd, Docker, or the platform supervisor used by your infrastructure.

## Deployment Checklist

1. Pull the intended commit.
2. Install dependencies with the lockfile.
3. Run `npx prisma generate`.
4. Configure production `.env`.
5. Confirm FFmpeg is installed.
6. Run `npm run check`.
7. Run `npm run smoke`.
8. Start/restart the process manager.
9. Check logs for startup, DB, DSS, scheduler, and WebSocket errors.
10. Smoke the main user flows: login, live stream, playback/video download, user management, missions, and reports.

## Refactor Rules

- Keep controllers thin: HTTP request/response only.
- Put business rules in module services.
- Put Prisma-specific access in repositories/services near the owning module.
- Keep `src/config` as the only place that reads environment values directly, except the server entrypoint loading `.env`.
- Preserve route paths and response shapes unless the frontend contract is intentionally changed.
- Keep legacy `Controllers/*` wrappers until all external consumers are known to be migrated.

---

# คู่มือภาษาไทย

เซิร์ฟเวอร์นี้เป็น Express API สำหรับระบบ Bodycam ครอบคลุม authentication, user management, report, mission, DSS camera, video conversion, realtime socket และ device-status monitoring

## พร้อมใช้ Production หรือยัง

จากมุม refactor และ architecture ล่าสุด เซิร์ฟเวอร์พร้อมนำไป deploy production ได้ เมื่อ environment production ถูกเตรียมครบตามนี้:

- ตั้งค่า `.env` production ด้วยค่าจริงของ database, JWT, DSS, CORS และ scheduler
- เตรียม database schema/migration และ generate Prisma client แล้ว
- ติดตั้ง FFmpeg บนเครื่อง server และเรียกผ่าน `PATH` ได้
- รัน `npm run check` และ `npm run smoke` ผ่านก่อน deploy
- frontend ชี้ API host ถูกต้อง
- ห้ามใช้ secret จาก `.env.example` ใน production

README นี้ไม่ได้แทนที่ checklist เฉพาะ infra เช่น backup, DB connectivity, SSL/reverse proxy, process manager หรือ dependency vulnerability review

## โครงสร้าง Architecture

ไฟล์ runtime หลัก:

- `server.js`: entrypoint บาง ๆ สำหรับโหลด `.env` และ start runtime
- `src/app.js`: สร้าง Express app, middleware และ routes โดยยังไม่ start socket/scheduler
- `src/runtime/startServer.js`: start HTTP server, WebSocket, scheduler และ graceful shutdown
- `src/routes/index.js`: registry กลางของ route ภายใต้ `/api_internal`
- `src/config`: จุดอ่าน env/config กลางของ server

โมดูลหลัก:

- `src/modules/auth`: login, register, refresh token, change password, token/password services
- `src/modules/users`: จัดการ users/roles พร้อม service และ repository
- `src/modules/dss`: login DSS, live stream, playback และ recording search
- `src/modules/video`: cache video, ขอ playback URL, อ่าน metadata, HLS/MP4 conversion
- `src/modules/devices`: device status, online/offline detection และ emergency event
- `src/modules/realtime`: WebSocket/realtime device updates
- `src/modules/internal-api`: reports, devices, missions และ event logs

Legacy compatibility:

- `Controllers/*` ยังเก็บไว้เป็น wrapper สั้น ๆ เพื่อให้ import เก่าไม่พัง
- code ใหม่ควร import จาก `src/modules/*` เท่านั้น
- smoke boundary scripts ใช้กันไม่ให้ route/runtime กลับไปผูกกับ legacy controllers

## การติดตั้ง

```bash
cd server
npm install
npx prisma generate
```

ติดตั้ง FFmpeg บนเครื่อง server แล้วตรวจสอบ:

```bash
ffmpeg -version
```

## Environment

สร้าง `.env` production จาก `server/.env.example` แล้วเปลี่ยน placeholder ทั้งหมดเป็นค่าจริง

กลุ่มค่าที่ต้องมี:

- Database: `DATABASE_URL`
- Server/CORS: `PORT`, `NODE_ENV`, `FRONTEND_URL`
- Auth: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, password hashing values
- DSS: `LOGIN_API_URL`, `STREAM_API_URL`, `PLAYBACK_API_URL`, optional `LOCATION_API_URL`, optional `RECORDING_SEARCH_API_URL`, `USER_DSS`, `PWD_DSS`
- Device scheduler: `DEVICE_STATUS_CHECK_INTERVAL_SECONDS`, `DEVICE_STATUS_ALERT_DELAY_SECONDS`, `DEVICE_STATUS_CACHE_RESET_SECONDS`, `DEVICE_STATUS_ONLINE_INACTIVE_REPEAT_SECONDS`
- Mission alert scheduler: `MISSION_ALERT_CHECK_INTERVAL_SECONDS`, `MISSION_ALERT_OVERDUE_GRACE_SECONDS`, `MISSION_ALERT_REPEAT_SECONDS`

ข้อควรระวัง production:

- ใช้ JWT secrets ที่ยาวและสุ่มจริง
- ตั้ง `NODE_ENV=production`
- ตั้ง `FRONTEND_URL` เป็น origin จริงของ frontend production
- ตรวจ policy SSL/trust ของ SQL Server ให้ตรงกับ production database

## Verification ก่อน Deploy

รันใน `server`:

```bash
cd server
npm run check
npm run smoke
```

แนะนำให้รันจาก root repo ด้วย:

```bash
npm run build
npm run lint
```

ความหมายของ smoke scripts:

- `smoke-app`: ตรวจ app factory และ route registry import
- `smoke:auth-boundary`: route ต้องใช้ shared auth middleware
- `smoke:runtime-boundary`: runtime utilities ต้องไม่ import legacy controllers
- `smoke:dss-boundary`: route ต้อง import DSS module แทน legacy DSS controllers
- `smoke:video-boundary`: route ต้อง import video module แทน legacy video controller

## การ Run

สำหรับ start แบบ Node:

```bash
cd server
npm run start:node
```

ใน production ให้รัน `node server.js` ผ่าน process manager ที่ infra ใช้อยู่ เช่น PM2, systemd, Docker หรือ platform supervisor

## Deployment Checklist

1. Pull commit ที่ต้องการ deploy
2. Install dependencies ตาม lockfile
3. Run `npx prisma generate`
4. ตั้งค่า production `.env`
5. ตรวจว่า FFmpeg ติดตั้งแล้ว
6. Run `npm run check`
7. Run `npm run smoke`
8. Start/restart process manager
9. ดู logs ของ startup, DB, DSS, scheduler และ WebSocket
10. Smoke test flow หลัก: login, live stream, playback/video download, user management, missions และ reports

## กฎการ Refactor ต่อจากนี้

- controller ควรบางที่สุด ทำหน้าที่รับ request/ส่ง response
- business rules ควรอยู่ใน service
- Prisma access ควรอยู่ใน repository/service ของ module ที่เป็นเจ้าของ
- อ่าน env ผ่าน `src/config` เป็นหลัก ยกเว้น entrypoint ที่โหลด `.env`
- ห้ามเปลี่ยน route path หรือ response shape ถ้า frontend contract ยังไม่เปลี่ยน
- เก็บ legacy `Controllers/*` wrappers ไว้จนกว่าจะมั่นใจว่าไม่มี external consumer ใช้งานแล้ว
