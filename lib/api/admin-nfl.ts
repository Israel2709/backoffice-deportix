import { proxyRequest } from "./proxy-client";
import type { ApiListResponse } from "./types";
import type {
  GameBoStatus,
  NflCountry,
  NflGame,
  NflLeague,
  NflParticipant,
  NflRound,
  NflSeason,
  NflStanding,
  NflTeam,
  SeasonStatus,
} from "./nfl-types";

export type { GameBoStatus, SeasonStatus };

type List<T> = Promise<ApiListResponse<T>>;
type One<T> = Promise<{ data: T }>;

export function listAdminCountries(): List<NflCountry> {
  return proxyRequest("admin/nfl/countries?limit=200");
}

export function createCountry(body: {
  name: string;
  code?: string | null;
  flag?: string | null;
}): One<NflCountry> {
  return proxyRequest("admin/nfl/countries", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCountry(
  id: string,
  body: Partial<{ name: string; code: string | null; flag: string | null }>,
): One<NflCountry> {
  return proxyRequest(`admin/nfl/countries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listAdminLeagues(): List<NflLeague> {
  return proxyRequest("admin/nfl/leagues?limit=200");
}

export function getAdminLeague(id: string): One<NflLeague> {
  return proxyRequest(`admin/nfl/leagues/${id}`);
}

export function createLeague(body: {
  name: string;
  name_alt?: string | null;
  country_id?: string | null;
  type?: string;
  logo?: string | null;
  logo_alt?: string | null;
}): One<NflLeague> {
  return proxyRequest("admin/nfl/leagues", {
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
): One<NflLeague> {
  return proxyRequest(`admin/nfl/leagues/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listAdminTeams(leagueId?: string): List<NflTeam> {
  const query = leagueId
    ? `?league=${encodeURIComponent(leagueId)}&limit=200`
    : "?limit=200";
  return proxyRequest(`admin/nfl/teams${query}`);
}

export function getAdminTeam(id: string): One<NflTeam> {
  return proxyRequest(`admin/nfl/teams/${id}`);
}

export function createTeam(body: {
  name: string;
  city?: string | null;
  league_id: string;
  logo?: string | null;
  conference?: string | null;
  division?: string | null;
}): One<NflTeam> {
  return proxyRequest("admin/nfl/teams", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTeam(
  id: string,
  body: Partial<{
    name: string;
    city: string | null;
    league_id: string;
    logo: string | null;
    conference: string | null;
    division: string | null;
  }>,
): One<NflTeam> {
  return proxyRequest(`admin/nfl/teams/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteTeam(id: string): Promise<void> {
  return proxyRequest(`admin/nfl/teams/${id}`, { method: "DELETE" });
}

export function listAdminSeasons(leagueId?: string): List<NflSeason> {
  const query = leagueId
    ? `?league=${encodeURIComponent(leagueId)}&limit=200`
    : "?limit=200";
  return proxyRequest(`admin/nfl/seasons${query}`);
}

export function getAdminSeason(id: string): One<NflSeason> {
  return proxyRequest(`admin/nfl/seasons/${id}`);
}

export function createSeason(body: {
  league_id: string;
  year: number;
  name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: SeasonStatus;
}): One<NflSeason> {
  return proxyRequest("admin/nfl/seasons", {
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
): One<NflSeason> {
  return proxyRequest(`admin/nfl/seasons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listParticipants(seasonId: string): List<NflParticipant> {
  return proxyRequest(
    `admin/nfl/seasons/${seasonId}/participants?limit=200`,
  );
}

export function replaceParticipants(
  seasonId: string,
  teamIds: string[],
): List<NflParticipant> {
  return proxyRequest(`admin/nfl/seasons/${seasonId}/participants`, {
    method: "PUT",
    body: JSON.stringify({ team_ids: teamIds }),
  });
}

export function listRounds(seasonId: string): List<NflRound> {
  return proxyRequest(`admin/nfl/seasons/${seasonId}/rounds?limit=200`);
}

export function replaceRounds(
  seasonId: string,
  rounds: Array<{ name: string; position: number; phase?: string | null }>,
): List<NflRound> {
  return proxyRequest(`admin/nfl/seasons/${seasonId}/rounds`, {
    method: "PUT",
    body: JSON.stringify({ rounds }),
  });
}

export function listSeasonGames(seasonId: string): List<NflGame> {
  return proxyRequest(`admin/nfl/seasons/${seasonId}/games?limit=200`);
}

export function saveGamesBatch(
  seasonId: string,
  games: Array<{
    id?: string;
    home_team_id: string;
    away_team_id: string;
    game_date?: string | null;
    status: GameBoStatus;
    score_home?: number | null;
    score_away?: number | null;
    round_id?: string | null;
    week?: string | null;
  }>,
): List<NflGame> {
  return proxyRequest(`admin/nfl/seasons/${seasonId}/games/batch`, {
    method: "PUT",
    body: JSON.stringify({ games }),
  });
}

export function listStandings(seasonId: string): List<NflStanding> {
  return proxyRequest(`admin/nfl/seasons/${seasonId}/standings?limit=200`);
}

export function replaceStandings(
  seasonId: string,
  standings: Array<{
    team_id: string;
    rank: number;
    played: number;
    won?: number;
    lost?: number;
    ties?: number;
  }>,
): List<NflStanding> {
  return proxyRequest(`admin/nfl/seasons/${seasonId}/standings`, {
    method: "PUT",
    body: JSON.stringify({ standings }),
  });
}
