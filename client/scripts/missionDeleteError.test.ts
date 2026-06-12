import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { localizeMissionDeleteError } from '../src/features/missionDeleteError.ts';

describe('mission delete error localization', () => {
  it('translates the "device active" message to Thai with the device name kept', () => {
    assert.equal(
      localizeMissionDeleteError('Device Body-Camera is currently active, cannot delete mission', 'th'),
      'ไม่สามารถลบใบงานได้ เนื่องจากอุปกรณ์ Body-Camera กำลังถูกใช้งานอยู่',
    );
  });

  it('keeps the "device active" message in English when language is en', () => {
    assert.equal(
      localizeMissionDeleteError('Device BC-0001 is currently active, cannot delete mission', 'en'),
      'Cannot delete this mission because device BC-0001 is currently active.',
    );
  });

  it('falls back to a generic localized message when there is no server text', () => {
    assert.equal(localizeMissionDeleteError(undefined, 'th'), 'ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    assert.equal(localizeMissionDeleteError('', 'en'), 'Unable to delete. Please try again.');
  });

  it('surfaces unknown server messages unchanged', () => {
    assert.equal(localizeMissionDeleteError('Mission not found', 'th'), 'Mission not found');
  });
});
