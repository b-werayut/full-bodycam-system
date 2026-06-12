import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const modalSource = readFileSync(
  new URL('../src/components/modals/VideoLibraryModal.tsx', import.meta.url),
  'utf8',
);

describe('VideoLibraryModal time warning copy', () => {
  it('renders end-before-start warning inline under the end time input only', () => {
    assert.equal(modalSource.includes('timeRangeOrderErrorMessage'), true);
    assert.equal(modalSource.includes('End time cannot be earlier than start time'), true);
    assert.equal(modalSource.includes('เวลาสิ้นสุดต้องไม่น้อยกว่าเวลาเริ่มต้น'), true);
    assert.equal(modalSource.includes('setPlaybackError(timeRangeOrderErrorMessage)'), false);
    assert.equal(modalSource.includes('setDownloadError(timeRangeOrderErrorMessage)'), false);
    assert.match(
      modalSource,
      /playbackTimeRangeInvalid\s*&&\s*\(\s*<p className="mt-1\.5 text-xs font-medium text-red-500">[\s\S]*?timeRangeOrderErrorMessage[\s\S]*?<\/p>/,
    );
  });
});
