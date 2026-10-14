import type { F1Competition, F1Race } from "@/lib/api/f1-types";

const FINISHED_STATUSES = new Set(["completed", "cancelled"]);
const UPCOMING_STATUSES = new Set(["scheduled", "live"]);

type CompetitionScheduleMeta = {
  finished: boolean;
  /** Soonest upcoming session, or main race date when finished / unknown. */
  sortDate: number;
};

function sessionTime(race: F1Race): number {
  const ms = Date.parse(race.race_date);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

function isRaceType(race: F1Race): boolean {
  return (race.type ?? "").trim().toLowerCase() === "race";
}

/**
 * Derive a calendar anchor for a Grand Prix from its season sessions.
 * Prefer an explicit Race session; otherwise the latest session of the weekend.
 */
export function getCompetitionScheduleMeta(
  competitionId: string,
  races: F1Race[],
  nowMs = Date.now(),
): CompetitionScheduleMeta {
  const ofComp = races.filter((race) => race.competition_id === competitionId);
  if (ofComp.length === 0) {
    // No calendar yet — keep after dated upcoming, before finished.
    return { finished: false, sortDate: Number.POSITIVE_INFINITY };
  }

  const timed = ofComp
    .map((race) => ({
      race,
      t: sessionTime(race),
      status: (race.status ?? "").trim().toLowerCase(),
    }))
    .filter((row) => Number.isFinite(row.t));

  if (timed.length === 0) {
    return { finished: false, sortDate: Number.POSITIVE_INFINITY };
  }

  const raceSession = timed.find((row) => isRaceType(row.race));
  const anchor = raceSession?.t ?? Math.max(...timed.map((row) => row.t));

  const upcoming = timed.filter((row) => UPCOMING_STATUSES.has(row.status));
  const allTerminal = timed.every((row) => FINISHED_STATUSES.has(row.status));
  const finished =
    upcoming.length === 0 && (allTerminal || anchor < nowMs);

  const sortDate = finished
    ? anchor
    : upcoming.length > 0
      ? Math.min(...upcoming.map((row) => row.t))
      : anchor;

  return { finished, sortDate };
}

/** Upcoming (soonest first), then finished (season order). Undated last among upcoming. */
export function sortCompetitionsBySchedule(
  competitions: F1Competition[],
  races: F1Race[],
  nowMs = Date.now(),
): F1Competition[] {
  return [...competitions].sort((left, right) => {
    const a = getCompetitionScheduleMeta(left.id, races, nowMs);
    const b = getCompetitionScheduleMeta(right.id, races, nowMs);

    if (a.finished !== b.finished) {
      return a.finished ? 1 : -1;
    }
    if (a.sortDate !== b.sortDate) {
      return a.sortDate - b.sortDate;
    }
    return (left.name ?? "").localeCompare(right.name ?? "", "es");
  });
}
