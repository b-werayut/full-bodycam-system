import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildMissionActionPayload } from '../src/features/spot-check/missionActionPayload.ts';

describe('mission action payload', () => {
  it('sends deviceCode when confirming a mission', () => {
    const payload = buildMissionActionPayload({
      reportId: 'INT-F04586',
      cameraId: 'Body-Camera',
      deviceCode: 'BC-0001',
    });

    assert.deepEqual(payload, {
      reportId: 'INT-F04586',
      deviceCode: 'BC-0001',
    });
    assert.equal('deviceName' in payload, false);
  });
});
