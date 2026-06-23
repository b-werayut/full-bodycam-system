const {
  getDevicesWithStatus,
  getLatestEventLogId,
  getNewEventLogNotifications,
} = require("../modules/realtime/socket.service");
const { verifyJwt } = require("../modules/auth/token.service");
const { canAccessLocation } = require("./locationScope");

let deviceStatusInterval = null;
let eventLogNotificationInterval = null;
let latestEventLogId = null;

// ดึง user จาก access token ที่ client แนบมาใน query (?token=...) ของ WebSocket upgrade request
// token เป็น JWT เดียวกับ REST -> มี roleId/locationCode อยู่แล้ว ไม่ต้อง query DB
const getUserFromRequest = (request) => {
  try {
    const url = new URL(request?.url || "", "http://localhost");
    const token = url.searchParams.get("token");
    return token ? verifyJwt(token) : null;
  } catch {
    return null;
  }
};

// กรอง list (devices/notifications) ตาม location ของ client (admin เห็นทั้งหมด, ไม่มี user/location เห็นว่าง)
const visibleTo = (user, items) => items.filter((item) => canAccessLocation(user, item.locationCode));

const broadcastDeviceStatus = async (wss) => {
  try {
    const devices = await getDevicesWithStatus();

    let sent = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(
          JSON.stringify({
            type: "deviceStatus",
            data: visibleTo(client.user, devices),
          }),
        );
        sent += 1;
      }
    });

    console.log(`[DeviceStatus] Broadcasted ${devices.length} devices to ${sent} client(s)`);
  } catch (err) {
    console.error("Device status broadcast error:", err);
  }
};

const broadcastEventLogNotifications = async (wss) => {
  try {
    if (latestEventLogId === null) {
      latestEventLogId = await getLatestEventLogId();
      console.log(`[EventLogNoti] Initial latest LogId: ${latestEventLogId}`);
      return;
    }

    const notifications = await getNewEventLogNotifications(latestEventLogId);

    if (notifications.length === 0) {
      return;
    }

    latestEventLogId = Math.max(
      latestEventLogId,
      ...notifications.map((noti) => noti.id),
    );

    wss.clients.forEach((client) => {
      if (client.readyState !== 1) {
        return;
      }

      // ส่งเฉพาะ notification ใน location ของ client คนนั้น (ข้ามถ้าไม่มีอะไรให้ส่ง)
      const visible = visibleTo(client.user, notifications);
      if (visible.length === 0) {
        return;
      }

      client.send(
        JSON.stringify({
          type: "notification",
          data: visible,
        }),
      );
    });

    console.log(
      `[EventLogNoti] Broadcasted ${notifications.length} new notification(s) to ${wss.clients.size} client(s)`,
    );
  } catch (err) {
    console.error("Event log notification broadcast error:", err);
  }
};

const setupSocket = (wss) => {
  wss.on("connection", async (ws, request) => {
    // ผูก user จาก token เข้ากับ socket ตั้งแต่ handshake เพื่อใช้กรองข้อมูลตาม location
    ws.user = getUserFromRequest(request);
    console.log(`Client connected (user ${ws.user?.userId ?? "anonymous"})`);

    try {
      ws.on("message", (message) => {
        // console.log("WS Msg Received:", message.toString());

        // broadcast
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(message.toString());
          }
        });
      });

      const devices = await getDevicesWithStatus();
      ws.send(
        JSON.stringify({
          type: "deviceStatus",
          data: visibleTo(ws.user, devices),
        }),
      );
    } catch (err) {
      console.error("Initial device status error:", err);
    }

    if (!deviceStatusInterval) {
      deviceStatusInterval = setInterval(() => broadcastDeviceStatus(wss), 3000);
    }

    if (!eventLogNotificationInterval) {
      broadcastEventLogNotifications(wss);
      eventLogNotificationInterval = setInterval(
        () => broadcastEventLogNotifications(wss),
        3000,
      );
    }

    ws.on("close", () => {
      console.log("Client disconnected");

      if (wss.clients.size === 0) {
        if (deviceStatusInterval) {
          clearInterval(deviceStatusInterval);
          deviceStatusInterval = null;
          console.log("⛔ Device status interval cleared (no clients)");
        }

        if (eventLogNotificationInterval) {
          clearInterval(eventLogNotificationInterval);
          eventLogNotificationInterval = null;
          latestEventLogId = null;
          console.log("Event log notification interval cleared (no clients)");
        }
      }
    });
  });
};

module.exports = setupSocket;
