import { proxyRequest } from "./proxy-client";
import type { ApiListResponse } from "./types";
import type {
  MatchBoStatus,
  SeasonStatus,
  SoccerCountry,
  SoccerLeague,
  SoccerMatch,
  SoccerParticipant,
  SoccerRound,
  SoccerSeason,
  SoccerStanding,
  SoccerTeam,
} from "./soccer-types";

export type { MatchBoStatus, SeasonStatus };

type List<T> = Promise<ApiListResponse<T>>;
type One<T> = Promise<{ data: T }>;

export function listAdminCountries(): List<SoccerCountry> {
  return proxyRequest("admin/soccer/countries?limit=200");
}

export function createCountry(body: {
  name: string;
  code?: string | null;
  flag?: string | null;
}): One<SoccerCountry> {
  return proxyRequest("admin/soccer/countries", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCountry(
  id: string,
  body: Partial<{ name: string; code: string | null; flag: string | null }>,
): One<SoccerCountry> {
  return proxyRequest(`admin/soccer/countries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteCountry(id: string): Promise<void> {
  return proxyRequest(`admin/soccer/countries/${id}`, { method: "DELETE" });
}

export function listAdminLeagues(): List<SoccerLeague> {
  return proxyRequest("admin/soccer/leagues?limit=200");
}

export function getAdminLeague(id: string): One<SoccerLeague> {
  return proxyRequest(`admin/soccer/leagues/${id}`);
}

export function createLeague(body: {
  name: string;
  name_alt?: string | null;
  country_id?: string | null;
  type?: string;
  logo?: string | null;
  logo_alt?: string | null;
}): One<SoccerLeague> {
  return proxyRequest("admin/soccer/leagues", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateLeague(
  id: string,
  body: Partial<{
    name: string;
    name_alt: string | null;
    country_id: string | null;
    type: string;
    logo: string | null;
    logo_alt: string | null;
  }>,
): One<SoccerLeague> {
  return proxyRequest(`admin/soccer/leagues/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listAdminTeams(leagueId?: string): List<SoccerTeam> {
  const query = leagueId
    ? `?league=${encodeURIComponent(leagueId)}&limit=200`
    : "?limit=200";
  return proxyRequest(`admin/soccer/teams${query}`);
}

export function getAdminTeam(id: string): One<SoccerTeam> {
  return proxyRequest(`admin/soccer/teams/${id}`);
}

export function createTeam(body: {
  name: string;
  name_short: string;
  abbreviation: string;
  league_id: string;
  name_alt?: string | null;
  country_id?: string | null;
  country_name?: string | null;
  logo?: string | null;
  logo_alt?: string | null;
  status?: "active" | "inactive";
}): One<SoccerTeam> {
  return proxyRequest("admin/soccer/teams", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTeam(
  id: string,
  body: Partial<{
    name: string;
    name_short: string;
    abbreviation: string;
    league_id: string;
    name_alt: string | null;
    country_id: string | null;
    country_name: string | null;
    logo: string | null;
    logo_alt: string | null;
    status: "active" | "inactive";
  }>,
): One<SoccerTeam> {
  return proxyRequest(`admin/soccer/teams/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteTeam(id: string): Promise<void | {
  data: SoccerTeam;
  message?: string;
}> {
  return proxyRequest(`admin/soccer/teams/${id}`, { method: "DELETE" });
}

export function listAdminSeasons(leagueId?: string): List<SoccerSeason> {
  const query = leagueId
    ? `?league=${encodeURIComponent(leagueId)}&limit=200`
    : "?limit=200";
  return proxyRequest(`admin/soccer/seasons${query}`);
}

export function getAdminSeason(id: string): One<SoccerSeason> {
  return proxyRequest(`admin/soccer/seasons/${id}`);
}

export function createSeason(body: {
  league_id: string;
  year: number;
  name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: SeasonStatus;
}): One<SoccerSeason> {
  return proxyRequest("admin/soccer/seasons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSeason(
  id: string,
  body: Partial<{
    year: number;
    name: string | null;
    start_date: string | null;
    end_date: string | null;
    status: SeasonStatus;
  }>,
): One<SoccerSeason> {
  return proxyRequest(`admin/soccer/seasons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listParticipants(seasonId: string): List<SoccerParticipant> {
  return proxyRequest(
    `admin/soccer/seasons/${seasonId}/participants?limit=200`,
  );
}

export function replaceParticipants(
  seasonId: string,
  teamIds: string[],
): List<SoccerParticipant> {
  return proxyRequest(`admin/soccer/seasons/${seasonId}/participants`, {
    method: "PUT",
    body: JSON.stringify({ team_ids: teamIds }),
  });
}

export function listRounds(seasonId: string): List<SoccerRound> {
  return proxyRequest(`admin/soccer/seasons/${seasonId}/rounds?limit=200`);
}

export function replaceRounds(
  seasonId: string,
  rounds: Array<{ name: string; position: number; phase?: string | null }>,
): List<SoccerRound> {
  return proxyRequest(`admin/soccer/seasons/${seasonId}/rounds`, {
    method: "PUT",
    body: JSON.stringify({ rounds }),
  });
}

export function listSeasonMatches(seasonId: string): List<SoccerMatch> {
  return proxyRequest(`admin/soccer/seasons/${seasonId}/matches?limit=200`);
}

export function saveMatchesBatch(
  seasonId: string,
  matches: Array<{
    id?: string;
    home_team_id: string;
    away_team_id: string;
    fixture_date?: string | null;
    status: MatchBoStatus;
    goals_home?: number | null;
    goals_away?: number | null;
    round_id?: string | null;
    round_name?: string | null;
  }>,
): List<SoccerMatch> {
  return proxyRequest(`admin/soccer/seasons/${seasonId}/matches/batch`, {
    method: "PUT",
    body: JSON.stringify({ matches }),
  });
}

export function listStandings(seasonId: string): List<SoccerStanding> {
  return proxyRequest(`admin/soccer/seasons/${seasonId}/standings?limit=200`);
}

export function replaceStandings(
  seasonId: string,
  standings: Array<{
    team_id: string;
    rank: number;
    played: number;
    goals_for: number;
    goals_against: number;
    points: number;
    wins?: number;
    draws?: number;
    losses?: number;
  }>,
): List<SoccerStanding> {
  return proxyRequest(`admin/soccer/seasons/${seasonId}/standings`, {
    method: "PUT",
    body: JSON.stringify({ standings }),
  });
}
