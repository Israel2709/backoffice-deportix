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
