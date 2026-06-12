export interface FilterDateRangeValue {
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

const normalizeTime = (value: string | null | undefined, fallback: string) => {
  if (!value) return fallback;
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  return fallback;
};

const toDateTime = (
  date: string | null | undefined,
  time: string | null | undefined,
  boundary: 'start' | 'end',
) => {
  if (!date) return null;

  const fallbackTime = boundary === 'start' ? '00:00:00' : '23:59:59';
  const timestamp = new Date(`${date}T${normalizeTime(time, fallbackTime)}`).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
};

export function isFilterEndBeforeStart({
  startDate,
  endDate,
  startTime,
  endTime,
}: FilterDateRangeValue) {
  const effectiveStartDate = startDate || endDate;
  const effectiveEndDate = endDate || startDate;

  if (!effectiveStartDate || !effectiveEndDate) return false;

  const start = toDateTime(effectiveStartDate, startTime, 'start');
  const end = toDateTime(effectiveEndDate, endTime, 'end');

  return start !== null && end !== null && end < start;
}
