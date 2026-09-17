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

export type F1SessionBoStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "cancelled";

export type F1ResultStatus = "classified" | "dnf" | "dns" | "dsq";

export interface F1Competition {
  id: string;
  name: string;
  logo?: string | null;
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

/** Synthetic — MVP has no season participants resource; derived from drivers. */
export interface F1SeasonParticipant {
  id: string;
  season_id: string;
  competition_id: string;
  driver_id: string;
  team_id: string;
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
  driver_id: string;
  season: number;
  points: number;
  position: number;
}

export interface F1TeamRanking {
  id: string;
  team_id: string;
  season: number;
  points: number;
  position: number;
}

export interface F1RaceResult {
  id: string;
  race_id: string;
  driver_id: string;
  team_id: string;
  position: number;
  points?: number | null;
  status?: F1ResultStatus | null;
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

export function parseSeasonId(seasonId: string): {
  competitionId: string;
  year: number;
} {
  const idx = seasonId.lastIndexOf(":");
  if (idx <= 0) {
    throw new Error(
      `Invalid season id "${seasonId}". Expected format competitionId:year.`,
    );
  }
  const competitionId = seasonId.slice(0, idx);
  const year = Number(seasonId.slice(idx + 1));
  if (!competitionId || !Number.isFinite(year)) {
    throw new Error(
      `Invalid season id "${seasonId}". Expected format competitionId:year.`,
    );
  }
  return { competitionId, year };
}
