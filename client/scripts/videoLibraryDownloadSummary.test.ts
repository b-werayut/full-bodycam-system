import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const modalSource = readFileSync(
  new URL('../src/components/modals/VideoLibraryModal.tsx', import.meta.url),
  'utf8',
);

describe('VideoLibraryModal download summary', () => {
  it('shows the selected start, end, and total duration before download', () => {
    assert.equal(modalSource.includes('formatDownloadDateTime'), true);
    assert.equal(modalSource.includes('formatDownloadDuration'), true);
    assert.equal(modalSource.includes('สรุปช่วงดาวน์โหลด'), true);
    assert.equal(modalSource.includes('Download Summary'), true);
    assert.equal(modalSource.includes('วันที่และเวลาเริ่มต้น'), true);
    assert.equal(modalSource.includes('วันที่และเวลาสิ้นสุด'), true);
    assert.equal(modalSource.includes('ระยะเวลารวม'), true);
    assert.equal(modalSource.includes('{downloadStartLabel}'), true);
    assert.equal(modalSource.includes('{downloadEndLabel}'), true);
    assert.equal(modalSource.includes('{downloadDurationLabel}'), true);
  });

  it('places the start and end date-time values on the same row', () => {
    assert.match(
      modalSource,
      /<dl className="grid grid-cols-2 gap-x-4 gap-y-3">[\s\S]*?downloadStartLabel[\s\S]*?downloadEndLabel/,
    );
    assert.match(
      modalSource,
      /className=\{`col-span-2 flex items-end justify-between/,
    );
  });
});
