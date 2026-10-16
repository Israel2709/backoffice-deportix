export type SeasonStatus =
  | "upcoming"
  | "current"
  | "finished"
  | "cancelled";

export type F1SessionType =
  | "qualifying"
  | "sprint_qualifying"
  | "sprint"
  | "race";

/** Calendar session types persisted on `f1_races.type` (api-sports style). */
export type F1RaceType =
  | "Sprint Shootout"
  | "Sprint"
  | "Qualifying"
  | "Race";

export type F1SessionBoStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "cancelled";

export type F1ResultStatus = "classified" | "dnf" | "dns" | "dsq";

export type F1CompetitionStatus =
  | "scheduled"
  | "active"
  | "completed"
  | "cancelled";

export interface F1Competition {
  id: string;
  name: string;
  logo?: string | null;
  /** Host country / location when the BFF provides it. */
  location?: string | null;
  /** Season year (or season document id) this competition belongs to. */
  seasonId?: string | null;
  /** Competition lifecycle status from BFF (`scheduled` | `active` | …). */
  status?: F1CompetitionStatus | null;
  sport_id?: string;
}

export interface F1Circuit {
  id: string;
  name: string;
  country: string | null;
  city?: string | null;
  image?: string | null;
}

export interface F1Team {
  id: string;
  name: string;
  logo: string | null;
}

export interface F1Driver {
  id: string;
  name: string;
  nationality: string | null;
  number: number | null;
  team_id: string | null;
  photo?: string | null;
}

/** Season id format: `${competitionId}:${year}`. */
export interface F1Season {
  id: string;
  /** Same as competition_id — kept for UI that reads league_id. */
  league_id: string;
  competition_id?: string;
  year: number;
  name?: string | null;
  start_date: string | null;
  end_date: string | null;
  current: boolean;
  status?: SeasonStatus;
}

/** Competition-season entry: driver paired with constructor for this edition. */
export interface F1SeasonParticipant {
  id: string;
  season_id: string;
  competition_id: string;
  driver_id: string;
  /** Constructor id for this participation (may differ from driver master team). */
  team_id: string;
  number?: number | null;
  role?: "race-driver" | "reserve-driver";
}

/** Lean podium snapshot embedded on each race (ingest / BO). */
export interface F1RaceHighlightsIds {
  p1_driver_id: string;
  p2_driver_id: string;
  p3_driver_id: string;
  pole_driver_id: string;
  fastest_driver_id: string;
  winning_team_id: string;
  updated_at?: string | null;
}

export interface F1Race {
  id: string;
  competition_id: string;
  circuit_id: string;
  season: number;
  race_date: string;
  name?: string | null;
  status: string;
  type?: string | null;
  highlights?: F1RaceHighlightsIds | null;
}

/** Sessions are not a BFF resource — stubs return empty / no-op. */
export interface F1Session {
  id: string;
  race_id: string;
  competition_id: string;
  season: number;
  type: F1SessionType;
  session_date: string;
  status: F1SessionBoStatus;
}

export interface F1DriverRanking {
  id: string;
  competition_id: string | null;
  driver_id: string;
  season: number;
  points: number;
  position: number;
  wins: number;
  podiums: number;
}

export interface F1TeamRanking {
  id: string;
  competition_id: string | null;
  team_id: string;
  season: number;
  points: number;
  position: number;
  wins: number;
  podiums: number;
}

export interface F1RaceResult {
  id: string;
  race_id: string;
  driver_id: string;
  driver_name?: string | null;
  team_id: string;
  team_name?: string | null;
  position: number;
  points?: number | null;
  status?: F1ResultStatus | null;
}

export interface F1StartingGridEntry {
  id: string;
  race_id: string;
  driver_id: string;
  driver_name?: string | null;
  team_id: string;
  team_name?: string | null;
  position: number;
  time?: string | null;
}

export interface F1FastestLapEntry {
  id: string;
  race_id: string;
  driver_id: string;
  driver_name?: string | null;
  team_id: string;
  team_name?: string | null;
  position: number;
  lap: number;
  time?: string | null;
}

/** Aggregated podium / highlights for the results list table. */
export interface F1RaceHighlights {
  race_id: string;
  p1: string;
  p2: string;
  p3: string;
  fastest_lap: string;
  race_pole: string;
  winning_team: string;
  sprint_pole: string;
  sprint_winner: string;
  sprint_winning_team: string;
  p1_driver_id: string;
  p2_driver_id: string;
  p3_driver_id: string;
  pole_driver_id: string;
  fastest_driver_id: string;
  winning_team_id: string;
}

export function seasonLabel(season: F1Season): string {
  return season.name?.trim() || String(season.year);
}

export function driverDisplayName(driver: F1Driver): string {
  return driver.name?.trim() || "Sin nombre";
}

export const SEASON_STATUS_LABEL: Record<SeasonStatus, string> = {
  upcoming: "Próxima",
  current: "Vigente",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

export const F1_SESSION_TYPE_LABEL: Record<F1SessionType, string> = {
  qualifying: "Clasificación",
  sprint_qualifying: "SQ Sprint",
  sprint: "Sprint",
  race: "Carrera",
};

export const F1_RACE_TYPES: F1RaceType[] = [
  "Sprint Shootout",
  "Sprint",
  "Qualifying",
  "Race",
];

export const F1_RACE_TYPE_LABEL: Record<F1RaceType, string> = {
  "Sprint Shootout": "Sprint Shootout",
  Sprint: "Sprint Race",
  Qualifying: "Qualifying",
  Race: "Race",
};

export const F1_SESSION_STATUS_LABEL: Record<F1SessionBoStatus, string> = {
  scheduled: "Programada",
  live: "En curso",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

export const F1_RESULT_STATUS_LABEL: Record<F1ResultStatus, string> = {
  classified: "Clasificado",
  dnf: "DNF",
  dns: "DNS",
  dsq: "DSQ",
};

export function seasonIdFor(competitionId: string, year: number): string {
  return `${competitionId}:${year}`;
}

/** Fully unwrap over-encoded route params (`%3A` → `%253A` → `%25253A`…). */
export function decodeRouteParam(value: string): string {
  let current = value;
  for (let i = 0; i < 8; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(current)) return current;
    try {
      const next = decodeURIComponent(current);
      if (next === current) return current;
      current = next;
    } catch {
      return current;
    }
  }
  return current;
}

/**
 * Canonical `competitionId:year` for Next.js Link hrefs.
 * Pass the raw colon form — Link encodes once; pre-encoding causes `%25253A`.
 */
export function normalizeSeasonIdParam(seasonId: string): string {
  const { competitionId, year } = parseSeasonId(seasonId);
  return seasonIdFor(competitionId, year);
}

export function parseSeasonId(seasonId: string): {
  competitionId: string;
  year: number;
} {
  const decoded = decodeRouteParam(seasonId);
  const idx = decoded.lastIndexOf(":");
  if (idx <= 0) {
    throw new Error(
      `Invalid season id "${seasonId}". Expected format competitionId:year.`,
    );
  }
  const competitionId = decoded.slice(0, idx);
  const year = Number(decoded.slice(idx + 1));
  if (!competitionId || !Number.isFinite(year)) {
    throw new Error(
      `Invalid season id "${seasonId}". Expected format competitionId:year.`,
    );
  }
  return { competitionId, year };
}
