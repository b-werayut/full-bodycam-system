import type { VideoLibrarySqlData } from './types';

export const matchesVideoLibrarySearch = (
  video: VideoLibrarySqlData,
  searchQuery: string,
) => {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  const searchableValues = [
    video.reportId,
    video.id,
    video.missionId,
    video.cameraCode,
    video.officerId,
    video.missionName,
    video.officerName,
    video.location,
  ];

  return searchableValues.some((value) =>
    String(value ?? '').toLocaleLowerCase().includes(normalizedQuery),
  );
};
