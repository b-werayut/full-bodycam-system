import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isEndTimeBeforeStartTime } from '../src/lib/videoPlaybackTimeValidation.ts';

describe('video playback time validation', () => {
  it('detects an end time before the start time', () => {
    assert.equal(
      isEndTimeBeforeStartTime('2026-06-04T10:30', '2026-06-04T10:29'),
      true,
    );
    assert.equal(
      isEndTimeBeforeStartTime('2026-06-04T00:00', '2026-06-03T23:59'),
      true,
    );
  });

  it('allows an end time equal to or after the start time', () => {
    assert.equal(
      isEndTimeBeforeStartTime('2026-06-04T10:30', '2026-06-04T10:30'),
      false,
    );
    assert.equal(
      isEndTimeBeforeStartTime('2026-06-04T10:30', '2026-06-04T10:31'),
      false,
    );
  });

  it('does not replace required-field validation for missing values', () => {
    assert.equal(isEndTimeBeforeStartTime('', '2026-06-04T10:30'), false);
    assert.equal(isEndTimeBeforeStartTime('2026-06-04T10:30', ''), false);
  });

  it('supports date-only filter values', () => {
    assert.equal(
      isEndTimeBeforeStartTime('2026-06-04', '2026-06-03'),
      true,
    );
    assert.equal(
      isEndTimeBeforeStartTime('2026-06-04', '2026-06-04'),
      false,
    );
  });
});
