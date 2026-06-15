const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

const p1001 = new Error("Can't reach database server");
p1001.code = "P1001";

const fakePrisma = {
  eventLog: {
    findMany: async () => [
      {
        LogId: 1,
        TypeKey: "emergency",
        OfficerName: "System",
        EventTime: new Date("2026-05-29T10:00:00.000Z"),
        Severity: "WARNING",
        LocationName: "Station",
        Details: "อุปกรณ์ BodyCam 001 (CAM-001) online | ReportId: EMER-001",
        IsRead: false,
      },
    ],
  },
  missions: {
    findFirst: async () => {
      throw p1001;
    },
    findMany: async () => {
      throw p1001;
    },
  },
};

require.cache[prismaModulePath] = {
  id: prismaModulePath,
  filename: prismaModulePath,
  loaded: true,
  exports: { prisma: fakePrisma },
};

const { getEventLogs } = require("../src/modules/internal-api/eventLogs.controller");

(async () => {
  let statusCode = null;
  let body = null;
  const req = { query: {} };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  await getEventLogs(req, res);

  assert.strictEqual(statusCode, 200);
  assert.ok(Array.isArray(body));
  assert.strictEqual(body.length, 1);
  assert.strictEqual(body[0].mission, null);

  console.log("smoke-event-logs-mission-lookup-failure-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
