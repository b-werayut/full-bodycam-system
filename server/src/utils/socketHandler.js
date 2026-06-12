const {
  getDevicesWithStatus,
  getLatestEventLogId,
  getNewEventLogNotifications,
} = require("../modules/realtime/socket.service");

let deviceStatusInterval = null;
let eventLogNotificationInterval = null;
let latestEventLogId = null;

const broadcastDeviceStatus = async (wss) => {
  try {
    const devices = await getDevicesWithStatus();

    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(
          JSON.stringify({
            type: "deviceStatus",
            data: devices,
          }),
        );
      }
    });

    console.log(
      `[DeviceStatus] Broadcasted ${devices.length} devices to ${wss.clients.size} client(s)`,
    );
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
      if (client.readyState === 1) {
        client.send(
          JSON.stringify({
            type: "notification",
            data: notifications,
          }),
        );
      }
    });

    console.log(
      `[EventLogNoti] Broadcasted ${notifications.length} new notification(s) to ${wss.clients.size} client(s)`,
    );
  } catch (err) {
    console.error("Event log notification broadcast error:", err);
  }
};

const setupSocket = (wss) => {
  wss.on("connection", async (ws) => {
    console.log("Client connected");

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
          data: devices,
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
