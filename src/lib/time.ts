const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTimeString(value: string) {
  return timePattern.test(value);
}

export function toDateOnly(value: string | Date) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export function parseTimeToMinutes(time: string) {
  if (!isTimeString(time)) {
    throw new Error("Time must use HH:mm format.");
  }

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number) {
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function addMinutes(time: string, minutes: number) {
  return minutesToTime(parseTimeToMinutes(time) + minutes);
}

export function addDaysToDateString(date: string, days: number) {
  const nextDate = toDateOnly(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

export function isQuarterHour(time: string) {
  return parseTimeToMinutes(time) % 15 === 0;
}

export function assertValidTimeRange(startTime: string, endTime: string) {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start >= end) {
    throw new Error("End time must be after start time.");
  }
}

export function overlaps(
  existingStart: string,
  existingEnd: string,
  nextStart: string,
  nextEnd: string
) {
  assertValidTimeRange(existingStart, existingEnd);
  assertValidTimeRange(nextStart, nextEnd);

  return existingStart < nextEnd && existingEnd > nextStart;
}

export function getDayKey(date: string) {
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC"
  })
    .format(new Date(`${date}T12:00:00.000Z`))
    .toLowerCase();

  return day as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
}

export function getZonedDateTimeParts(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute"))
  };
}
