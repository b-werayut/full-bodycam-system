import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const modalSource = readFileSync(
  new URL('../src/components/modals/VideoLibraryModal.tsx', import.meta.url),
  'utf8',
);

describe('VideoLibraryModal recording search behavior', () => {
  it('loads available recordings on modal open without tying the effect to the days-back input', () => {
    const resetEffect = modalSource.match(
      /\/\/ Reset states when modal opens with new video[\s\S]*?useEffect\(\(\) => \{([\s\S]*?)\n[ ]{2}\}, \[([^\]]*)\]\);/,
    );

    assert.notEqual(resetEffect, null);
    const [, resetEffectBody, resetEffectDeps] = resetEffect;

    assert.equal(resetEffectBody.includes('fetchRecordingRanges('), true);
    assert.equal(resetEffectDeps.includes('recordingDaysBack'), false);
    assert.equal(resetEffectDeps.includes('fetchRecordingRanges'), true);
  });

  it('does not load available recordings from the days-back input change handler', () => {
    const daysBackChangeHandler = modalSource.match(
      /const handleRecordingDaysBackChange = \(value: string\) => \{([\s\S]*?)\n[ ]{2}\};/,
    );

    assert.notEqual(daysBackChangeHandler, null);
    assert.equal(daysBackChangeHandler[1].includes('fetchRecordingRanges('), false);
    assert.equal(daysBackChangeHandler[1].includes('recordingSearchRequestIdRef.current += 1'), true);
    assert.equal(daysBackChangeHandler[1].includes('setRecordingRanges([])'), true);
    assert.equal(daysBackChangeHandler[1].includes('setRecordingLoading(false)'), true);
    assert.equal(daysBackChangeHandler[1].includes('setRecordingSearchPerformed(false)'), true);
  });

  it('ignores a pending recording search when the days-back input is edited', () => {
    assert.equal(modalSource.includes('recordingSearchRequestIdRef'), true);
    assert.match(
      modalSource,
      /const searchRequestId = recordingSearchRequestIdRef\.current \+ 1;/,
    );
    assert.match(
      modalSource,
      /recordingSearchRequestIdRef\.current !== searchRequestId[\s\S]*?return;/,
    );
  });

  it('shows the empty recording result only after the user presses search', () => {
    assert.equal(modalSource.includes('recordingSearchPerformed'), true);
    assert.match(
      modalSource,
      /recordingSearchPerformed\s*\?\s*\([\s\S]*?No recordings found in the last/,
    );
  });

  it('renders available recordings as a separate card before download actions', () => {
    const recordingCardIndex = modalSource.indexOf('Available Recordings Card');
    const downloadSectionIndex = modalSource.indexOf('Download Section');

    assert.notEqual(recordingCardIndex, -1);
    assert.notEqual(downloadSectionIndex, -1);
    assert.equal(recordingCardIndex < downloadSectionIndex, true);
  });

  it('shows the officer name without the officer ID', () => {
    assert.equal(modalSource.includes('{video.officerId} {video.officerName}'), false);
    assert.equal(modalSource.includes("{video.officerName || '-'}"), true);
  });
});
