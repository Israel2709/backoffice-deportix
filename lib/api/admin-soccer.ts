/**
 * Soccer (fútbol) admin API — Deportix MVP BFF via `/api/proxy`.
 * Envelope `{ response, results, errors }` unwrapped by `bffRequest`.
 * All public functions return `{ data: T }` / `{ data: T[] }` for the BO UI.
 */
import { bffRequest, v1Request } from "./bff-client";
import type { ApiListResponse } from "./types";
import type {
  MatchBoStatus,
  SeasonStatus,
  SoccerCountry,
  SoccerLeague,
  SoccerMatch,
  SoccerOrganizationRecord,
  SoccerParticipant,
  SoccerRound,
  SoccerSeason,
  SoccerStanding,
  SoccerTeam,
} from "./soccer-types";
import {
  parseSeasonId,
  seasonIdFor,
} from "./soccer-types";

export type { MatchBoStatus, SeasonStatus };

type List<T> = Promise<ApiListResponse<T>>;
type One<T> = Promise<{ data: T }>;

// ─── BFF raw shapes ───────────────────────────────────────────────────────────

type BffCountry = {
  name: string;
  code?: string | null;
  flag?: string | null;
};

type BffSeasonItem = {
  year: number | null;
  start?: string | null;
  end?: string | null;
  current?: boolean;
};

type BffLeagueEntry = {
  league: {
    id: number | string | null;
    name: string | null;
    type?: string | null;
    logo?: string | null;
  };
  country?: {
    name?: string | null;
    code?: string | null;
    flag?: string | null;
  };
  seasons?: BffSeasonItem[];
  organization?: {
    id?: string | null;
    name?: string | null;
    logo?: string | null;
  } | null;
};

type BffOrganization = {
  id: string;
  name: string;
  logo?: string | null;
  country?: {
    name?: string | null;
    code?: string | null;
    flag?: string | null;
  } | null;
};

type BffTeamEntry = {
  team: {
    id: number | string;
    name: string;
    code?: string | null;
    country?: string | null;
    logo?: string | null;
  };
  venue?: Record<string, unknown>;
};

type BffFixture = {
  fixture?: {
    id?: number | string | null;
    date?: string | null;
    status?: { short?: string | null; long?: string | null; elapsed?: number | null } | string | null;
  };
  league?: {
    id?: number | string | null;
    season?: number | string | null;
    round?: string | null;
  };
  teams?: {
    home?: { id?: number | string | null; name?: string | null; logo?: string | null };
    away?: { id?: number | string | null; name?: string | null; logo?: string | null };
  };
  goals?: { home?: number | null; away?: number | null };
};

type BffStandingRow = {
  rank?: number | null;
  team?: { id?: number | string | null; name?: string | null; logo?: string | null };
  points?: number | null;
  goalsDiff?: number | null;
  all?: {
    played?: number | null;
    win?: number | null;
    draw?: number | null;
    lose?: number | null;
    goals?: { for?: number | null; against?: number | null };
  };
};

type BffStandingsEntry = {
  league?: {
    id?: number | string | null;
    season?: number | null;
    standings?: BffStandingRow[][];
  };
};

