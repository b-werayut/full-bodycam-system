import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { matchesVideoLibrarySearch } from '../src/features/video-library/videoLibrarySearch.ts';
import type { VideoLibrarySqlData } from '../src/features/video-library/types.ts';

const video: VideoLibrarySqlData = {
  id: 'RPT-2026-001',
  reportId: 'RPT-2026-001',
  missionId: '845',
  missionName: 'ตรวจพื้นที่',
  officerId: '1024',
  officerName: 'สมชาย ใจดี',
  startTime: '2026-06-08T10:00:00',
  endTime: '2026-06-08T10:30:00',
  duration: '30 นาที',
  filePath: '',
  location: 'สถานีกลาง',
  isArchived: false,
  cameraCode: 'CAM-7788',
  deviceName: 'Bodycam 12',
};

describe('Video Library search filter', () => {
  it('matches every code shown or associated with a video', () => {
    assert.equal(matchesVideoLibrarySearch(video, 'rpt-2026'), true);
    assert.equal(matchesVideoLibrarySearch(video, '845'), true);
    assert.equal(matchesVideoLibrarySearch(video, 'cam-7788'), true);
    assert.equal(matchesVideoLibrarySearch(video, '1024'), true);
  });

  it('keeps matching the existing descriptive fields', () => {
    assert.equal(matchesVideoLibrarySearch(video, 'ตรวจพื้นที่'), true);
    assert.equal(matchesVideoLibrarySearch(video, 'สมชาย'), true);
    assert.equal(matchesVideoLibrarySearch(video, 'สถานีกลาง'), true);
  });

  it('normalizes whitespace and letter case', () => {
    assert.equal(matchesVideoLibrarySearch(video, '  RPT-2026-001  '), true);
    assert.equal(matchesVideoLibrarySearch(video, 'unknown-code'), false);
  });
});

describe('Video Library filter pagination', () => {
  it('resets to the first page whenever a filter changes', () => {
    const pageSource = readFileSync(
      new URL('../src/pages/VideoLibrary.tsx', import.meta.url),
      'utf8',
    );

    assert.match(
      pageSource,
      /useEffect\(\(\) => \{\s*setCurrentPage\(1\);\s*\}, \[searchQuery, startDate, endDate, selectedOfficer, selectedSpotCheck\]\);/,
    );
  });
});

describe('Video Library filter date validation', () => {
  it('prevents the end date from being earlier than the start date', () => {
    const pageSource = readFileSync(
      new URL('../src/pages/VideoLibrary.tsx', import.meta.url),
      'utf8',
    );

    assert.equal(pageSource.includes('filterDateRangeInvalid'), true);
    assert.equal(pageSource.includes('isFilterEndBeforeStart({ startDate, endDate })'), true);
    assert.equal(pageSource.includes('handleFilterEndDateChange'), true);
    assert.equal(pageSource.includes('End date cannot be earlier than start date'), true);
    assert.equal(pageSource.includes('วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น'), true);
    assert.match(
      pageSource,
      /<input[\s\S]*?type="date"[\s\S]*?value=\{startDate\}[\s\S]*?max=\{endDate \|\| undefined\}/,
    );
    assert.match(
      pageSource,
      /<input[\s\S]*?type="date"[\s\S]*?value=\{endDate\}[\s\S]*?min=\{startDate \|\| undefined\}[\s\S]*?onChange=\{\(e\) => handleFilterEndDateChange\(e\.target\.value\)\}/,
    );
    assert.match(
      pageSource,
      /visibleFilterDateRangeError\s*&&\s*\([\s\S]*?visibleFilterDateRangeError[\s\S]*?<\/p>/,
    );
  });
});
