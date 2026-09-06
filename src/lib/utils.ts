// Utility functions for Persian formatting, numerals, and date handling

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/**
 * Converts English and Arabic numbers in a string or number to Persian numerals
 */
export function toPersianDigits(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return "";
  const str = input.toString();
  return str
    .replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w])
    .replace(/[٠-٩]/g, (w) => PERSIAN_DIGITS[ARABIC_DIGITS.indexOf(w)]);
}

/**
 * Formats a number with commas and converts to Persian digits (e.g. 10000 -> ۱۰٬۰۰۰)
 */
export function formatPersianNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return "۰";
  const formatted = num.toLocaleString("en-US");
  return toPersianDigits(formatted.replace(/,/g, "٬"));
}

/**
 * Get current Tehran date string in YYYY-MM-DD format.
 * `resetHour` shifts the day boundary: with resetHour=3, the "campaign day"
 * runs 03:00→03:00 Tehran time (e.g. 01:30 belongs to the previous day).
 */
export function getTehranDateString(date: Date = new Date(), resetHour = 0): string {
  const shifted = new Date(date.getTime() - resetHour * 60 * 60 * 1000);
  const tehranDateStr = shifted.toLocaleDateString("en-CA", {
    timeZone: "Asia/Tehran",
  });
  return tehranDateStr; // Returns YYYY-MM-DD
}

/**
 * Calculate difference in calendar days between two YYYY-MM-DD dates
 */
export function getDaysDifference(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split("-").map(Number);
  const [y2, m2, d2] = toYmd.split("-").map(Number);

  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);

  const diffMs = utc2 - utc1;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format date in Persian text (e.g. "۱۵ شهریور ۱۴۰۵")
 */
export function formatJalaliDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "full",
    timeZone: "Asia/Tehran",
  }).format(d);
}

/**
 * Format short Jalali date (e.g. "۱۵ شهریور")
 */
export function formatShortJalaliDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  return new Intl.DateTimeFormat("fa-IR", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tehran",
  }).format(d);
}

/**
 * Format time in Tehran timezone (e.g. "۲۰:۳۵")
 */
export function formatTehranTime(timestamp: number): string {
  const d = new Date(timestamp);
  return toPersianDigits(
    d.toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tehran",
    })
  );
}

/**
 * Generates a clean random UUID for idempotency
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
