import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { isFilterEndBeforeStart } from '../src/features/dateRangeValidation.ts';

const spotCheckFiltersSource = readFileSync(
  new URL('../src/components/ui/SpotCheckFilters.tsx', import.meta.url),
  'utf8',
);

const reportsSource = readFileSync(
  new URL('../src/pages/Reports.tsx', import.meta.url),
  'utf8',
);

const videoLibrarySource = readFileSync(
  new URL('../src/pages/VideoLibrary.tsx', import.meta.url),
  'utf8',
);

const dashboardSource = readFileSync(
  new URL('../src/pages/Dashboard.tsx', import.meta.url),
  'utf8',
);

describe('filter date range validation', () => {
  it('detects an end date before the start date', () => {
    assert.equal(
      isFilterEndBeforeStart({
        startDate: '2026-06-08',
        endDate: '2026-06-07',
      }),
      true,
    );
  });

  it('allows an equal or later end date', () => {
    assert.equal(
      isFilterEndBeforeStart({
        startDate: '2026-06-08',
        endDate: '2026-06-08',
      }),
      false,
    );
    assert.equal(
      isFilterEndBeforeStart({
        startDate: '2026-06-08',
        endDate: '2026-06-09',
      }),
      false,
    );
  });

  it('detects an end time before the start time on the same filter date', () => {
    assert.equal(
      isFilterEndBeforeStart({
        startDate: '2026-06-08',
        endDate: '2026-06-08',
        startTime: '10:30',
        endTime: '10:29',
      }),
      true,
    );
  });

  it('uses the selected date for both sides when only one filter date is provided', () => {
    assert.equal(
      isFilterEndBeforeStart({
        startDate: '2026-06-08',
        startTime: '10:30',
        endTime: '10:29',
      }),
      true,
    );
  });

  it('wires date filters with min and max guards', () => {
    assert.match(spotCheckFiltersSource, /max=\{endDate \|\| undefined\}/);
    assert.match(spotCheckFiltersSource, /min=\{startDate \|\| undefined\}/);
    assert.match(reportsSource, /max=\{endDate \|\| undefined\}/);
    assert.match(reportsSource, /min=\{startDate \|\| undefined\}/);
    assert.match(videoLibrarySource, /max=\{endDate \|\| undefined\}/);
    assert.match(videoLibrarySource, /min=\{startDate \|\| undefined\}/);
  });

  it('wires dashboard date and time filters through the shared range validation', () => {
    assert.match(dashboardSource, /handleAlertEndTimeChange/);
    assert.match(dashboardSource, /isFilterEndBeforeStart\(\{[\s\S]*endTime: value/);
    assert.match(dashboardSource, /max=\{alertEndDate \|\| undefined\}/);
    assert.match(dashboardSource, /min=\{alertStartDate \|\| undefined\}/);
  });
});