type V1League = {
  id: string;
  name?: string | null;
  externalId?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asList<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function firstOf<T>(value: T | T[] | null | undefined): T | undefined {
  const list = asList(value);
  return list[0];
}

function leagueExternalId(entry: BffLeagueEntry): string {
  const raw = entry.league?.id;
  if (raw != null && String(raw) !== "") return String(raw);
  return "";
}

function deriveSeasonStatus(
  season: BffSeasonItem,
): SeasonStatus {
  if (season.current) return "current";
  if (season.end) {
    const end = Date.parse(season.end);
    if (!Number.isNaN(end) && end < Date.now()) return "finished";
  }
  return "upcoming";
}

function mapCountry(c: BffCountry): SoccerCountry {
  const name = c.name ?? "";
  return {
    id: name || c.code || "",
    name,
    code: c.code ?? null,
    flag: c.flag ?? null,
  };
}

function mapLeague(entry: BffLeagueEntry, fallbackId?: string): SoccerLeague {
  const countryName = entry.country?.name ?? null;
  return {
    id: leagueExternalId(entry) || fallbackId || "",
    name: entry.league?.name ?? "",
    type: entry.league?.type ?? "League",
    logo: entry.league?.logo ?? null,
    country_name: countryName,
    country_code: entry.country?.code ?? null,
    country_id: countryName,
    sport_id: "soccer",
    organization_id: entry.organization?.id ?? null,
    organization_name: entry.organization?.name ?? null,
  };
}

function mapOrganization(entry: BffOrganization): SoccerOrganizationRecord {
  const countryName = entry.country?.name ?? null;
  return {
    id: entry.id,
    name: entry.name,
    logo: entry.logo ?? null,
    country_id: countryName,
    country_name: countryName,
  };
}

function mapSeason(
  leagueId: string,
  item: BffSeasonItem,
): SoccerSeason | null {
  if (item.year == null || !Number.isFinite(item.year)) return null;
  const current = Boolean(item.current);
  return {
    id: seasonIdFor(leagueId, item.year),
    league_id: leagueId,
    year: item.year,
    name: String(item.year),
    start_date: item.start ?? null,
    end_date: item.end ?? null,
    current,
    status: deriveSeasonStatus(item),
  };
}

function mapTeam(entry: BffTeamEntry, leagueId: string): SoccerTeam {
  const id = String(entry.team.id);
  return {
    id,
    league_id: leagueId,
    name_short: entry.team.code ?? null,
    status: "active",
    team: {
      id: entry.team.id,
      name: entry.team.name,
      code: entry.team.code ?? null,
      country: entry.team.country ?? null,
      logo: entry.team.logo ?? null,
    },
  };
}

const LIVE_SHORT = new Set([
  "1H",
  "HT",
  "2H",
  "ET",
  "BT",
  "P",
  "LIVE",
  "INT",
]);
const FINISHED_SHORT = new Set(["FT", "AET", "PEN"]);
const CANCELLED_SHORT = new Set(["CANC", "ABD", "AWD", "WO"]);

function statusShortOf(fixture: BffFixture): string {
  const status = fixture.fixture?.status;
  if (typeof status === "string") return status;
  return status?.short ?? status?.long ?? "NS";
}

function toBoStatus(short: string): MatchBoStatus {
  const s = short.toUpperCase();
  if (LIVE_SHORT.has(s)) return "live";
  if (FINISHED_SHORT.has(s)) return "finished";
  if (CANCELLED_SHORT.has(s)) return "cancelled";
  return "scheduled";
}

function fromBoStatus(status: MatchBoStatus): string {
  switch (status) {
    case "live":
      return "LIVE";
    case "finished":
      return "FT";
    case "cancelled":
      return "CANC";
    default:
      return "NS";
  }
}

function mapFixture(raw: BffFixture, seasonId: string, leagueId: string): SoccerMatch {
  const short = statusShortOf(raw);
  const id = raw.fixture?.id != null ? String(raw.fixture.id) : "";
  return {
    id,
    league_id: leagueId,
    season_id: seasonId,
    home_team_id: raw.teams?.home?.id != null ? String(raw.teams.home.id) : "",
    away_team_id: raw.teams?.away?.id != null ? String(raw.teams.away.id) : "",
    fixture_date: raw.fixture?.date ?? "",
    status: short,
    bo_status: toBoStatus(short),
    goals: {
      home: raw.goals?.home ?? null,
      away: raw.goals?.away ?? null,
    },
    teams: {
      home: {
        name: raw.teams?.home?.name ?? "",
        logo: raw.teams?.home?.logo ?? null,
      },
      away: {
        name: raw.teams?.away?.name ?? "",
        logo: raw.teams?.away?.logo ?? null,
      },
    },
    league: { round: raw.league?.round ?? "" },
  };
}

function flattenStandings(
  entries: BffStandingsEntry[],
  seasonId: string,
  leagueId: string,
): SoccerStanding[] {
  const rows: SoccerStanding[] = [];
  for (const entry of entries) {
    const groups = entry.league?.standings ?? [];
    for (const group of groups) {
      for (const row of group) {
        const teamId = row.team?.id != null ? String(row.team.id) : "";
        const played = row.all?.played ?? 0;
        const wins = row.all?.win ?? 0;
        const draws = row.all?.draw ?? 0;
        const losses = row.all?.lose ?? 0;
        const goalsFor = row.all?.goals?.for ?? 0;
        const goalsAgainst = row.all?.goals?.against ?? 0;
        rows.push({
          // BFF list does not expose Firestore standing doc ids.
          id: `${seasonId}:${teamId}`,
          team_id: teamId,
          season_id: seasonId,
          league_id: leagueId,
          rank: row.rank ?? undefined,
          played: played ?? 0,
          goals_for: goalsFor ?? 0,
          goals_against: goalsAgainst ?? 0,
          goal_difference: row.goalsDiff ?? (goalsFor ?? 0) - (goalsAgainst ?? 0),
          points: row.points ?? 0,
          wins: wins ?? 0,
          draws: draws ?? 0,
          losses: losses ?? 0,
        });
      }
    }
  }
  return rows;
}

/** When BFF league.id is null (manual create without external_id), resolve via v1. */
async function resolveLeagueIdFallback(name: string): Promise<string> {
  try {
    const leagues = await v1Request<V1League[]>(
      `v1/leagues?sport=soccer&pageSize=100&sort=name`,
    );
    const match = (leagues ?? []).find(
      (l) => (l.name ?? "").toLowerCase() === name.toLowerCase(),
    );
    if (match?.externalId) return String(match.externalId);
    if (match?.id) return match.id;
  } catch {
    /* ignore — MVP may omit v1 */
  }
  return "";
}

async function fetchLeagueEntry(id: string): Promise<BffLeagueEntry | null> {
  const response = await bffRequest<BffLeagueEntry[] | BffLeagueEntry>(
    `leagues?id=${encodeURIComponent(id)}`,
  );
  return firstOf(response) ?? null;
}

async function ensureLeagueId(entry: BffLeagueEntry): Promise<string> {
  const id = leagueExternalId(entry);
  if (id) return id;
  const name = entry.league?.name ?? "";
  if (!name) return "";
  return resolveLeagueIdFallback(name);
}

// ─── Countries ────────────────────────────────────────────────────────────────

export async function listAdminCountries(): List<SoccerCountry> {
  const response = await bffRequest<BffCountry[]>("countries");
  return { data: asList(response).map(mapCountry) };
}

export async function createCountry(body: {
  name: string;
  code?: string | null;
  flag?: string | null;
}): One<SoccerCountry> {
  const response = await bffRequest<BffCountry[] | BffCountry>("countries", {
    method: "POST",
    body: JSON.stringify({
      name: body.name,
      code: body.code ?? null,
      flag: body.flag ?? null,
    }),
  });
  const created = firstOf(response);
  if (!created) throw new Error("Country create returned empty response");
  return { data: mapCountry(created) };
}

export async function updateCountry(
  id: string,
  body: Partial<{ name: string; code: string | null; flag: string | null }>,
): One<SoccerCountry> {
  // MVP keys countries by name (id is name or code).
  const response = await bffRequest<BffCountry[] | BffCountry>(
    `countries?name=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        name: body.name ?? id,
        code: body.code ?? null,
        flag: body.flag ?? null,
      }),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("Country update returned empty response");
  return { data: mapCountry(updated) };
}

export async function deleteCountry(id: string): Promise<void> {
  await bffRequest(`countries?name=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Leagues ──────────────────────────────────────────────────────────────────

export async function listAdminLeagues(): List<SoccerLeague> {
  const response = await bffRequest<BffLeagueEntry[]>("leagues");
  const data: SoccerLeague[] = [];
  for (const entry of asList(response)) {
    let id = leagueExternalId(entry);
    if (!id && entry.league?.name) {
      id = await resolveLeagueIdFallback(entry.league.name);
    }
    data.push(mapLeague(entry, id));
  }
  return { data };
}

export async function getAdminLeague(id: string): One<SoccerLeague> {
  const entry = await fetchLeagueEntry(id);
  if (!entry) throw new Error(`League not found: ${id}`);
  const resolved = await ensureLeagueId(entry);
  return { data: mapLeague(entry, resolved || id) };
}

export async function listAdminOrganizations(country?: string): List<SoccerOrganizationRecord> {
  const query = country?.trim()
    ? `organizations?country=${encodeURIComponent(country.trim())}`
    : "organizations";
  try {
    const response = await bffRequest<BffOrganization[] | BffOrganization>(query);
    return { data: asList(response).map(mapOrganization) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/\b404\b/.test(message) || /no encontrada/i.test(message)) {
      return { data: [] };
    }
    throw error;
  }
}

export async function createOrganization(body: {
  name: string;
  logo?: string | null;
  countryName: string;
}): One<SoccerOrganizationRecord> {
  const name = body.name.trim();
  if (!name) throw new Error("El nombre de la organización es obligatorio.");
  const countryName = body.countryName.trim();
  if (!countryName) throw new Error("El país es obligatorio.");

  const response = await bffRequest<BffOrganization[] | BffOrganization>("organizations", {
    method: "POST",
    body: JSON.stringify({
      name,
      logo: body.logo?.trim() || null,
      country: { name: countryName, code: null, flag: null },
    }),
  });
  const created = firstOf(response);
  if (!created) throw new Error("Organization create returned empty response");
  return { data: mapOrganization(created) };
}

export async function deleteOrganization(id: string): Promise<void> {
  await bffRequest(`organizations?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function createLeague(body: {
  name: string;
  name_alt?: string | null;
  country_id?: string | null;
  organization_id?: string | null;
  type?: string;
  logo?: string | null;
  logo_alt?: string | null;
}): One<SoccerLeague> {
  const countryName = body.country_id?.trim() || "World";
  const organizationId = body.organization_id?.trim();
  const response = await bffRequest<BffLeagueEntry[] | BffLeagueEntry>("leagues", {
    method: "POST",
    body: JSON.stringify({
      league: {
        name: body.name,
        type: body.type ?? "League",
        logo: body.logo ?? null,
      },
      country: {
        name: countryName,
        code: null,
        flag: null,
      },
      ...(organizationId ? { organization: { id: organizationId } } : {}),
      seasons: [],
    }),
  });
  const created = firstOf(response);
  if (!created) throw new Error("League create returned empty response");
  const id = (await ensureLeagueId(created)) || leagueExternalId(created);
  return { data: mapLeague(created, id) };
}

export async function updateLeague(
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
  const current = await fetchLeagueEntry(id);
  if (!current) throw new Error(`League not found: ${id}`);

  const seasons = (current.seasons ?? [])
    .filter((s): s is BffSeasonItem & { year: number } => s.year != null)
    .map((s) => ({
      year: s.year,
      start: s.start ?? null,
      end: s.end ?? null,
      current: Boolean(s.current),
    }));

  const response = await bffRequest<BffLeagueEntry[] | BffLeagueEntry>(
    `leagues?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        league: {
          name: body.name ?? current.league.name ?? "",
          type: body.type ?? current.league.type ?? "League",
          logo: body.logo !== undefined ? body.logo : (current.league.logo ?? null),
        },
        country: {
          name:
            body.country_id?.trim() ||
            current.country?.name ||
            "World",
          code: current.country?.code ?? null,
          flag: current.country?.flag ?? null,
        },
        seasons,
      }),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("League update returned empty response");
  return { data: mapLeague(updated, id) };
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function listAdminTeams(leagueId?: string): List<SoccerTeam> {
  if (leagueId) {
    const response = await bffRequest<BffTeamEntry[]>(
      `teams?league=${encodeURIComponent(leagueId)}`,
    );
    return { data: asList(response).map((t) => mapTeam(t, leagueId)) };
  }

  const leagues = await listAdminLeagues();
  const all: SoccerTeam[] = [];
  for (const league of leagues.data) {
    if (!league.id) continue;
    try {
      const response = await bffRequest<BffTeamEntry[]>(
        `teams?league=${encodeURIComponent(league.id)}`,
      );
      for (const t of asList(response)) {
        all.push(mapTeam(t, league.id));
      }
    } catch {
      /* skip leagues that fail team fetch */
    }
  }
  return { data: all };
}

export async function getAdminTeam(id: string): One<SoccerTeam> {
  const teams = await listAdminTeams();
  const found = teams.data.find((t) => t.id === id);
  if (!found) throw new Error(`Team not found: ${id}`);
  return { data: found };
}

export async function createTeam(body: {
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
  const response = await bffRequest<BffTeamEntry[] | BffTeamEntry>(
    `teams?league=${encodeURIComponent(body.league_id)}`,
    {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        code: body.abbreviation || body.name_short || null,
        country: body.country_name || body.country_id || null,
        logo: body.logo ?? null,
      }),
    },
  );
  const created = firstOf(response);
  if (!created) throw new Error("Team create returned empty response");
  return { data: mapTeam(created, body.league_id) };
}

export async function updateTeam(
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
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.abbreviation !== undefined || body.name_short !== undefined) {
    patch.code = body.abbreviation || body.name_short || null;
  }
  if (body.country_name !== undefined || body.country_id !== undefined) {
    patch.country = body.country_name || body.country_id || null;
  }
  if (body.logo !== undefined) patch.logo = body.logo;

  const response = await bffRequest<BffTeamEntry[] | BffTeamEntry>(
    `teams?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("Team update returned empty response");
  const leagueId = body.league_id ?? "";
  return { data: mapTeam(updated, leagueId) };
}

export async function deleteTeam(id: string): Promise<void | {
  data: SoccerTeam;
  message?: string;
}> {
  await bffRequest(`teams?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ─── Seasons ──────────────────────────────────────────────────────────────────

export async function listAdminSeasons(leagueId?: string): List<SoccerSeason> {
  if (!leagueId) {
    const leagues = await listAdminLeagues();
    const all: SoccerSeason[] = [];
    for (const league of leagues.data) {
      if (!league.id) continue;
      const { data } = await listAdminSeasons(league.id);
      all.push(...data);
    }
    return { data: all };
  }

  const entry = await fetchLeagueEntry(leagueId);
  if (entry?.seasons?.length) {
    const data = entry.seasons
      .map((s) => mapSeason(leagueId, s))
      .filter((s): s is SoccerSeason => s != null);
    return { data };
  }

  const years = await bffRequest<number[]>(
    `leagues/seasons?league=${encodeURIComponent(leagueId)}`,
  );
  const data = asList(years)
    .map((year) =>
      mapSeason(leagueId, { year, start: null, end: null, current: false }),
    )
    .filter((s): s is SoccerSeason => s != null);
  return { data };
}

export async function getAdminSeason(id: string): One<SoccerSeason> {
  const { leagueId, year } = parseSeasonId(id);
  const { data } = await listAdminSeasons(leagueId);
  const found = data.find((s) => s.year === year);
  if (found) return { data: found };
  return {
    data: {
      id,
      league_id: leagueId,
      year,
      name: String(year),
      start_date: null,
      end_date: null,
      current: false,
      status: "upcoming",
    },
  };
}

export async function createSeason(body: {
  league_id: string;
  year: number;
  name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: SeasonStatus;
}): One<SoccerSeason> {
  await bffRequest(
    `leagues/seasons?league=${encodeURIComponent(body.league_id)}`,
    {
      method: "POST",
      body: JSON.stringify({ year: body.year }),
    },
  );

  const current = body.status === "current";
  if (
    body.start_date != null ||
    body.end_date != null ||
    body.status != null
  ) {
    await bffRequest(
      `leagues/seasons?league=${encodeURIComponent(body.league_id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          year: body.year,
          current,
          start: body.start_date ?? null,
          end: body.end_date ?? null,
        }),
      },
    );
  }

  return getAdminSeason(seasonIdFor(body.league_id, body.year));
}

export async function updateSeason(
  id: string,
  body: Partial<{
    year: number;
    name: string | null;
    start_date: string | null;
    end_date: string | null;
    status: SeasonStatus;
  }>,
): One<SoccerSeason> {
  const { leagueId, year: seasonYear } = parseSeasonId(id);
  const existing = await getAdminSeason(id);
  const year = body.year ?? seasonYear;
  const current =
    body.status != null
      ? body.status === "current"
      : existing.data.current;

  await bffRequest(
    `leagues/seasons?league=${encodeURIComponent(leagueId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        year,
        current,
        start:
          body.start_date !== undefined
            ? body.start_date
            : existing.data.start_date,
        end:
          body.end_date !== undefined
            ? body.end_date
            : existing.data.end_date,
      }),
    },
  );

  return getAdminSeason(seasonIdFor(leagueId, year));
}

// ─── Participants (stub — MVP has no participants resource) ───────────────────

/**
 * MVP has no season participants collection. We derive participants from
 * GET `/teams?league=` for the season's league.
 */
export async function listParticipants(seasonId: string): List<SoccerParticipant> {
  const { leagueId } = parseSeasonId(seasonId);
  const teams = await listAdminTeams(leagueId);
  return {
    data: teams.data.map((team) => ({
      id: `${seasonId}:${team.id}`,
      season_id: seasonId,
      league_id: leagueId,
      team_id: team.id,
    })),
  };
}

/**
 * No-op save: MVP cannot persist season participants separately from league teams.
 * Returns the current league teams mapped as participants (ignores teamIds edits).
 */
export async function replaceParticipants(
  seasonId: string,
  _teamIds: string[],
): List<SoccerParticipant> {
  // Intentionally ignore _teamIds — there is no participants write API on MVP BFF.
  return listParticipants(seasonId);
}

// ─── Rounds ───────────────────────────────────────────────────────────────────

export async function listRounds(seasonId: string): List<SoccerRound> {
  const { leagueId, year } = parseSeasonId(seasonId);
  const names = await bffRequest<string[]>(
    `fixtures/rounds?league=${encodeURIComponent(leagueId)}&season=${year}`,
  );
  return {
    data: asList(names).map((name, index) => ({
      id: name,
      season_id: seasonId,
      league_id: leagueId,
      name,
      position: index + 1,
      phase: null,
    })),
  };
}

/**
 * Batch replace is not available. Creates missing round names via POST;
 * removals/renames are not deleted (BFF DELETE needs Firestore round id).
 */
export async function replaceRounds(
  seasonId: string,
  rounds: Array<{ name: string; position: number; phase?: string | null }>,
): List<SoccerRound> {
  const { leagueId, year } = parseSeasonId(seasonId);
  const existing = await listRounds(seasonId);
  const existingNames = new Set(existing.data.map((r) => r.name));

  const sorted = [...rounds].sort((a, b) => a.position - b.position);
  for (const round of sorted) {
    if (existingNames.has(round.name)) continue;
    await bffRequest(
      `fixtures/rounds?league=${encodeURIComponent(leagueId)}&season=${year}`,
      {
        method: "POST",
        body: JSON.stringify({
          name: round.name,
          position: round.position,
        }),
      },
    );
  }

  return listRounds(seasonId);
}

// ─── Matches / fixtures ───────────────────────────────────────────────────────

export async function listSeasonMatches(seasonId: string): List<SoccerMatch> {
  const { leagueId, year } = parseSeasonId(seasonId);
  const response = await bffRequest<BffFixture[]>(
    `fixtures?league=${encodeURIComponent(leagueId)}&season=${year}`,
  );
  return {
    data: asList(response).map((f) => mapFixture(f, seasonId, leagueId)),
  };
}

export async function saveMatchesBatch(
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
  const { leagueId, year } = parseSeasonId(seasonId);

  for (const match of matches) {
    const body = {
      fixture: {
        date: match.fixture_date || new Date().toISOString(),
        status: {
          short: fromBoStatus(match.status),
          long: match.status,
        },
      },
      league: {
        id: leagueId,
        season: year,
        round: match.round_name || match.round_id || null,
      },
      teams: {
        home: { id: match.home_team_id },
        away: { id: match.away_team_id },
      },
      goals: {
        home: match.goals_home ?? null,
        away: match.goals_away ?? null,
      },
    };

    if (match.id) {
      await bffRequest(`fixtures/${encodeURIComponent(match.id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } else {
      await bffRequest("fixtures", {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
  }

  return listSeasonMatches(seasonId);
}

// ─── Standings ────────────────────────────────────────────────────────────────

export async function listStandings(seasonId: string): List<SoccerStanding> {
  const { leagueId, year } = parseSeasonId(seasonId);
  const response = await bffRequest<BffStandingsEntry[]>(
    `standings?league=${encodeURIComponent(leagueId)}&season=${year}`,
  );
  return {
    data: flattenStandings(asList(response), seasonId, leagueId),
  };
}

/**
 * Replace standings: POST each row (BFF list has no Firestore standing ids for PATCH/DELETE).
 * Synthetic ids (`seasonId:teamId`) are not usable for DELETE.
 */
export async function replaceStandings(
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
  const { leagueId, year } = parseSeasonId(seasonId);

  for (const row of standings) {
    const wins = row.wins ?? 0;
    const draws = row.draws ?? 0;
    const losses = row.losses ?? 0;
    await bffRequest("standings", {
      method: "POST",
      body: JSON.stringify({
        league: { id: leagueId, season: year },
        team: { id: row.team_id },
        rank: row.rank,
        points: row.points,
        goalsDiff: row.goals_for - row.goals_against,
        all: {
          played: row.played,
          win: wins,
          draw: draws,
          lose: losses,
          goals: {
            for: row.goals_for,
            against: row.goals_against,
          },
        },
      }),
    });
  }

  return listStandings(seasonId);
}
