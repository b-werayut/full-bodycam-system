const assert = require("assert");
const path = require("path");

const serverRoot = path.resolve(__dirname, "..");
const prismaModulePath = path.join(serverRoot, "src", "lib", "prisma.js");

let overlapFindArgs = null;
let locationFindArgs = null;

const fakePrisma = {
  missions: {
    findFirst: async (args) => {
      overlapFindArgs = args;

      if (args.include?.Location) {
        throw new Error("Unknown field `Location` for include statement on model `Missions`");
      }

      return {
        ReportId: "INT-EXISTING",
        StartTime: new Date("2026-06-06T18:45:00.000Z"),
        EndTime: new Date("2026-06-06T19:45:00.000Z"),
        DeviceCode: "1000097",
        Devices: {
          DeviceName: "Bodycam 1000097",
        },
        OfficerId: 1,
        LocationCode: "LOC-001",
      };
    },
    create: async () => {
      throw new Error("overlapping mission must not be created");
    },
  },
  location: {
    findUnique: async (args) => {
      locationFindArgs = args;
      return {
        LocationName: "Bangkok Central",
      };
    },
  },
};

require.cache[prismaModulePath] = {
  id: prismaModulePath,
  filename: prismaModulePath,
  loaded: true,
  exports: { prisma: fakePrisma },
};

const { createMission } = require("../src/modules/internal-api/missions.service");

(async () => {
  const response = await createMission({
    reportId: "INT-439B97",
    missionName: "test overlap",
    startTime: "2026-06-06T18:58:00.000Z",
    endTime: "2026-06-06T19:58:00.000Z",
    officerId: 1,
    deviceCode: "1000097",
  });

  assert.strictEqual(response.statusCode, 409);
  assert.strictEqual(overlapFindArgs.include.Location, undefined);
  assert.deepStrictEqual(locationFindArgs, {
    where: { LocationCode: "LOC-001" },
    select: { LocationName: true },
  });
  assert.strictEqual(response.body.data.locationName, "Bangkok Central");

  console.log("smoke-mission-overlap-location-compat-ok");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
