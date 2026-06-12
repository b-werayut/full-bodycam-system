import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getMinMissionStartDateTime,
  isMissionEndTimeBeforeStartTime,
  isMissionStartDateInPast,
} from '../src/features/spot-check/missionTimeValidation.ts';

describe('mission time validation', () => {
  it('detects an end time before the start time', () => {
    assert.equal(
      isMissionEndTimeBeforeStartTime({
        startTime: '2026-06-08T10:30',
        endTime: '2026-06-08T10:29',
      }),
      true,
    );
  });

  it('allows an end time equal to or after the start time', () => {
    assert.equal(
      isMissionEndTimeBeforeStartTime({
        startTime: '2026-06-08T10:30',
        endTime: '2026-06-08T10:30',
      }),
      false,
    );
    assert.equal(
      isMissionEndTimeBeforeStartTime({
        startTime: '2026-06-08T10:30',
        endTime: '2026-06-08T10:31',
      }),
      false,
    );
  });

  it('does not replace required-field validation for missing values', () => {
    assert.equal(
      isMissionEndTimeBeforeStartTime({
        startTime: '',
        endTime: '2026-06-08T10:31',
      }),
      false,
    );
    assert.equal(
      isMissionEndTimeBeforeStartTime({
        startTime: '2026-06-08T10:30',
        endTime: '',
      }),
      false,
    );
  });
});

describe('new mission start date guard', () => {
  const now = new Date('2026-06-10T14:30:00');

  it('flags a start on an earlier day as backdated', () => {
    assert.equal(isMissionStartDateInPast('2026-06-09T23:59', now), true);
    assert.equal(isMissionStartDateInPast('2026-06-01T08:00', now), true);
  });

  it('allows any time today, even earlier than the current moment', () => {
    assert.equal(isMissionStartDateInPast('2026-06-10T00:00', now), false);
    assert.equal(isMissionStartDateInPast('2026-06-10T08:00', now), false);
    assert.equal(isMissionStartDateInPast('2026-06-10T23:59', now), false);
  });

  it('allows future days', () => {
    assert.equal(isMissionStartDateInPast('2026-06-11T00:00', now), false);
  });

  it('defers empty or invalid values to required-field validation', () => {
    assert.equal(isMissionStartDateInPast('', now), false);
    assert.equal(isMissionStartDateInPast('not-a-date', now), false);
  });

  it('exposes the start of today as the minimum selectable start', () => {
    assert.equal(getMinMissionStartDateTime(now), '2026-06-10T00:00');
  });
});
