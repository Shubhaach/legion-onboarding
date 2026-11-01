// Date helpers. All visit times are in America/Chicago (Central time).
export const TZ = "America/Chicago";

interface YMD {
  y: number;
  m: number; // 1-12
  d: number;
}

export function chicagoToday(now = Date.now()): YMD {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Offset (ms) of Chicago local time from UTC at instant t. */
function chicagoOffset(t: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(t));
  const get = (k: string) => Number(parts.find((p) => p.type === k)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(t / 1000) * 1000;
}

/** UTC instant for a Chicago wall-clock time, `dayOffset` days from today in Chicago. */
export function slotInstant(dayOffset: number, hhmm: string, now = Date.now()): number {
  const { y, m, d } = chicagoToday(now);
  const [hh, mm] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d + dayOffset, hh, mm);
  let t = guess - chicagoOffset(guess);
  t = guess - chicagoOffset(t); // second pass handles DST edges
  return t;
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...opts });

export function dayParts(dayOffset: number, now = Date.now()) {
  const t = slotInstant(dayOffset, "12:00", now);
  return {
    weekday: fmt({ weekday: "short" }).format(t),
    weekdayLong: fmt({ weekday: "long" }).format(t),
    monthDay: fmt({ month: "short", day: "numeric" }).format(t),
  };
}

export function timeLabel(hhmm: string): string {
  const [hh, mm] = hhmm.split(":").map(Number);
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
}

/** e.g. "Tue, Nov 3 · 6:00 PM" */
export function slotLabel(iso: number): string {
  return `${fmt({ weekday: "short", month: "short", day: "numeric" }).format(iso)} · ${fmt({
    hour: "numeric",
    minute: "2-digit",
  }).format(iso)}`;
}

/** e.g. "Tuesday, Nov 3 at 6:00 PM" */
export function slotLong(iso: number): string {
  return `${fmt({ weekday: "long", month: "short", day: "numeric" }).format(iso)} at ${fmt({
    hour: "numeric",
    minute: "2-digit",
  }).format(iso)}`;
}

export function monthYearDaysAgo(days: number, now = Date.now()): string {
  return fmt({ month: "short", year: "numeric" }).format(now - days * 86400000);
}
