/**
 * Display helpers for dates in the backoffice.
 * Storage / `<input type="date">` values stay as YYYY-MM-DD (or ISO).
 * Visible text uses dd/mm/yyyy.
 */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Format a date-only or ISO string as dd/mm/yyyy. Empty → "—". */
export function formatDateDisplay(
  value: string | null | undefined,
  emptyLabel = "—",
): string {
  if (!value) return emptyLabel;

  const dateOnly = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}/${mm}/${yyyy}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}

/** Format a datetime as dd/mm/yyyy HH:mm. Empty → "—". */
export function formatDateTimeDisplay(
  value: string | null | undefined,
  emptyLabel = "—",
): string {
  if (!value) return emptyLabel;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return formatDateDisplay(value, emptyLabel);
  }

  const date = `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
  const time = `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
  return `${date} ${time}`;
}

/**
 * Split an ISO datetime into date/time fields for `<input type="date|time">`.
 * Values are treated as UTC wall-clock (what the analyst typed / stored).
 */
export function splitUtcDateTime(iso: string | null | undefined): {
  date: string;
  time: string;
} {
  if (!iso) return { date: "", time: "" };

  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(iso);
  if (match) {
    return { date: match[1]!, time: `${match[2]}:${match[3]}` };
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return { date: "", time: "" };
  return {
    date: parsed.toISOString().slice(0, 10),
    time: parsed.toISOString().slice(11, 16),
  };
}

/**
 * Combine date + time inputs into a UTC ISO string (`…Z`).
 * The inputs are interpreted as UTC, not the browser's local timezone.
 */
export function combineUtcDateTime(
  date: string,
  time: string,
): string | null {
  const day = date.trim();
  if (!day) return null;
  const t = (time.trim() || "00:00").slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(t)) {
    return null;
  }
  const iso = `${day}T${t}:00.000Z`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}
