import { proxyRequest } from "./proxy-client";
import type { ApiListResponse } from "./types";
import type {
  F1Circuit,
  F1Competition,
  F1Driver,
  F1DriverRanking,
  F1Race,
  F1RaceResult,
  F1Season,
  F1SeasonParticipant,
  F1Session,
  F1SessionBoStatus,
  F1SessionType,
  F1Team,
  F1TeamRanking,
  F1ResultStatus,
  SeasonStatus,
} from "./f1-types";

export type { SeasonStatus, F1ResultStatus, F1SessionType, F1SessionBoStatus };

type List<T> = Promise<ApiListResponse<T>>;
type One<T> = Promise<{ data: T }>;

export function listAdminCompetitions(): List<F1Competition> {
  return proxyRequest("admin/f1/competitions?limit=200");
}

export function getAdminCompetition(id: string): One<F1Competition> {
  return proxyRequest(`admin/f1/competitions/${id}`);
}

export function createCompetition(body: {
  name: string;
  logo?: string | null;
}): One<F1Competition> {
  return proxyRequest("admin/f1/competitions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCompetition(
  id: string,
  body: Partial<{ name: string; logo: string | null }>,
): One<F1Competition> {
  return proxyRequest(`admin/f1/competitions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteCompetition(id: string): Promise<void> {
  return proxyRequest(`admin/f1/competitions/${id}`, { method: "DELETE" });
}

export function listAdminCircuits(): List<F1Circuit> {
  return proxyRequest("admin/f1/circuits?limit=200");
}

export function createCircuit(body: {
  name: string;
  country: string;
  city?: string | null;
  image?: string | null;
}): One<F1Circuit> {
  return proxyRequest("admin/f1/circuits", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCircuit(
  id: string,
  body: Partial<{
    name: string;
    country: string;
    city: string | null;
    image: string | null;
  }>,
): One<F1Circuit> {
  return proxyRequest(`admin/f1/circuits/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteCircuit(id: string): Promise<void> {
  return proxyRequest(`admin/f1/circuits/${id}`, { method: "DELETE" });
}

export function listAdminF1Teams(): List<F1Team> {
  return proxyRequest("admin/f1/teams?limit=200");
}

export function createF1Team(body: {
  name: string;
  logo?: string | null;
}): One<F1Team> {
  return proxyRequest("admin/f1/teams", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateF1Team(
  id: string,
  body: Partial<{ name: string; logo: string | null }>,
): One<F1Team> {
  return proxyRequest(`admin/f1/teams/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteF1Team(id: string): Promise<void> {
  return proxyRequest(`admin/f1/teams/${id}`, { method: "DELETE" });
}

export function listAdminDrivers(teamId?: string): List<F1Driver> {
  const query = teamId
    ? `?team=${encodeURIComponent(teamId)}&limit=200`
    : "?limit=200";
  return proxyRequest(`admin/f1/drivers${query}`);
}

export function createDriver(body: {
  name: string;
  nationality: string;
  number?: number | null;
  team_id?: string | null;
  photo?: string | null;
}): One<F1Driver> {
  return proxyRequest("admin/f1/drivers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateDriver(
  id: string,
  body: Partial<{
    name: string;
    nationality: string;
    number: number | null;
    team_id: string | null;
    photo: string | null;
  }>,
): One<F1Driver> {
  return proxyRequest(`admin/f1/drivers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteDriver(id: string): Promise<void> {
  return proxyRequest(`admin/f1/drivers/${id}`, { method: "DELETE" });
}

export function listAdminF1Seasons(competitionId?: string): List<F1Season> {
  const query = competitionId
    ? `?competition=${encodeURIComponent(competitionId)}&limit=200`
    : "?limit=200";
  return proxyRequest(`admin/f1/seasons${query}`);
}

export function getAdminF1Season(id: string): One<F1Season> {
  return proxyRequest(`admin/f1/seasons/${id}`);
}

export function createF1Season(body: {
  competition_id: string;
  year: number;
  name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: SeasonStatus;
}): One<F1Season> {
  return proxyRequest("admin/f1/seasons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateF1Season(
  id: string,
  body: Partial<{
    year: number;
    name: string | null;
    start_date: string | null;
    end_date: string | null;
    status: SeasonStatus;
  }>,
): One<F1Season> {
  return proxyRequest(`admin/f1/seasons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listF1Participants(seasonId: string): List<F1SeasonParticipant> {
  return proxyRequest(
    `admin/f1/seasons/${seasonId}/participants?limit=200`,
  );
}

export function replaceF1Participants(
  seasonId: string,
  participants: Array<{ driver_id: string; team_id: string }>,
): List<F1SeasonParticipant> {
  return proxyRequest(`admin/f1/seasons/${seasonId}/participants`, {
    method: "PUT",
    body: JSON.stringify({ participants }),
  });
}

export function listSeasonRaces(seasonId: string): List<F1Race> {
  return proxyRequest(`admin/f1/seasons/${seasonId}/races?limit=200`);
}

export function getRace(id: string): One<F1Race> {
  return proxyRequest(`admin/f1/races/${id}`);
}

export function createRace(body: {
  competition_id: string;
  season_id: string;
  circuit_id: string;
  race_date: string;
  name?: string | null;
  status?: string;
}): One<F1Race> {
  return proxyRequest("admin/f1/races", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateRace(
  id: string,
  body: Partial<{
    circuit_id: string;
    race_date: string | null;
    name: string | null;
    status: string;
  }>,
): One<F1Race> {
  return proxyRequest(`admin/f1/races/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteRace(id: string): Promise<void> {
  return proxyRequest(`admin/f1/races/${id}`, { method: "DELETE" });
}

export function listRaceSessions(raceId: string): List<F1Session> {
  return proxyRequest(`admin/f1/races/${raceId}/sessions?limit=50`);
}

export function createSession(
  raceId: string,
  body: {
    type: F1SessionType;
    session_date: string;
    status?: F1SessionBoStatus;
  },
): One<F1Session> {
  return proxyRequest(`admin/f1/races/${raceId}/sessions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSession(
  id: string,
  body: Partial<{
    type: F1SessionType;
    session_date: string | null;
    status: F1SessionBoStatus;
  }>,
): One<F1Session> {
  return proxyRequest(`admin/f1/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteSession(id: string): Promise<void> {
  return proxyRequest(`admin/f1/sessions/${id}`, { method: "DELETE" });
}

export function listDriverRankings(seasonId: string): List<F1DriverRanking> {
  return proxyRequest(
    `admin/f1/seasons/${seasonId}/driver-rankings?limit=200`,
  );
}

export function replaceDriverRankings(
  seasonId: string,
  rankings: Array<{ driver_id: string; position: number; points: number }>,
): List<F1DriverRanking> {
  return proxyRequest(`admin/f1/seasons/${seasonId}/driver-rankings`, {
    method: "PUT",
    body: JSON.stringify({ rankings }),
  });
}

export function listTeamRankings(seasonId: string): List<F1TeamRanking> {
  return proxyRequest(`admin/f1/seasons/${seasonId}/team-rankings?limit=200`);
}

export function replaceTeamRankings(
  seasonId: string,
  rankings: Array<{ team_id: string; position: number; points: number }>,
): List<F1TeamRanking> {
  return proxyRequest(`admin/f1/seasons/${seasonId}/team-rankings`, {
    method: "PUT",
    body: JSON.stringify({ rankings }),
  });
}

export function listRaceResults(raceId: string): List<F1RaceResult> {
  return proxyRequest(`admin/f1/races/${raceId}/results?limit=200`);
}

export function replaceRaceResults(
  raceId: string,
  results: Array<{
    driver_id: string;
    team_id: string;
    position: number;
    points?: number;
    status?: F1ResultStatus;
  }>,
): List<F1RaceResult> {
  return proxyRequest(`admin/f1/races/${raceId}/results`, {
    method: "PUT",
    body: JSON.stringify({ results }),
  });
}
