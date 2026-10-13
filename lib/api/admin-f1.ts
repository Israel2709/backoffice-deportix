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
  F1FastestLapEntry,
  F1Race,
  F1RaceHighlights,
  F1RaceResult,
  F1Season,
  F1SeasonParticipant,
  F1Session,
  F1SessionBoStatus,
  F1SessionType,
  F1StartingGridEntry,
  F1Team,
  F1TeamRanking,
  F1ResultStatus,
  SeasonStatus,
} from "./f1-types";
import type { F1CompetitionWriteBody } from "./f1-competition";
import { parseSeasonId, seasonIdFor } from "./f1-types";

export type { SeasonStatus, F1ResultStatus, F1SessionType, F1SessionBoStatus };

type List<T> = Promise<ApiListResponse<T>>;
type One<T> = Promise<{ data: T }>;

const PREFIX = "formula-1";

// ─── BFF raw shapes ───────────────────────────────────────────────────────────

type BffCompetition = {
  id: string;
  name: string;
  location?: string | { country?: string | null; city?: string | null } | null;
  seasonId?: string | null;
  branding?: { logoUrl?: string | null } | null;
};
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
  id: string;
  competitionId?: string | null;
  position: number;
  points?: number | null;
  wins?: number | null;
  podiums?: number | null;
  season: number;
  driver: { id: string; name: string };
  team?: { id: string; name: string } | null;
};
type BffTeamRanking = {
  id: string;
  competitionId?: string | null;
  position: number;
  points?: number | null;
  wins?: number | null;
  podiums?: number | null;
  season: number;
  team: { id: string; name: string };
};
type BffRaceRanking = {
  position: number;
  driver: { id: string; name: string };
  team?: { id: string; name: string } | null;
};
type BffStartingGrid = {
  race?: { id: string };
  position: number;
  time?: string | null;
  driver: { id: string; name: string };
  team?: { id: string; name: string } | null;
};
type BffFastestLap = {
  race?: { id: string };
  position: number;
  lap: number;
  time?: string | null;
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

function mapCompetitionLocation(
  location: BffCompetition["location"],
): string | null {
  if (location == null) return null;
  if (typeof location === "string") return location || null;
  return location.country?.trim() || location.city?.trim() || null;
}

function mapCompetition(c: BffCompetition): F1Competition {
  return {
    id: String(c.id),
    name: c.name,
    logo: c.branding?.logoUrl ?? null,
    location: mapCompetitionLocation(c.location),
    seasonId: c.seasonId ?? null,
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
    name: r.competition?.name ?? null,
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

export type ListCompetitionsFilters = {
  /** Year matching competition `seasonId` (e.g. 2026). */
  season?: number;
  /** Match against `location.country` (case-insensitive substring). */
  country?: string;
};

export async function listAdminCompetitions(
  filters: ListCompetitionsFilters = {},
): List<F1Competition> {
  const params = new URLSearchParams();
  if (filters.season != null) params.set("season", String(filters.season));
  if (filters.country?.trim()) params.set("country", filters.country.trim());
  // Bypass Vercel CDN copies of BFF list GETs so BO creates/edits show up.
  params.set("_cb", String(Date.now()));
  const response = await bffRequest<BffCompetition[]>(
    `${PREFIX}/competitions?${params.toString()}`,
  );
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

export async function getF1CompetitionDocument(
  id: string,
): One<Record<string, unknown>> {
  const response = await bffRequest<Record<string, unknown>[] | Record<string, unknown>>(
    `${PREFIX}/competitions?id=${encodeURIComponent(id)}`,
  );
  const found = firstOf(response);
  if (!found) throw new Error(`Competition not found: ${id}`);
  return { data: found as Record<string, unknown> };
}

export async function createF1CompetitionDocument(
  body: F1CompetitionWriteBody,
): One<F1Competition> {
  const response = await bffRequest<BffCompetition[] | BffCompetition>(
    `${PREFIX}/competitions`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  const created = firstOf(response);
  if (!created) throw new Error("Competition create returned empty response");
  return { data: mapCompetition(created) };
}

export async function updateF1CompetitionDocument(
  id: string,
  body: F1CompetitionWriteBody,
): One<F1Competition> {
  const response = await bffRequest<BffCompetition[] | BffCompetition>(
    `${PREFIX}/competitions?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("Competition update returned empty response");
  return { data: mapCompetition(updated) };
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

/** Global F1 season years available in the BFF (e.g. `[2026]`). */
export async function listAdminSeasonYears(): Promise<{ data: number[] }> {
  const years = await bffRequest<number[]>(`${PREFIX}/seasons`);
  return {
    data: asList(years)
      .filter((y) => Number.isFinite(y))
      .sort((a, b) => b - a),
  };
}

export async function listAdminF1Seasons(
  competitionId?: string,
): List<F1Season> {
  const { data: yearList } = await listAdminSeasonYears();

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

// ─── Participants (competition entries: driver + constructor) ─────────────────

type BffEntry = {
  id: string;
  competitionId: string;
  season: number;
  driver: { id: string; name?: string; number?: number | null };
  team: { id: string; name?: string };
  number?: number | null;
  role?: "race-driver" | "reserve-driver";
  active?: boolean;
};

function mapEntry(
  entry: BffEntry,
  seasonId: string,
): F1SeasonParticipant {
  return {
    id: String(entry.id),
    season_id: seasonId,
    competition_id: String(entry.competitionId),
    driver_id: String(entry.driver.id),
    team_id: String(entry.team.id),
    number: entry.number ?? entry.driver.number ?? null,
    role: entry.role ?? "race-driver",
  };
}

export async function listF1Participants(
  seasonId: string,
): List<F1SeasonParticipant> {
  const { competitionId, year } = parseSeasonId(seasonId);
  const response = await bffRequest<BffEntry[]>(
    `${PREFIX}/entries?competition=${encodeURIComponent(competitionId)}&season=${year}`,
  );
  return {
    data: asList(response).map((entry) => mapEntry(entry, seasonId)),
  };
}

export async function createF1Participant(
  seasonId: string,
  body: {
    driver_id: string;
    team_id: string;
    number?: number | null;
    role?: "race-driver" | "reserve-driver";
  },
): One<F1SeasonParticipant> {
  const { competitionId, year } = parseSeasonId(seasonId);
  const response = await bffRequest<BffEntry[] | BffEntry>(`${PREFIX}/entries`, {
    method: "POST",
    body: JSON.stringify({
      competitionId,
      season: year,
      driverId: body.driver_id,
      teamId: body.team_id,
      number: body.number ?? null,
      role: body.role ?? "race-driver",
    }),
  });
  const created = firstOf(response);
  if (!created) throw new Error("Entry create returned empty response");
  return { data: mapEntry(created, seasonId) };
}

export async function updateF1Participant(
  seasonId: string,
  entryId: string,
  body: Partial<{
    driver_id: string;
    team_id: string;
    number: number | null;
    role: "race-driver" | "reserve-driver";
    active: boolean;
  }>,
): One<F1SeasonParticipant> {
  const patch: Record<string, unknown> = {};
  if (body.driver_id !== undefined) patch.driverId = body.driver_id;
  if (body.team_id !== undefined) patch.teamId = body.team_id;
  if (body.number !== undefined) patch.number = body.number;
  if (body.role !== undefined) patch.role = body.role;
  if (body.active !== undefined) patch.active = body.active;

  const response = await bffRequest<BffEntry[] | BffEntry>(
    `${PREFIX}/entries?id=${encodeURIComponent(entryId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("Entry update returned empty response");
  return { data: mapEntry(updated, seasonId) };
}

export async function deleteF1Participant(
  _seasonId: string,
  entryId: string,
): Promise<void> {
  await bffRequest(`${PREFIX}/entries?id=${encodeURIComponent(entryId)}`, {
    method: "DELETE",
  });
}

/** Replace-all helper for panels that still batch-save. */
export async function replaceF1Participants(
  seasonId: string,
  participants: Array<{ driver_id: string; team_id: string }>,
): List<F1SeasonParticipant> {
  const current = await listF1Participants(seasonId);
  const currentIds = new Set(current.data.map((row) => row.id));
  const nextKeys = new Set(
    participants.map((row) => `${row.driver_id}:${row.team_id}`),
  );

  for (const row of current.data) {
    const key = `${row.driver_id}:${row.team_id}`;
    if (!nextKeys.has(key)) {
      await deleteF1Participant(seasonId, row.id);
      currentIds.delete(row.id);
    }
  }

  const remaining = await listF1Participants(seasonId);
  const remainingDrivers = new Set(remaining.data.map((row) => row.driver_id));
  for (const row of participants) {
    if (remainingDrivers.has(row.driver_id)) {
      const existing = remaining.data.find((r) => r.driver_id === row.driver_id);
      if (existing && existing.team_id !== row.team_id) {
        await updateF1Participant(seasonId, existing.id, {
          team_id: row.team_id,
        });
      }
      continue;
    }
    await createF1Participant(seasonId, row);
  }

  return listF1Participants(seasonId);
}

// ─── Races ────────────────────────────────────────────────────────────────────

/** All race sessions for a calendar year (all competitions). */
export async function listAdminRacesBySeason(year: number): List<F1Race> {
  const response = await bffRequest<BffRace[]>(
    `${PREFIX}/races?season=${year}`,
  );
  return { data: asList(response).map(mapRace) };
}

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
  type: string;
  status?: string;
}): One<F1Race> {
  const { year } = parseSeasonId(body.season_id);
  const response = await bffRequest<BffRace[] | BffRace>(`${PREFIX}/races`, {
    method: "POST",
    body: JSON.stringify({
      competitionId: body.competition_id,
      circuitId: body.circuit_id,
      season: year,
      type: body.type,
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
    type: string;
    status: string;
  }>,
): One<F1Race> {
  const patch: Record<string, unknown> = {};
  if (body.circuit_id !== undefined) patch.circuitId = body.circuit_id;
  if (body.race_date !== undefined) patch.date = body.race_date;
  if (body.type !== undefined) patch.type = body.type;
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

export type DriverRankingWrite = {
  id?: string;
  driver_id: string;
  position: number;
  points: number;
  wins: number;
  podiums: number;
};

export type TeamRankingWrite = {
  id?: string;
  team_id: string;
  position: number;
  points: number;
  wins: number;
  podiums: number;
};

export async function listDriverRankings(
  seasonId: string,
): List<F1DriverRanking> {
  const { competitionId, year } = parseSeasonId(seasonId);
  const response = await bffRequest<BffDriverRanking[]>(
    `${PREFIX}/rankings/drivers?season=${year}&competition=${encodeURIComponent(competitionId)}`,
  );
  return {
    data: asList(response).map((r) => ({
      id: String(r.id),
      competition_id: r.competitionId ?? null,
      driver_id: String(r.driver.id),
      season: r.season,
      points: r.points ?? 0,
      position: r.position,
      wins: r.wins ?? 0,
      podiums: r.podiums ?? 0,
    })),
  };
}

export async function replaceDriverRankings(
  seasonId: string,
  rankings: DriverRankingWrite[],
): List<F1DriverRanking> {
  const { competitionId, year } = parseSeasonId(seasonId);

  for (const row of rankings) {
    const body = {
      competitionId,
      driverId: row.driver_id,
      season: year,
      position: row.position,
      points: row.points,
      wins: row.wins,
      podiums: row.podiums,
    };
    if (row.id) {
      await bffRequest(
        `${PREFIX}/rankings/drivers?id=${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );
    } else {
      await bffRequest(`${PREFIX}/rankings/drivers`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
  }

  return listDriverRankings(seasonId);
}

export async function listTeamRankings(seasonId: string): List<F1TeamRanking> {
  const { competitionId, year } = parseSeasonId(seasonId);
  const response = await bffRequest<BffTeamRanking[]>(
    `${PREFIX}/rankings/teams?season=${year}&competition=${encodeURIComponent(competitionId)}`,
  );
  return {
    data: asList(response).map((r) => ({
      id: String(r.id),
      competition_id: r.competitionId ?? null,
      team_id: String(r.team.id),
      season: r.season,
      points: r.points ?? 0,
      position: r.position,
      wins: r.wins ?? 0,
      podiums: r.podiums ?? 0,
    })),
  };
}

export async function replaceTeamRankings(
  seasonId: string,
  rankings: TeamRankingWrite[],
): List<F1TeamRanking> {
  const { competitionId, year } = parseSeasonId(seasonId);

  for (const row of rankings) {
    const body = {
      competitionId,
      teamId: row.team_id,
      season: year,
      position: row.position,
      points: row.points,
      wins: row.wins,
      podiums: row.podiums,
    };
    if (row.id) {
      await bffRequest(
        `${PREFIX}/rankings/teams?id=${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );
    } else {
      await bffRequest(`${PREFIX}/rankings/teams`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
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
      driver_name: r.driver.name ?? null,
      team_id: r.team?.id != null ? String(r.team.id) : "",
      team_name: r.team?.name ?? null,
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

export async function listStartingGrid(
  raceId: string,
): List<F1StartingGridEntry> {
  const response = await bffRequest<BffStartingGrid[]>(
    `${PREFIX}/rankings/startinggrid?race=${encodeURIComponent(raceId)}`,
  );
  return {
    data: asList(response).map((r) => ({
      id: `${raceId}:grid:${r.driver.id}`,
      race_id: raceId,
      driver_id: String(r.driver.id),
      driver_name: r.driver.name ?? null,
      team_id: r.team?.id != null ? String(r.team.id) : "",
      team_name: r.team?.name ?? null,
      position: r.position,
      time: r.time ?? null,
    })),
  };
}

export async function setRacePole(
  raceId: string,
  driverId: string,
): Promise<void> {
  await bffRequest(`${PREFIX}/rankings/startinggrid`, {
    method: "POST",
    body: JSON.stringify({
      raceId,
      driverId,
      position: 1,
    }),
  });
}

export async function listFastestLaps(
  raceId: string,
): List<F1FastestLapEntry> {
  const response = await bffRequest<BffFastestLap[]>(
    `${PREFIX}/rankings/fastestlaps?race=${encodeURIComponent(raceId)}`,
  );
  return {
    data: asList(response).map((r) => ({
      id: `${raceId}:fl:${r.driver.id}`,
      race_id: raceId,
      driver_id: String(r.driver.id),
      driver_name: r.driver.name ?? null,
      team_id: r.team?.id != null ? String(r.team.id) : "",
      team_name: r.team?.name ?? null,
      position: r.position,
      lap: r.lap,
      time: r.time ?? null,
    })),
  };
}

export async function setFastestLap(
  raceId: string,
  driverId: string,
): Promise<void> {
  await bffRequest(`${PREFIX}/rankings/fastestlaps`, {
    method: "POST",
    body: JSON.stringify({
      raceId,
      driverId,
      position: 1,
      lap: 1,
    }),
  });
}

function driverLabel(entry?: {
  driver_name?: string | null;
  driver_id?: string;
} | null): string {
  if (!entry) return "—";
  return entry.driver_name?.trim() || entry.driver_id || "—";
}

export async function getRaceHighlights(
  raceId: string,
): Promise<F1RaceHighlights> {
  const [results, grid, fastest] = await Promise.all([
    listRaceResults(raceId),
    listStartingGrid(raceId),
    listFastestLaps(raceId),
  ]);

  const byPos = new Map(results.data.map((r) => [r.position, r]));
  const p1 = byPos.get(1);
  const p2 = byPos.get(2);
  const p3 = byPos.get(3);
  const pole = grid.data.find((g) => g.position === 1) ?? null;
  const fl =
    fastest.data.find((f) => f.position === 1) ?? fastest.data[0] ?? null;

  const winningTeam = p1?.team_name?.trim() || "—";
  const poleName = driverLabel(pole);
  const winnerName = driverLabel(p1);

  return {
    race_id: raceId,
    p1: winnerName,
    p2: driverLabel(p2),
    p3: driverLabel(p3),
    fastest_lap: driverLabel(fl),
    race_pole: poleName,
    winning_team: winningTeam,
    sprint_pole: poleName,
    sprint_winner: winnerName,
    sprint_winning_team: winningTeam,
    p1_driver_id: p1?.driver_id ?? "",
    p2_driver_id: p2?.driver_id ?? "",
    p3_driver_id: p3?.driver_id ?? "",
    pole_driver_id: pole?.driver_id ?? "",
    fastest_driver_id: fl?.driver_id ?? "",
    winning_team_id: p1?.team_id ?? "",
  };
}

/** Persist podium (P1–P3), pole and fastest lap for a race session. */
export async function saveRaceHighlights(
  raceId: string,
  input: {
    p1_driver_id: string;
    p2_driver_id?: string;
    p3_driver_id?: string;
    pole_driver_id?: string;
    fastest_driver_id?: string;
    winning_team_id?: string;
  },
): Promise<F1RaceHighlights> {
  const podium: Array<{
    driver_id: string;
    team_id: string;
    position: number;
  }> = [];

  if (input.p1_driver_id) {
    podium.push({
      driver_id: input.p1_driver_id,
      team_id: input.winning_team_id ?? "",
      position: 1,
    });
  }
  if (input.p2_driver_id) {
    podium.push({
      driver_id: input.p2_driver_id,
      team_id: "",
      position: 2,
    });
  }
  if (input.p3_driver_id) {
    podium.push({
      driver_id: input.p3_driver_id,
      team_id: "",
      position: 3,
    });
  }

  if (podium.length > 0) {
    await replaceRaceResults(raceId, podium);
  }
  if (input.pole_driver_id) {
    await setRacePole(raceId, input.pole_driver_id);
  }
  if (input.fastest_driver_id) {
    await setFastestLap(raceId, input.fastest_driver_id);
  }

  return getRaceHighlights(raceId);
}
