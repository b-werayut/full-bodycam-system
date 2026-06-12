# Backend Architecture / สถาปัตยกรรม Backend

---

## 🇹🇭 ภาษาไทย

### ภาพรวมโครงสร้าง

```
body-cam-internal-api-v2/
├── server.js                    # Entry point
├── package.json                 # Dependencies & scripts
├── prisma/
│   └── schema.prisma            # Database schema
├── scripts/                     # Smoke tests & utilities
└── src/
    ├── app.js                   # Express app configuration
    ├── config/
    │   ├── index.js             # Centralized configuration
    │   └── env.js               # Environment helpers
    ├── lib/
    │   └── prisma.js            # Prisma client instance
    ├── middleware/
    │   ├── index.js             # Middleware exports
    │   ├── auth.js              # Authentication & authorization
    │   ├── asyncHandler.js      # Async error wrapper
    │   ├── errorHandler.js      # Global error handling
    │   ├── rateLimit.js         # Rate limiting
    │   ├── security.js          # Security headers
    │   ├── validation.js        # Request validation
    │   └── audit.js             # Audit logging
    ├── modules/
    │   ├── auth/                # Authentication module
    │   ├── users/               # User management module
    │   ├── dss/                 # DSS integration module
    │   ├── video/               # Video conversion module
    │   ├── devices/             # Device status module
    │   ├── internal-api/        # Internal API module
    │   └── realtime/            # WebSocket module
    ├── routes/
    │   └── index.js             # Route registration
    ├── runtime/
    │   └── startServer.js       # Server startup & shutdown
    └── utils/
        ├── index.js             # Utils exports
        ├── response.js          # Standard response wrapper
        ├── logger.js            # Structured logging
        ├── socketHandler.js     # WebSocket handler
        └── deviceStatusScheduler.js  # Device status scheduler
```

### รูปแบบสถาปัตยกรรม

ระบบใช้ **Modular Layered Architecture** แบ่งเป็นชั้นดังนี้:

```
┌─────────────────────────────────────────────────────────────┐
│                        Routes Layer                         │
│              (*.routes.js - กำหนด endpoints)                │
├─────────────────────────────────────────────────────────────┤
│                      Controller Layer                       │
│         (*.controller.js - จัดการ request/response)         │
├─────────────────────────────────────────────────────────────┤
│                       Service Layer                         │
│            (*.service.js - business logic)                  │
├─────────────────────────────────────────────────────────────┤
│                      Repository Layer                       │
│         (*.repository.js - data access logic)               │
├─────────────────────────────────────────────────────────────┤
│                       Data Layer                            │
│                  (Prisma ORM + SQL Server)                  │
└─────────────────────────────────────────────────────────────┘
```

### โครงสร้าง Module

แต่ละ module มีโครงสร้างมาตรฐาน:

```
src/modules/{module-name}/
├── {module}.routes.js       # Route definitions
├── {module}.controller.js   # Request handlers
├── {module}.service.js      # Business logic
├── {module}.repository.js   # Data access (optional)
├── {module}.schemas.js      # Validation schemas (optional)
└── index.js                 # Module exports
```

### Modules หลัก

| Module | หน้าที่ |
|--------|---------|
| **auth** | Authentication (login, register, JWT tokens) |
| **users** | User management (CRUD, roles) |
| **dss** | DSS integration (stream, playback, recordings) |
| **video** | Video conversion (HLS to MP4, caching) |
| **devices** | Device status monitoring |
| **internal-api** | Reports, missions, event logs |
| **realtime** | WebSocket real-time updates |

### Middleware Pipeline

```
Request → Security → Rate Limit → Auth → Validation → Controller → Response
                                                           ↓
                                                    Error Handler
```

### การใช้งาน Utils

**Response Wrapper:**
```javascript
const { success, error, paginated } = require("../../utils");

// Success response
success(res, data, "ดำเนินการสำเร็จ");

// Error response
error(res, "ไม่พบข้อมูล", 404);

// Paginated response
paginated(res, items, { page: 1, limit: 10, total: 100 });
```

**Logger:**
```javascript
const { loggers } = require("../../utils");

loggers.auth.info("User logged in", { userId: 123 });
loggers.dss.error("Connection failed", { error: err.message });
```

### คำสั่งที่ใช้บ่อย

```bash
# Development
npm run start

# Production
npm run start:node

# Syntax check
npm run check

# Smoke tests
npm run smoke

# Prisma
npm run prisma:generate
npm run prisma:studio
```

