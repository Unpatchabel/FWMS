/**
 * Small date-range helpers shared by services that need calendar-month
 * boundaries. Kept dependency-free (no date-fns) since it's just two dates.
 */

/** [start, end) for the calendar month containing `ref` (end is exclusive). */
export function monthRange(ref: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  return { start, end };
}

/** The same range shifted back one calendar month. */
export function previousMonthRange(ref: Date = new Date()): {
  start: Date;
  end: Date;
} {
  return monthRange(new Date(ref.getFullYear(), ref.getMonth() - 1, 1));
}

/**
 * Parse a "yyyy-mm-dd" form value into a Date at local noon. Using noon
 * (rather than midnight) avoids the date silently shifting a day backward
 * when later formatted/displayed in a timezone behind UTC.
 */
export function parseFormDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`);
}
