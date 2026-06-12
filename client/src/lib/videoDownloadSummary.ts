export type VideoDownloadSummaryLanguage = 'th' | 'en';

const parseDateTime = (value: string) => {
  if (!value) return null;

  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDownloadDateTime = (
  value: string,
  language: VideoDownloadSummaryLanguage,
) => {
  const date = parseDateTime(value);
  if (!date) return '-';

  return date.toLocaleString(language === 'th' ? 'th-TH' : 'en-US', {
    calendar: 'gregory',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const formatDownloadDuration = (
  startValue: string,
  endValue: string,
  language: VideoDownloadSummaryLanguage,
) => {
  const startDate = parseDateTime(startValue);
  const endDate = parseDateTime(endValue);
  if (!startDate || !endDate || endDate < startDate) return '-';

  let remainingSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
  const days = Math.floor(remainingSeconds / 86_400);
  remainingSeconds %= 86_400;
  const hours = Math.floor(remainingSeconds / 3_600);
  remainingSeconds %= 3_600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  if (language === 'th') {
    const parts = [
      days > 0 ? `${days} วัน` : '',
      hours > 0 ? `${hours} ชั่วโมง` : '',
      minutes > 0 ? `${minutes} นาที` : '',
      seconds > 0 || (days === 0 && hours === 0 && minutes === 0)
        ? `${seconds} วินาที`
        : '',
    ];

    return parts.filter(Boolean).join(' ');
  }

  const parts = [
    days > 0 ? `${days} ${days === 1 ? 'day' : 'days'}` : '',
    hours > 0 ? `${hours} hr` : '',
    minutes > 0 ? `${minutes} min` : '',
    seconds > 0 || (days === 0 && hours === 0 && minutes === 0)
      ? `${seconds} sec`
      : '',
  ];

  return parts.filter(Boolean).join(' ');
};
