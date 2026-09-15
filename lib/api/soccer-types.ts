export type SeasonStatus =
  | "upcoming"
  | "current"
  | "finished"
  | "cancelled";

export type MatchBoStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "cancelled";

export interface SoccerCountry {
  id: string;
  name: string;
  code: string | null;
  flag: string | null;
}

export interface SoccerLeague {
  id: string;
  name: string;
  name_alt?: string | null;
  country_id: string | null;
  type: string;
  logo: string | null;
  logo_alt?: string | null;
  sport_id: string;
}

export interface SoccerTeam {
  id: string;
  league_id: string;
  name_short?: string | null;
  name_alt?: string | null;
  country_id?: string | null;
  status?: "active" | "inactive";
  logo_alt?: string | null;
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string | null;
    logo: string | null;
  };
}

export interface SoccerSeason {
  id: string;
  league_id: string;
  year: number;
  name?: string | null;
  start_date: string | null;
  end_date: string | null;
  current: boolean;
  status?: SeasonStatus;
}

export interface SoccerParticipant {
  id: string;
  season_id: string;
  league_id: string;
  team_id: string;
}

export interface SoccerRound {
  id: string;
  season_id: string;
  league_id: string;
  name: string;
  position: number;
  phase?: string | null;
}

export interface SoccerMatch {
  id: string;
  league_id: string;
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  fixture_date: string;
  status: string;
  bo_status?: MatchBoStatus;
  goals: { home: number | null; away: number | null };
  teams: {
    home: { name: string; logo: string | null };
    away: { name: string; logo: string | null };
  };
  league: { round: string };
}

export interface SoccerStanding {
  id: string;
  team_id: string;
  season_id: string;
  league_id: string;
  rank?: number;
  played: number;
  goals_for?: number;
  goals_against?: number;
  goal_difference?: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
}

export function teamDisplayName(team: SoccerTeam): string {
  return team.team?.name ?? "Sin nombre";
}

export function teamCode(team: SoccerTeam): string {
  return team.team?.code ?? team.name_short ?? "—";
}

export function seasonLabel(season: SoccerSeason): string {
  return season.name?.trim() || String(season.year);
}

export const SEASON_STATUS_LABEL: Record<SeasonStatus, string> = {
  upcoming: "Próxima",
  current: "Vigente",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

export const MATCH_STATUS_LABEL: Record<MatchBoStatus, string> = {
  scheduled: "Programado",
  live: "En curso",
  finished: "Finalizado",
  cancelled: "Cancelado",
};
