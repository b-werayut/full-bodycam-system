const fs = require("fs");
const { initializeApp, getApps, getApp, cert } = require("firebase-admin/app");
const { getMessaging: getAdminMessaging } = require("firebase-admin/messaging");
const { config } = require("../config");

let app = null;
let initialized = false;

// init แบบ lazy + กันพัง: ถ้าปิดไว้หรือไม่มี service account ให้คืน null
// เพื่อให้ flow หลัก (เช่น scheduler) ทำงานต่อได้โดยไม่ crash
function initFirebase() {
  if (initialized) {
    return app;
  }
  initialized = true;

  if (!config.firebase.pushEnabled) {
    console.log("[Firebase] Push disabled (FIREBASE_PUSH_ENABLED=false)");
    return null;
  }

  const serviceAccountPath = config.firebase.serviceAccountPath;

  if (!fs.existsSync(serviceAccountPath)) {
    console.warn(
      `[Firebase] Service account not found at ${serviceAccountPath} — push notifications disabled`,
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    app = getApps().length ? getApp() : initializeApp({ credential: cert(serviceAccount) });
    console.log(`[Firebase] Initialized for project ${serviceAccount.project_id}`);
    return app;
  } catch (error) {
    console.error("[Firebase] Initialization failed:", error?.message || error);
    return null;
  }
}

// คืน messaging instance ถ้าพร้อมใช้งาน มิฉะนั้นคืน null
function getMessaging() {
  const instance = initFirebase();
  return instance ? getAdminMessaging(instance) : null;
}

function isFirebaseReady() {
  return Boolean(initFirebase());
}

module.exports = { initFirebase, getMessaging, isFirebaseReady };
