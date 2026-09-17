export type SeasonStatus =
  | "upcoming"
  | "current"
  | "finished"
  | "cancelled";

export type GameBoStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "cancelled";

/** Country catalog entry. MVP keys updates by `name` (or `code`); use that as `id`. */
export interface NflCountry {
  id: string;
  name: string;
  code: string | null;
  flag: string | null;
}

/**
 * League for BO UI. `id` is BFF league UUID (Firestore document id).
 */
export interface NflLeague {
  id: string;
  name: string;
  name_alt?: string | null;
  country_id: string | null;
  type: string;
  logo: string | null;
  logo_alt?: string | null;
  sport_id: string;
  country_name?: string | null;
  country_code?: string | null;
}

export interface NflTeam {
  id: string;
  league_id: string;
  team: {
    /** Firestore UUID from BFF. */
    id: number | string;
    name: string;
    city: string | null;
    logo: string | null;
  };
  conference: string | null;
  division: string | null;
}

/** Season id format: `${leagueId}:${year}`. */
export interface NflSeason {
  id: string;
  league_id: string;
  year: number;
  name?: string | null;
  start_date: string | null;
  end_date: string | null;
  current: boolean;
  status?: SeasonStatus;
}

/** Synthetic — MVP has no participants resource; derived from league teams. */
export interface NflParticipant {
  id: string;
  season_id: string;
  league_id: string;
  team_id: string;
}

/** Synthetic weeks (MVP has no rounds resource). */
export interface NflRound {
  id: string;
  season_id: string;
  league_id: string;
  name: string;
  position: number;
  phase?: string | null;
}

export interface NflGame {
  id: string;
  league_id: string;
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  game_date: string;
  status: string;
  bo_status?: GameBoStatus;
  scores: {
    home: { total: number | null };
    away: { total: number | null };
  };
  teams: {
    home: { name: string; logo: string | null };
    away: { name: string; logo: string | null };
  };
  game?: { week: string | null };
}

export interface NflStanding {
  id: string;
  team_id: string;
  season_id: string;
  league_id: string;
  rank?: number;
  position?: number;
  played: number;
  won: number;
  lost: number;
  ties: number;
  win_percentage?: number;
}

export function teamDisplayName(team: NflTeam): string {
  return team.team?.name ?? "Sin nombre";
}

export function teamCity(team: NflTeam): string {
  return team.team?.city ?? "—";
}

export function teamAbbrev(team: NflTeam): string {
  const name = team.team?.name ?? "";
  if (name.length >= 3) return name.slice(0, 3).toUpperCase();
  return name || "—";
}

export function seasonLabel(season: NflSeason): string {
  return season.name?.trim() || String(season.year);
}

export function deriveWinPercentage(
  won: number,
  _lost: number,
  ties: number,
  played?: number,
): number {
  const pj = played ?? won + _lost + ties;
  if (pj <= 0) return 0;
  return (won + 0.5 * ties) / pj;
}

export function formatWinPercentage(value: number): string {
  return value.toFixed(3).replace(/^0/, "");
}

export const SEASON_STATUS_LABEL: Record<SeasonStatus, string> = {
  upcoming: "Próxima",
  current: "Vigente",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

export const GAME_STATUS_LABEL: Record<GameBoStatus, string> = {
  scheduled: "Programado",
  live: "En curso",
  finished: "Finalizado",
  cancelled: "Cancelado",
};

export function seasonIdFor(leagueId: string, year: number): string {
  return `${leagueId}:${year}`;
}

export function parseSeasonId(seasonId: string): {
  leagueId: string;
  year: number;
} {
  const idx = seasonId.lastIndexOf(":");
  if (idx <= 0) {
    throw new Error(
      `Invalid season id "${seasonId}". Expected format leagueId:year.`,
    );
  }
  const leagueId = seasonId.slice(0, idx);
  const year = Number(seasonId.slice(idx + 1));
  if (!leagueId || !Number.isFinite(year)) {
    throw new Error(
      `Invalid season id "${seasonId}". Expected format leagueId:year.`,
    );
  }
  return { leagueId, year };
}