---

## 🇬🇧 English

### Project Structure Overview

```
body-cam-internal-api-v2/
├── server.js                    # Entry point
├── package.json                 # Dependencies & scripts
├── prisma/
│   └── schema.prisma            # Database schema
├── scripts/                     # Smoke tests & utilities
└── src/
    ├── app.js                   # Express app configuration
    ├── config/
    │   ├── index.js             # Centralized configuration
    │   └── env.js               # Environment helpers
    ├── lib/
    │   └── prisma.js            # Prisma client instance
    ├── middleware/
    │   ├── index.js             # Middleware exports
    │   ├── auth.js              # Authentication & authorization
    │   ├── asyncHandler.js      # Async error wrapper
    │   ├── errorHandler.js      # Global error handling
    │   ├── rateLimit.js         # Rate limiting
    │   ├── security.js          # Security headers
    │   ├── validation.js        # Request validation
    │   └── audit.js             # Audit logging
    ├── modules/
    │   ├── auth/                # Authentication module
    │   ├── users/               # User management module
    │   ├── dss/                 # DSS integration module
    │   ├── video/               # Video conversion module
    │   ├── devices/             # Device status module
    │   ├── internal-api/        # Internal API module
    │   └── realtime/            # WebSocket module
    ├── routes/
    │   └── index.js             # Route registration
    ├── runtime/
    │   └── startServer.js       # Server startup & shutdown
    └── utils/
        ├── index.js             # Utils exports
        ├── response.js          # Standard response wrapper
        ├── logger.js            # Structured logging
        ├── socketHandler.js     # WebSocket handler
        └── deviceStatusScheduler.js  # Device status scheduler
```

### Architecture Pattern

The system uses a **Modular Layered Architecture** with the following layers:

```
┌─────────────────────────────────────────────────────────────┐
│                        Routes Layer                         │
│              (*.routes.js - define endpoints)               │
├─────────────────────────────────────────────────────────────┤
│                      Controller Layer                       │
│         (*.controller.js - handle request/response)         │
├─────────────────────────────────────────────────────────────┤
│                       Service Layer                         │
│            (*.service.js - business logic)                  │
├─────────────────────────────────────────────────────────────┤
│                      Repository Layer                       │
│         (*.repository.js - data access logic)               │
├─────────────────────────────────────────────────────────────┤
│                       Data Layer                            │
│                  (Prisma ORM + SQL Server)                  │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure

Each module follows a standard structure:

```
src/modules/{module-name}/
├── {module}.routes.js       # Route definitions
├── {module}.controller.js   # Request handlers
├── {module}.service.js      # Business logic
├── {module}.repository.js   # Data access (optional)
├── {module}.schemas.js      # Validation schemas (optional)
└── index.js                 # Module exports
```

### Core Modules

| Module | Purpose |
|--------|---------|
| **auth** | Authentication (login, register, JWT tokens) |
| **users** | User management (CRUD, roles) |
| **dss** | DSS integration (stream, playback, recordings) |
| **video** | Video conversion (HLS to MP4, caching) |
| **devices** | Device status monitoring |
| **internal-api** | Reports, missions, event logs |
| **realtime** | WebSocket real-time updates |

### Middleware Pipeline

```
Request → Security → Rate Limit → Auth → Validation → Controller → Response
                                                           ↓
                                                    Error Handler
```

### Using Utils

**Response Wrapper:**
```javascript
const { success, error, paginated } = require("../../utils");

// Success response
success(res, data, "Operation successful");

// Error response
error(res, "Not found", 404);

// Paginated response
paginated(res, items, { page: 1, limit: 10, total: 100 });
```

**Logger:**
```javascript
const { loggers } = require("../../utils");

loggers.auth.info("User logged in", { userId: 123 });
loggers.dss.error("Connection failed", { error: err.message });
```

### Common Commands

```bash
# Development
npm run start

# Production
npm run start:node

# Syntax check
npm run check

# Smoke tests
npm run smoke

# Prisma
npm run prisma:generate
npm run prisma:studio
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime |
| **Express.js** | Web framework |
| **Prisma** | ORM |
| **SQL Server** | Database |
| **WebSocket (ws)** | Real-time communication |
| **FFmpeg** | Video conversion |
| **JWT** | Authentication |

---

## API Prefix

All API endpoints are prefixed with: `/api_internal`

Example: `GET /api_internal/getReport`

---

*Last updated: May 2026*
