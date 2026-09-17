/**
 * Formula 1 admin API — Deportix MVP BFF via `/api/proxy`.
 * Paths under `/formula-1/*`. Envelope `{ response }` unwrapped by `bffRequest`.
 * All public functions return `{ data: T }` / `{ data: T[] }` for the BO UI.
 */
import { bffRequest } from "./bff-client";
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
import { parseSeasonId, seasonIdFor } from "./f1-types";

export type { SeasonStatus, F1ResultStatus, F1SessionType, F1SessionBoStatus };

type List<T> = Promise<ApiListResponse<T>>;
type One<T> = Promise<{ data: T }>;

const PREFIX = "formula-1";

// ─── BFF raw shapes ───────────────────────────────────────────────────────────

type BffCompetition = { id: string; name: string };
type BffCircuit = {
  id: string;
  name: string;
  image?: string | null;
  country?: string | null;
};
type BffTeam = { id: string; name: string; logo?: string | null };
type BffDriver = {
  id: string;
  name: string;
  number?: number | null;
  team?: { id: string; name: string; logo?: string | null } | null;
};
type BffRace = {
  id: string;
  competition: { id: string; name: string };
  circuit: { id: string; name: string; image?: string | null; country?: string | null };
  season: number;
  type: string;
  date: string;
  status: string;
};
type BffDriverRanking = {
  position: number;
  points?: number | null;
  season: number;
  driver: { id: string; name: string };
  team?: { id: string; name: string } | null;
};
type BffTeamRanking = {
  position: number;
  points?: number | null;
  season: number;
  team: { id: string; name: string };
};
type BffRaceRanking = {
  position: number;
  driver: { id: string; name: string };
  team?: { id: string; name: string } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asList<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function firstOf<T>(value: T | T[] | null | undefined): T | undefined {
  return asList(value)[0];
}

function mapCompetition(c: BffCompetition): F1Competition {
  return {
    id: String(c.id),
    name: c.name,
    logo: null,
    sport_id: "formula-1",
  };
}

function mapCircuit(c: BffCircuit): F1Circuit {
  return {
    id: String(c.id),
    name: c.name,
    country: c.country ?? null,
    city: null,
    image: c.image ?? null,
  };
}

function mapTeam(t: BffTeam): F1Team {
  return {
    id: String(t.id),
    name: t.name,
    logo: t.logo ?? null,
  };
}

function mapDriver(d: BffDriver): F1Driver {
  return {
    id: String(d.id),
    name: d.name,
    nationality: null,
    number: d.number ?? null,
    team_id: d.team?.id != null ? String(d.team.id) : null,
    photo: null,
  };
}

function mapRace(r: BffRace): F1Race {
  return {
    id: String(r.id),
    competition_id: String(r.competition?.id ?? ""),
    circuit_id: String(r.circuit?.id ?? ""),
    season: r.season,
    race_date: r.date,
    name: r.type || r.competition?.name || null,
    status: r.status,
    type: r.type ?? null,
  };
}

function buildSeason(
  competitionId: string,
  year: number,
  extras?: Partial<F1Season>,
): F1Season {
  return {
    id: seasonIdFor(competitionId, year),
    league_id: competitionId,
    competition_id: competitionId,
    year,
    name: extras?.name ?? String(year),
    start_date: extras?.start_date ?? null,
    end_date: extras?.end_date ?? null,
    current: extras?.current ?? false,
    status: extras?.status ?? "upcoming",
  };
}

// ─── Competitions ─────────────────────────────────────────────────────────────

export async function listAdminCompetitions(): List<F1Competition> {
  const response = await bffRequest<BffCompetition[]>(`${PREFIX}/competitions`);
  return { data: asList(response).map(mapCompetition) };
}

export async function getAdminCompetition(id: string): One<F1Competition> {
  const response = await bffRequest<BffCompetition[] | BffCompetition>(
    `${PREFIX}/competitions?id=${encodeURIComponent(id)}`,
  );
  const found = firstOf(response);
  if (!found) throw new Error(`Competition not found: ${id}`);
  return { data: mapCompetition(found) };
}

export async function createCompetition(body: {
  name: string;
  logo?: string | null;
}): One<F1Competition> {
  const response = await bffRequest<BffCompetition[] | BffCompetition>(
    `${PREFIX}/competitions`,
    {
      method: "POST",
      body: JSON.stringify({ name: body.name }),
    },
  );
  const created = firstOf(response);
  if (!created) throw new Error("Competition create returned empty response");
  return { data: { ...mapCompetition(created), logo: body.logo ?? null } };
}

export async function updateCompetition(
  id: string,
  body: Partial<{ name: string; logo: string | null }>,
): One<F1Competition> {
  const response = await bffRequest<BffCompetition[] | BffCompetition>(
    `${PREFIX}/competitions?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ name: body.name }),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("Competition update returned empty response");
  return {
    data: {
      ...mapCompetition(updated),
      logo: body.logo !== undefined ? body.logo : null,
    },
  };
}

export async function deleteCompetition(id: string): Promise<void> {
  await bffRequest(`${PREFIX}/competitions?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Circuits ─────────────────────────────────────────────────────────────────

export async function listAdminCircuits(): List<F1Circuit> {
  const response = await bffRequest<BffCircuit[]>(`${PREFIX}/circuits`);
  return { data: asList(response).map(mapCircuit) };
}

export async function createCircuit(body: {
  name: string;
  country: string;
  city?: string | null;
  image?: string | null;
}): One<F1Circuit> {
  const response = await bffRequest<BffCircuit[] | BffCircuit>(
    `${PREFIX}/circuits`,
    {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        country: body.country || null,
        image: body.image ?? null,
      }),
    },
  );
  const created = firstOf(response);
  if (!created) throw new Error("Circuit create returned empty response");
  return {
    data: { ...mapCircuit(created), city: body.city ?? null },
  };
}

export async function updateCircuit(
  id: string,
  body: Partial<{
    name: string;
    country: string;
    city: string | null;
    image: string | null;
  }>,
): One<F1Circuit> {
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.country !== undefined) patch.country = body.country;
  if (body.image !== undefined) patch.image = body.image;

  const response = await bffRequest<BffCircuit[] | BffCircuit>(
    `${PREFIX}/circuits?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("Circuit update returned empty response");
  return {
    data: {
      ...mapCircuit(updated),
      city: body.city !== undefined ? body.city : null,
    },
  };
}

export async function deleteCircuit(id: string): Promise<void> {
  await bffRequest(`${PREFIX}/circuits?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function listAdminF1Teams(): List<F1Team> {
  const response = await bffRequest<BffTeam[]>(`${PREFIX}/teams`);
  return { data: asList(response).map(mapTeam) };
}

export async function createF1Team(body: {
  name: string;
  logo?: string | null;
}): One<F1Team> {
  const response = await bffRequest<BffTeam[] | BffTeam>(`${PREFIX}/teams`, {
    method: "POST",
    body: JSON.stringify({
      name: body.name,
      logo: body.logo ?? null,
    }),
  });
  const created = firstOf(response);
  if (!created) throw new Error("Team create returned empty response");
  return { data: mapTeam(created) };
}

export async function updateF1Team(
  id: string,
  body: Partial<{ name: string; logo: string | null }>,
): One<F1Team> {
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.logo !== undefined) patch.logo = body.logo;

  const response = await bffRequest<BffTeam[] | BffTeam>(
    `${PREFIX}/teams?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("Team update returned empty response");
  return { data: mapTeam(updated) };
}

export async function deleteF1Team(id: string): Promise<void> {
  await bffRequest(`${PREFIX}/teams?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

export async function listAdminDrivers(teamId?: string): List<F1Driver> {
  const query = teamId
    ? `?team=${encodeURIComponent(teamId)}`
    : "";
  const response = await bffRequest<BffDriver[]>(`${PREFIX}/drivers${query}`);
  return { data: asList(response).map(mapDriver) };
}

export async function createDriver(body: {
  name: string;
  nationality: string;
  number?: number | null;
  team_id?: string | null;
  photo?: string | null;
}): One<F1Driver> {
  const response = await bffRequest<BffDriver[] | BffDriver>(
    `${PREFIX}/drivers`,
    {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        number: body.number ?? null,
        teamId: body.team_id ?? null,
      }),
    },
  );
  const created = firstOf(response);
  if (!created) throw new Error("Driver create returned empty response");
  return {
    data: {
      ...mapDriver(created),
      nationality: body.nationality || null,
      photo: body.photo ?? null,
    },
  };
}

export async function updateDriver(
  id: string,
  body: Partial<{
    name: string;
    nationality: string;
    number: number | null;
    team_id: string | null;
    photo: string | null;
  }>,
): One<F1Driver> {
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.number !== undefined) patch.number = body.number;
  if (body.team_id !== undefined) patch.teamId = body.team_id;

  const response = await bffRequest<BffDriver[] | BffDriver>(
    `${PREFIX}/drivers?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("Driver update returned empty response");
  return {
    data: {
      ...mapDriver(updated),
      nationality:
        body.nationality !== undefined ? body.nationality : null,
      photo: body.photo !== undefined ? body.photo : null,
    },
  };
}

export async function deleteDriver(id: string): Promise<void> {
  await bffRequest(`${PREFIX}/drivers?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Seasons (read-only years from BFF) ───────────────────────────────────────

export async function listAdminF1Seasons(
  competitionId?: string,
): List<F1Season> {
  const years = await bffRequest<number[]>(`${PREFIX}/seasons`);
  const yearList = asList(years).filter((y) => Number.isFinite(y));

  if (!competitionId) {
    const competitions = await listAdminCompetitions();
    const all: F1Season[] = [];
    for (const c of competitions.data) {
      for (const year of yearList) {
        all.push(buildSeason(c.id, year));
      }
    }
    return { data: all };
  }

  // Races list requires season — probe each global year for this competition.
  const competitionYears = new Set<number>();
  for (const year of yearList) {
    try {
      const races = await bffRequest<BffRace[]>(
        `${PREFIX}/races?season=${year}&competition=${encodeURIComponent(competitionId)}`,
      );
      const filtered = asList(races).filter(
        (r) =>
          !r.competition?.id ||
          String(r.competition.id) === competitionId,
      );
      if (filtered.length > 0) competitionYears.add(year);
    } catch {
      /* skip year */
    }
  }

  const resolvedYears =
    competitionYears.size > 0 ? [...competitionYears] : yearList;

  return {
    data: resolvedYears
      .sort((a, b) => b - a)
      .map((year) => buildSeason(competitionId, year)),
  };
}

export async function getAdminF1Season(id: string): One<F1Season> {
  const { competitionId, year } = parseSeasonId(id);
  const { data } = await listAdminF1Seasons(competitionId);
  const found = data.find((s) => s.year === year);
  if (found) return { data: found };
  return { data: buildSeason(competitionId, year) };
}

export async function createF1Season(_body: {
  competition_id: string;
  year: number;
  name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: SeasonStatus;
}): One<F1Season> {
  // MVP BFF has no seasons write resource — years appear when races exist.
  throw new Error(
    "El BFF F1 no permite crear temporadas por separado. Crea una carrera con el año deseado para registrar la temporada.",
  );
}

export async function updateF1Season(
  id: string,
  _body: Partial<{
    year: number;
    name: string | null;
    start_date: string | null;
    end_date: string | null;
    status: SeasonStatus;
  }>,
): One<F1Season> {
  // No seasons write API — return current synthetic season.
  return getAdminF1Season(id);
}

// ─── Participants (stub from drivers) ─────────────────────────────────────────

export async function listF1Participants(
  seasonId: string,
): List<F1SeasonParticipant> {
  const { competitionId } = parseSeasonId(seasonId);
  const drivers = await listAdminDrivers();
  return {
    data: drivers.data
      .filter((d) => d.team_id)
      .map((d) => ({
        id: `${seasonId}:${d.id}`,
        season_id: seasonId,
        competition_id: competitionId,
        driver_id: d.id,
        team_id: d.team_id!,
      })),
  };
}

export async function replaceF1Participants(
  seasonId: string,
  _participants: Array<{ driver_id: string; team_id: string }>,
): List<F1SeasonParticipant> {
  return listF1Participants(seasonId);
}

// ─── Races ────────────────────────────────────────────────────────────────────

export async function listSeasonRaces(seasonId: string): List<F1Race> {
  const { competitionId, year } = parseSeasonId(seasonId);
  const response = await bffRequest<BffRace[]>(
    `${PREFIX}/races?season=${year}&competition=${encodeURIComponent(competitionId)}`,
  );
  let races = asList(response).map(mapRace);
  // Some BFF builds ignore competition filter — filter client-side.
  races = races.filter(
    (r) => !r.competition_id || r.competition_id === competitionId,
  );
  return { data: races };
}

export async function getRace(id: string): One<F1Race> {
  const response = await bffRequest<BffRace[] | BffRace>(
    `${PREFIX}/races/${encodeURIComponent(id)}`,
  );
  const found = firstOf(response);
  if (!found) throw new Error(`Race not found: ${id}`);
  return { data: mapRace(found) };
}

export async function createRace(body: {
  competition_id: string;
  season_id: string;
  circuit_id: string;
  race_date: string;
  name?: string | null;
  status?: string;
}): One<F1Race> {
  const { year } = parseSeasonId(body.season_id);
  const response = await bffRequest<BffRace[] | BffRace>(`${PREFIX}/races`, {
    method: "POST",
    body: JSON.stringify({
      competitionId: body.competition_id,
      circuitId: body.circuit_id,
      season: year,
      type: body.name?.trim() || "Race",
      date: body.race_date,
      status: body.status ?? "Scheduled",
    }),
  });
  const created = firstOf(response);
  if (!created) throw new Error("Race create returned empty response");
  return { data: mapRace(created) };
}

export async function updateRace(
  id: string,
  body: Partial<{
    circuit_id: string;
    race_date: string | null;
    name: string | null;
    status: string;
  }>,
): One<F1Race> {
  const patch: Record<string, unknown> = {};
  if (body.circuit_id !== undefined) patch.circuitId = body.circuit_id;
  if (body.race_date !== undefined) patch.date = body.race_date;
  if (body.name !== undefined) patch.type = body.name;
  if (body.status !== undefined) patch.status = body.status;

  const response = await bffRequest<BffRace[] | BffRace>(
    `${PREFIX}/races/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("Race update returned empty response");
  return { data: mapRace(updated) };
}

export async function deleteRace(id: string): Promise<void> {
  await bffRequest(`${PREFIX}/races/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Sessions (no BFF resource) ───────────────────────────────────────────────

export async function listRaceSessions(_raceId: string): List<F1Session> {
  return { data: [] };
}

export async function createSession(
  _raceId: string,
  _body: {
    type: F1SessionType;
    session_date: string;
    status?: F1SessionBoStatus;
  },
): One<F1Session> {
  throw new Error(
    "El BFF F1 no expone sesiones como recurso separado. Usa carreras (/formula-1/races).",
  );
}

export async function updateSession(
  _id: string,
  _body: Partial<{
    type: F1SessionType;
    session_date: string | null;
    status: F1SessionBoStatus;
  }>,
): One<F1Session> {
  throw new Error(
    "El BFF F1 no expone sesiones como recurso separado. Usa carreras (/formula-1/races).",
  );
}

export async function deleteSession(_id: string): Promise<void> {
  // no-op
}

// ─── Rankings ─────────────────────────────────────────────────────────────────

export async function listDriverRankings(
  seasonId: string,
): List<F1DriverRanking> {
  const { year } = parseSeasonId(seasonId);
  const response = await bffRequest<BffDriverRanking[]>(
    `${PREFIX}/rankings/drivers?season=${year}`,
  );
  return {
    data: asList(response).map((r) => ({
      id: `${year}:${r.driver.id}`,
      driver_id: String(r.driver.id),
      season: r.season,
      points: r.points ?? 0,
      position: r.position,
    })),
  };
}

export async function replaceDriverRankings(
  seasonId: string,
  rankings: Array<{ driver_id: string; position: number; points: number }>,
): List<F1DriverRanking> {
  const { year } = parseSeasonId(seasonId);
  for (const row of rankings) {
    await bffRequest(`${PREFIX}/rankings/drivers`, {
      method: "POST",
      body: JSON.stringify({
        driverId: row.driver_id,
        season: year,
        position: row.position,
        points: row.points,
      }),
    });
  }
  return listDriverRankings(seasonId);
}

export async function listTeamRankings(seasonId: string): List<F1TeamRanking> {
  const { year } = parseSeasonId(seasonId);
  const response = await bffRequest<BffTeamRanking[]>(
    `${PREFIX}/rankings/teams?season=${year}`,
  );
  return {
    data: asList(response).map((r) => ({
      id: `${year}:${r.team.id}`,
      team_id: String(r.team.id),
      season: r.season,
      points: r.points ?? 0,
      position: r.position,
    })),
  };
}

export async function replaceTeamRankings(
  seasonId: string,
  rankings: Array<{ team_id: string; position: number; points: number }>,
): List<F1TeamRanking> {
  const { year } = parseSeasonId(seasonId);
  for (const row of rankings) {
    await bffRequest(`${PREFIX}/rankings/teams`, {
      method: "POST",
      body: JSON.stringify({
        teamId: row.team_id,
        season: year,
        position: row.position,
        points: row.points,
      }),
    });
  }
  return listTeamRankings(seasonId);
}

export async function listRaceResults(raceId: string): List<F1RaceResult> {
  const response = await bffRequest<BffRaceRanking[]>(
    `${PREFIX}/rankings/races?race=${encodeURIComponent(raceId)}`,
  );
  return {
    data: asList(response).map((r) => ({
      id: `${raceId}:${r.driver.id}`,
      race_id: raceId,
      driver_id: String(r.driver.id),
      team_id: r.team?.id != null ? String(r.team.id) : "",
      position: r.position,
      points: null,
      status: "classified" as F1ResultStatus,
    })),
  };
}

export async function replaceRaceResults(
  raceId: string,
  results: Array<{
    driver_id: string;
    team_id: string;
    position: number;
    points?: number;
    status?: F1ResultStatus;
  }>,
): List<F1RaceResult> {
  for (const row of results) {
    await bffRequest(`${PREFIX}/rankings/races`, {
      method: "POST",
      body: JSON.stringify({
        raceId,
        driverId: row.driver_id,
        position: row.position,
      }),
    });
  }
  return listRaceResults(raceId);
}
