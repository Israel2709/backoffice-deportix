import type { F1Competition, F1CompetitionStatus } from "@/lib/api/f1-types";

function dateKey(value: string | null | undefined): number {
  if (!value?.trim()) return Number.POSITIVE_INFINITY;
  const ms = Date.parse(value.slice(0, 10));
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

function isFinished(status?: F1CompetitionStatus | null): boolean {
  return status === "completed" || status === "cancelled";
}

/**
 * Upcoming / active first (nearest `startDate`, then `endDate`), then finished
 * in date order. Undated rows sink to the end of their group; ties by name.
 */
export function sortCompetitionsByDates(
  competitions: F1Competition[],
): F1Competition[] {
  return [...competitions].sort((left, right) => {
    const leftDone = isFinished(left.status);
    const rightDone = isFinished(right.status);
    if (leftDone !== rightDone) return leftDone ? 1 : -1;

    const startDiff = dateKey(left.startDate) - dateKey(right.startDate);
    if (startDiff !== 0) return startDiff;
    const endDiff = dateKey(left.endDate) - dateKey(right.endDate);
    if (endDiff !== 0) return endDiff;
    return left.name.localeCompare(right.name, "es");
  });
}
