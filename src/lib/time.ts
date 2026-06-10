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
