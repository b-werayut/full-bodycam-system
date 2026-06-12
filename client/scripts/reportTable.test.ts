import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  buildReportDeleteRequest,
  buildReportDeleteSuccessAlert,
  buildReportFilterDateRangeAlert,
  isReportFilterEndBeforeStart,
  sortReportsByLatestTime,
} from '../src/features/reports/reportTable.ts';

const videoLibrarySource = readFileSync(
  new URL('../src/pages/VideoLibrary.tsx', import.meta.url),
  'utf8',
);

const spotCheckSource = readFileSync(
  new URL('../src/pages/SpotCheck.tsx', import.meta.url),
  'utf8',
);

describe('report table helpers', () => {
  it('sorts reports by latest start time and keeps invalid dates last', () => {
    const reports = [
      { reportId: 'REP-002', startTime: 'not-a-date' },
      { reportId: 'REP-001', startTime: '2026-06-08T09:30:00' },
      { reportId: 'REP-003', startTime: '2026-06-08T15:45:00' },
    ];

    const sorted = [...reports].sort(sortReportsByLatestTime);

    assert.deepEqual(
      sorted.map((report) => report.reportId),
      ['REP-003', 'REP-001', 'REP-002'],
    );
  });

  it('sorts the video library data table by latest start time before pagination', () => {
    assert.match(videoLibrarySource, /sortReportsByLatestTime/);
    assert.match(videoLibrarySource, /setVideos\(\[\.\.\.mapped\]\.sort\(sortReportsByLatestTime\)\);/);
    assert.match(videoLibrarySource, /videos\.filter\([\s\S]*?\)\.sort\(sortReportsByLatestTime\);/);
  });

  it('sorts the spot check data table by latest start time before pagination', () => {
    assert.match(spotCheckSource, /sortReportsByLatestTime/);
    assert.match(spotCheckSource, /\}\)\.sort\(sortReportsByLatestTime\);[\s\S]*?setSpotCheckData\(mapped\);/);
    assert.match(spotCheckSource, /spotCheckData\.filter\([\s\S]*?\)\.sort\(sortReportsByLatestTime\);/);
  });

  it('builds the cancelled-report delete request expected by the API', () => {
    const request = buildReportDeleteRequest({
      reportId: 'REP-004',
      missionStatus: '4',
      deviceCode: 'BC-0004',
    });

    assert.deepEqual(request, {
      endpoint: '/deletecancelledmission',
      payload: { reportId: 'REP-004' },
    });
  });

  it('builds the active-report delete request with device identity when available', () => {
    const request = buildReportDeleteRequest({
      reportId: 'REP-005',
      missionStatus: '2',
      deviceCode: 'BC-0005',
      deviceName: 'Body Camera 5',
    });

    assert.deepEqual(request, {
      endpoint: '/deletemission',
      payload: {
        reportId: 'REP-005',
        deviceCode: 'BC-0005',
      },
    });
  });

  it('builds a localized SweetAlert success message for deleted reports', () => {
    const alert = buildReportDeleteSuccessAlert(
      { reportId: 'REP-<006>' },
      'en',
      'Deleted <ok>',
    );

    assert.equal(alert.icon, 'success');
    assert.equal(alert.confirmButtonText, 'OK');
    assert.match(alert.title, /Report deleted successfully/);
    assert.match(alert.html, /Deleted &lt;ok&gt;/);
    assert.match(alert.html, /REP-&lt;006&gt;/);
  });

  it('detects report filter date ranges where end date is before start date', () => {
    assert.equal(isReportFilterEndBeforeStart('2026-06-08', '2026-06-07'), true);
    assert.equal(isReportFilterEndBeforeStart('2026-06-08', '2026-06-08'), false);
    assert.equal(isReportFilterEndBeforeStart('', '2026-06-07'), false);
    assert.equal(isReportFilterEndBeforeStart('2026-06-08', ''), false);
  });

  it('builds a localized alert for invalid report filter date ranges', () => {
    const alert = buildReportFilterDateRangeAlert('en');

    assert.equal(alert.icon, 'warning');
    assert.match(alert.title, /Invalid date range/);
    assert.match(alert.text, /End date cannot be earlier than start date/);
  });
});
