import { isEndTimeBeforeStartTime } from '../../lib/videoPlaybackTimeValidation.ts';

interface MissionTimeRange {
  startTime: string;
  endTime: string;
}

export function isMissionEndTimeBeforeStartTime({
  startTime,
  endTime,
}: MissionTimeRange) {
  return isEndTimeBeforeStartTime(startTime, endTime);
}

// True when the mission's scheduled start time is still in the future relative
// to `now` — i.e. the job is being accepted before it is supposed to begin.
export function isMissionStartTimeInFuture(
  startTime: string,
  now: Date = new Date(),
) {
  if (!startTime) return false;

  const start = new Date(startTime).getTime();
  if (Number.isNaN(start)) return false;

  return start > now.getTime();
}

// True when the mission's scheduled end time is already in the past relative to
// `now` — i.e. the job is being accepted after its time window has fully closed.
// An empty end time (open-ended job) is never considered past.
export function isMissionEndTimePassed(
  endTime: string | undefined,
  now: Date = new Date(),
) {
  if (!endTime) return false;

  const end = new Date(endTime).getTime();
  if (Number.isNaN(end)) return false;

  return end < now.getTime();
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

// Formats a Date as a `datetime-local` input value (YYYY-MM-DDTHH:mm) in local
// time.
function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Earliest start a brand-new mission may be scheduled for: the start of today.
// Used as the `min` for the create form's start-time picker — any time today and
// any future day are allowed, but past days are not.
export function getMinMissionStartDateTime(now: Date = new Date()) {
  return toDateTimeLocalValue(startOfDay(now));
}

// True when a new mission's start day is before today — i.e. the user is trying
// to backdate a work order to a day that has already passed. The time of day is
// ignored to match the day-level granularity of the picker's `min`; an empty or
// invalid value defers to the required-field validation instead.
export function isMissionStartDateInPast(
  startTime: string,
  now: Date = new Date(),
) {
  if (!startTime) return false;

  const start = new Date(startTime).getTime();
  if (Number.isNaN(start)) return false;

  return start < startOfDay(now).getTime();
}
