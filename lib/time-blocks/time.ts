export const TIME_BLOCK_STEP_MINUTES = 15;
export const DEFAULT_VISIBLE_START_MINUTES = 6 * 60;
export const DEFAULT_VISIBLE_END_MINUTES = 22 * 60;

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

type LocalDateTimeParts = {
  date: string;
  minutes: number;
  time: string;
};

function getDateParts(value: string) {
  const match = value.match(datePattern);

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { day, month, year };
}

function getTimeParts(value: string) {
  const match = value.match(timePattern);

  if (!match) {
    return null;
  }

  const [, hourText, minuteText] = match;
  return {
    hour: Number(hourText),
    minute: Number(minuteText),
  };
}

function padTimePart(value: number) {
  return value.toString().padStart(2, "0");
}

function getOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = Number(values.get("year"));
  const month = Number(values.get("month"));
  const day = Number(values.get("day"));
  const hour = Number(values.get("hour"));
  const minute = Number(values.get("minute"));
  const second = Number(values.get("second"));

  return Date.UTC(year, month - 1, day, hour, minute, second) - date.getTime();
}

export function isValidIsoDate(value: string) {
  return getDateParts(value) !== null;
}

export function isValidTimeInput(value: string) {
  return getTimeParts(value) !== null;
}

export function parseTimeToMinutes(value: string) {
  const parts = getTimeParts(value);

  if (!parts) {
    return null;
  }

  return parts.hour * 60 + parts.minute;
}

export function minutesToTimeInput(minutes: number) {
  const normalizedMinutes = Math.max(0, Math.min(1439, minutes));
  const hour = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;

  return `${padTimePart(hour)}:${padTimePart(minute)}`;
}

export function addDaysToIsoDate(date: string, days: number) {
  const parts = getDateParts(date);

  if (!parts) {
    return null;
  }

  const nextDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return nextDate.toISOString().slice(0, 10);
}

export function localDateTimeToUtcIso(
  localDate: string,
  localTime: string,
  timeZone: string,
) {
  const dateParts = getDateParts(localDate);
  const timeParts = getTimeParts(localTime);

  if (!dateParts || !timeParts) {
    return null;
  }

  const utcGuess = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
  );
  const firstOffset = getOffsetMs(new Date(utcGuess), timeZone);
  let utcValue = utcGuess - firstOffset;
  const secondOffset = getOffsetMs(new Date(utcValue), timeZone);

  if (secondOffset !== firstOffset) {
    utcValue = utcGuess - secondOffset;
  }

  return new Date(utcValue).toISOString();
}

export function getLocalDayRange(localDate: string, timeZone: string) {
  const nextDate = addDaysToIsoDate(localDate, 1);

  if (!nextDate) {
    return null;
  }

  const startAt = localDateTimeToUtcIso(localDate, "00:00", timeZone);
  const endAt = localDateTimeToUtcIso(nextDate, "00:00", timeZone);

  if (!startAt || !endAt) {
    return null;
  }

  return { endAt, startAt };
}

export function getLocalDateTimeParts(
  value: string,
  timeZone: string,
): LocalDateTimeParts {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year") ?? "0000";
  const month = values.get("month") ?? "01";
  const day = values.get("day") ?? "01";
  const hour = values.get("hour") ?? "00";
  const minute = values.get("minute") ?? "00";
  const time = `${hour}:${minute}`;

  return {
    date: `${year}-${month}-${day}`,
    minutes: Number(hour) * 60 + Number(minute),
    time,
  };
}

export function getBlockDurationMinutes(startAt: string, endAt: string) {
  return Math.max(
    0,
    Math.round(
      (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000,
    ),
  );
}
