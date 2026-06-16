const { getMessaging } = require("../../lib/firebase");
const usersRepository = require("../users/users.repository");

// FCM sendEachForMulticast รับได้สูงสุด 500 token ต่อครั้ง
const FCM_MULTICAST_LIMIT = 500;

// error code ที่บอกว่า token ใช้ไม่ได้แล้ว -> ปิดการใช้งานเพื่อไม่ส่งซ้ำอีก
const INVALID_TOKEN_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function truncate(text, max = 240) {
  if (typeof text !== "string") {
    return "";
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// เลือก data.{type,id} ตามแหล่งที่มาของ alert เพื่อให้แอป deep-link ไปหน้า entity ได้
// camera -> DeviceCode, mission -> MissionId, อื่น ๆ/ขาดข้อมูล -> eventlog + LogId
function resolveTarget(eventLog, type) {
  if (type === "camera" && eventLog.DeviceCode) {
    return { type: "camera", id: String(eventLog.DeviceCode) };
  }
  if (type === "mission" && eventLog.MissionId != null) {
    return { type: "mission", id: String(eventLog.MissionId) };
  }
  return { type: "eventlog", id: String(eventLog.LogId ?? "") };
}

// ดึง "ชื่อ (รหัส)" ของกล้องจาก Details (ฟอร์แมต "อุปกรณ์ <ชื่อ> (<รหัส>)") fallback เป็น DeviceCode
function parseDeviceLabel(details, deviceCode) {
  const match = (details || "").match(/อุปกรณ์\s+(.+?)\s+\(([^)]+)\)/);
  const name = match?.[1]?.trim();
  const code = match?.[2]?.trim() || deviceCode || "";

  if (name) {
    return code ? `${name} (${code})` : name;
  }
  return code;
}

// ดึงชื่อใบงานจาก Details (ฟอร์แมต "ใบงาน <ชื่อ> ถึงกำหนด...")
function parseMissionName(details) {
  const match = (details || "").match(/ใบงาน\s+(.+?)\s+ถึงกำหนด/);
  return match?.[1]?.trim() || "";
}

// สร้าง body สั้นเฉพาะ push: title บอก "เกิดอะไร" แล้ว body บอก "ที่ไหน/ของใคร" (ไม่ยุ่งกับ Details เดิม)
function buildBody(eventLog, type) {
  const details = eventLog.Details || "";

  if (type === "camera") {
    const parts = [parseDeviceLabel(details, eventLog.DeviceCode)];
    if (eventLog.LocationName) {
      parts.push(eventLog.LocationName);
    }
    return truncate(parts.filter(Boolean).join(" · "));
  }

  if (type === "mission") {
    const parts = [];
    const missionName = parseMissionName(details);
    if (missionName) {
      parts.push(missionName);
    }
    if (eventLog.OfficerName) {
      parts.push(eventLog.OfficerName);
    }
    if (parts.length) {
      return truncate(parts.join(" · "));
    }
  }

  // fallback: เอาเฉพาะประโยคแรกของ Details (ตัด metadata หลัง " | " ทิ้ง)
  return truncate(details.split(" | ")[0]);
}

// แปลง EventLog ที่เพิ่งสร้างเป็น FCM message ให้เหมาะกับ push บนมือถือ (Android + iOS)
// android.priority "high" + apns-priority "10" จะถูกส่งเป็น REST v1 ตามมาตรฐาน FCM
function buildMessage(eventLog, type) {
  const target = resolveTarget(eventLog, type);
  const isHigh = String(eventLog.Severity || "").toUpperCase() === "HIGH";
  const emoji = isHigh ? "🔴" : "⚠️";

  return {
    notification: {
      title: `${emoji} ${eventLog.TypeKey || "แจ้งเตือนระบบ"}`,
      body: buildBody(eventLog, type),
    },
    data: {
      type: target.type,
      id: target.id,
    },
    // Android: แยก channel ตาม severity ให้ HIGH เด่นกว่า (แอปต้องสร้าง channel alerts_high/alerts_default เอง)
    android: {
      priority: "high",
      notification: {
        channelId: isHigh ? "alerts_high" : "alerts_default",
        sound: "default",
      },
    },
    // iOS: ส่งทันที + มีเสียง (custom sound / time-sensitive ต้องตั้งฝั่งแอป)
    apns: {
      headers: { "apns-priority": "10" },
      payload: { aps: { sound: "default" } },
    },
  };
}

// ส่ง push ของ event log หนึ่งรายการไปยังทุกเครื่อง mobile ที่ active
// type: "camera" | "mission" | undefined (กำหนดโดยผู้เรียกตามแหล่งที่มาของ alert)
async function sendEventLogPush(eventLog, type) {
  if (!eventLog) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const messaging = getMessaging();
  if (!messaging) {
    return { sent: 0, failed: 0, skipped: true };
  }

  let tokens;
  try {
    tokens = await usersRepository.listActiveDeviceTokens();
  } catch (error) {
    console.error("[Push] Failed to load device tokens:", error?.message || error);
    return { sent: 0, failed: 0, skipped: true };
  }

  if (!tokens.length) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const baseMessage = buildMessage(eventLog, type);
  const invalidTokens = [];
  let sent = 0;
  let failed = 0;

  for (const batch of chunk(tokens, FCM_MULTICAST_LIMIT)) {
    try {
      const response = await messaging.sendEachForMulticast({ ...baseMessage, tokens: batch });
      sent += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((res, index) => {
        if (!res.success) {
          const token = batch[index];
          // โชว์แค่ prefix ของ token (กันโชว์เต็มใน log) + error code/message เพื่อ debug สาเหตุ fail
          const tokenHint = typeof token === "string" ? `${token.slice(0, 12)}…` : "";
          console.warn(
            `[Push] token fail [${tokenHint}]: ${res.error?.code || "unknown"} — ${res.error?.message || ""}`,
          );

          if (INVALID_TOKEN_ERROR_CODES.has(res.error?.code)) {
            invalidTokens.push(token);
          }
        }
      });
    } catch (error) {
      failed += batch.length;
      console.error("[Push] sendEachForMulticast failed:", error?.message || error);
    }
  }

  if (invalidTokens.length) {
    try {
      await usersRepository.deactivateDeviceTokens(invalidTokens);
      console.log(`[Push] Deactivated ${invalidTokens.length} invalid token(s)`);
    } catch (error) {
      console.error("[Push] Failed to deactivate invalid tokens:", error?.message || error);
    }
  }

  console.log(
    `[Push] EventLog ${eventLog.LogId}: sent ${sent}, failed ${failed} (active tokens ${tokens.length})`,
  );
  return { sent, failed, invalidated: invalidTokens.length };
}

// fire-and-forget: ใช้ที่จุด orchestration (scheduler) โดยไม่ await และไม่ให้ error กระทบ flow หลัก
// type: "camera" | "mission" ตามแหล่งที่มาของ alert
function notifyEventLog(eventLog, type) {
  sendEventLogPush(eventLog, type).catch((error) => {
    console.error("[Push] notifyEventLog error:", error?.message || error);
  });
}

module.exports = { sendEventLogPush, notifyEventLog };
