export const isEndTimeBeforeStartTime = (
  startDateTime: string,
  endDateTime: string,
) => {
  if (!startDateTime || !endDateTime) return false;

  const startTime = new Date(startDateTime).getTime();
  const endTime = new Date(endDateTime).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return false;

  return endTime < startTime;
};
