import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatDownloadDateTime,
  formatDownloadDuration,
} from '../src/lib/videoDownloadSummary.ts';

describe('video download summary', () => {
  it('formats the selected local date and time for Thai and English', () => {
    assert.match(
      formatDownloadDateTime('2026-06-08T13:05:09', 'th'),
      /08.*2026.*13:05:09/,
    );
    assert.match(
      formatDownloadDateTime('2026-06-08T13:05:09', 'en'),
      /Jun.*8.*2026.*01:05:09.*PM/,
    );
  });

  it('formats the complete elapsed download duration', () => {
    assert.equal(
      formatDownloadDuration('2026-06-08T13:00:00', '2026-06-08T14:02:03', 'th'),
      '1 ชั่วโมง 2 นาที 3 วินาที',
    );
    assert.equal(
      formatDownloadDuration('2026-06-08T13:00:00', '2026-06-08T14:02:03', 'en'),
      '1 hr 2 min 3 sec',
    );
  });

  it('supports ranges spanning multiple days', () => {
    assert.equal(
      formatDownloadDuration('2026-06-08T13:00:00', '2026-06-10T15:30:00', 'en'),
      '2 days 2 hr 30 min',
    );
  });

  it('returns a placeholder for missing or invalid ranges', () => {
    assert.equal(formatDownloadDateTime('', 'th'), '-');
    assert.equal(formatDownloadDuration('', '2026-06-08T14:00:00', 'th'), '-');
    assert.equal(
      formatDownloadDuration('2026-06-08T15:00:00', '2026-06-08T14:00:00', 'th'),
      '-',
    );
  });
});
