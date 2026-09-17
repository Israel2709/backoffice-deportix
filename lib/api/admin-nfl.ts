/**
 * NFL (American Football) admin API — Deportix MVP BFF via `/api/proxy`.
 * Paths under `/american-football/*`. Envelope `{ response }` unwrapped by `bffRequest`.
 * All public functions return `{ data: T }` / `{ data: T[] }` for the BO UI.
 */
import { bffRequest } from "./bff-client";
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
import { parseSeasonId, seasonIdFor } from "./nfl-types";

export type { GameBoStatus, SeasonStatus };

type List<T> = Promise<ApiListResponse<T>>;
type One<T> = Promise<{ data: T }>;

const PREFIX = "american-football";

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
    id: string | number | null;
    name: string | null;
    type?: string | null;
    logo?: string | null;
    altLogo?: string | null;
  };
  country?: {
    name?: string | null;
    code?: string | null;
    flag?: string | null;
  };
  seasons?: BffSeasonItem[];
};

type BffTeamItem = {
  id: string;
  name: string;
  logo?: string | null;
  altLogo?: string | null;
};

type BffGameItem = {
  game: {
    id: string;
    stage?: string | null;
    week?: string | null;
    date?: {
      timezone?: string | null;
      date?: string | null;
      time?: string | null;
      timestamp?: number | null;
    };
    status?: { short?: string | null; long?: string | null; timer?: string | null };
  };
  league: {
    id: string;
    name?: string;
    season?: number | string;
    logo?: string | null;
  };
  teams: {
    home: { id: string; name: string; logo?: string | null };
    away: { id: string; name: string; logo?: string | null };
  };
  scores?: {
    home?: { total?: number | null };
    away?: { total?: number | null };
  };
};

type BffStandingItem = {
  id: string;
  league?: { id?: string; season?: number | string };
  conference?: string | null;
  division?: string | null;
  position?: number | null;
  team?: { id?: string; name?: string; logo?: string | null };
  won?: number | null;
  lost?: number | null;
  ties?: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asList<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function firstOf<T>(value: T | T[] | null | undefined): T | undefined {
  return asList(value)[0];
}

function leagueExternalId(entry: BffLeagueEntry): string {
  const raw = entry.league?.id;
  if (raw != null && String(raw) !== "") return String(raw);
  return "";
}

function deriveSeasonStatus(season: BffSeasonItem): SeasonStatus {
  if (season.current) return "current";
  if (season.end) {
    const end = Date.parse(season.end);
    if (!Number.isNaN(end) && end < Date.now()) return "finished";
  }
  return "upcoming";
}

function mapCountry(c: BffCountry): NflCountry {
  const name = c.name ?? "";
  return {
    id: name || c.code || "",
    name,
    code: c.code ?? null,
    flag: c.flag ?? null,
  };
}

function mapLeague(entry: BffLeagueEntry, fallbackId?: string): NflLeague {
  const countryName = entry.country?.name ?? null;
  return {
    id: leagueExternalId(entry) || fallbackId || "",
    name: entry.league?.name ?? "",
    type: entry.league?.type ?? "League",
    logo: entry.league?.logo ?? null,
    logo_alt: entry.league?.altLogo ?? null,
    country_name: countryName,
    country_code: entry.country?.code ?? null,
    country_id: countryName,
    sport_id: "american-football",
  };
}

function mapSeason(leagueId: string, item: BffSeasonItem): NflSeason | null {
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

function mapTeam(item: BffTeamItem, leagueId: string): NflTeam {
  return {
    id: String(item.id),
    league_id: leagueId,
    team: {
      id: item.id,
      name: item.name,
      city: null,
      logo: item.logo ?? null,
    },
    conference: null,
    division: null,
  };
}

const LIVE_SHORT = new Set([
  "LIVE",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "OT",
  "HT",
]);
const FINISHED_SHORT = new Set(["FT", "AOT", "FINAL"]);
const CANCELLED_SHORT = new Set(["CANC", "PST", "SUSP"]);

function statusShortOf(game: BffGameItem): string {
  return game.game?.status?.short ?? game.game?.status?.long ?? "NS";
}

function toBoStatus(short: string): GameBoStatus {
  const s = short.toUpperCase();
  if (LIVE_SHORT.has(s)) return "live";
  if (FINISHED_SHORT.has(s)) return "finished";
  if (CANCELLED_SHORT.has(s)) return "cancelled";
  return "scheduled";
}

function fromBoStatus(status: GameBoStatus): string {
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

function gameDateIso(game: BffGameItem): string {
  const d = game.game?.date;
  if (d?.date && d?.time) return `${d.date}T${d.time}`;
  if (d?.date) return d.date;
  if (d?.timestamp != null) {
    try {
      return new Date(d.timestamp * 1000).toISOString();
    } catch {
      /* ignore */
    }
  }
  return "";
}

function mapGame(raw: BffGameItem, seasonId: string, leagueId: string): NflGame {
  const short = statusShortOf(raw);
  return {
    id: String(raw.game?.id ?? ""),
    league_id: leagueId,
    season_id: seasonId,
    home_team_id: String(raw.teams?.home?.id ?? ""),
    away_team_id: String(raw.teams?.away?.id ?? ""),
    game_date: gameDateIso(raw),
    status: short,
    bo_status: toBoStatus(short),
    scores: {
      home: { total: raw.scores?.home?.total ?? null },
      away: { total: raw.scores?.away?.total ?? null },
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
    game: { week: raw.game?.week ?? null },
  };
}

function mapStanding(
  row: BffStandingItem,
  seasonId: string,
  leagueId: string,
): NflStanding {
  const won = row.won ?? 0;
  const lost = row.lost ?? 0;
  const ties = row.ties ?? 0;
  const played = won + lost + ties;
  const teamId = row.team?.id != null ? String(row.team.id) : "";
  return {
    id: row.id || `${seasonId}:${teamId}`,
    team_id: teamId,
    season_id: seasonId,
    league_id: leagueId,
    rank: row.position ?? undefined,
    position: row.position ?? undefined,
    played,
    won,
    lost,
    ties,
  };
}

async function fetchLeagueEntry(id: string): Promise<BffLeagueEntry | null> {
  const response = await bffRequest<BffLeagueEntry[] | BffLeagueEntry>(
    `${PREFIX}/leagues?id=${encodeURIComponent(id)}`,
  );
  return firstOf(response) ?? null;
}

function synthesizeWeeks(seasonId: string, leagueId: string): NflRound[] {
  return Array.from({ length: 18 }, (_, i) => {
    const week = i + 1;
    return {
      id: `Week ${week}`,
      season_id: seasonId,
      league_id: leagueId,
      name: `Week ${week}`,
      position: week,
      phase: "regular",
    };
  });
}

// ─── Countries ────────────────────────────────────────────────────────────────

export async function listAdminCountries(): List<NflCountry> {
  const response = await bffRequest<BffCountry[]>(`${PREFIX}/countries`);
  return { data: asList(response).map(mapCountry) };
}

export async function createCountry(body: {
  name: string;
  code?: string | null;
  flag?: string | null;
}): One<NflCountry> {
  const response = await bffRequest<BffCountry[] | BffCountry>(
    `${PREFIX}/countries`,
    {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        code: body.code ?? null,
        flag: body.flag ?? null,
      }),
    },
  );
  const created = firstOf(response);
  if (!created) throw new Error("Country create returned empty response");
  return { data: mapCountry(created) };
}

export async function updateCountry(
  id: string,
  body: Partial<{ name: string; code: string | null; flag: string | null }>,
): One<NflCountry> {
  const response = await bffRequest<BffCountry[] | BffCountry>(
    `${PREFIX}/countries?name=${encodeURIComponent(id)}`,
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

// ─── Leagues ──────────────────────────────────────────────────────────────────

export async function listAdminLeagues(): List<NflLeague> {
  const response = await bffRequest<BffLeagueEntry[]>(`${PREFIX}/leagues`);
  return {
    data: asList(response).map((entry) => mapLeague(entry)),
  };
}

export async function getAdminLeague(id: string): One<NflLeague> {
  const entry = await fetchLeagueEntry(id);
  if (!entry) throw new Error(`League not found: ${id}`);
  return { data: mapLeague(entry, id) };
}

export async function createLeague(body: {
  name: string;
  name_alt?: string | null;
  country_id?: string | null;
  type?: string;
  logo?: string | null;
  logo_alt?: string | null;
}): One<NflLeague> {
  const countryName = body.country_id?.trim() || "USA";
  const response = await bffRequest<BffLeagueEntry[] | BffLeagueEntry>(
    `${PREFIX}/leagues`,
    {
      method: "POST",
      body: JSON.stringify({
        league: {
          name: body.name,
          type: body.type ?? "League",
          logo: body.logo ?? null,
          altLogo: body.logo_alt ?? null,
        },
        country: {
          name: countryName,
          code: null,
          flag: null,
        },
        seasons: [],
      }),
    },
  );
  const created = firstOf(response);
  if (!created) throw new Error("League create returned empty response");
  return { data: mapLeague(created) };
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
): One<NflLeague> {
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
    `${PREFIX}/leagues?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        league: {
          name: body.name ?? current.league.name ?? "",
          type: body.type ?? current.league.type ?? "League",
          logo: body.logo !== undefined ? body.logo : (current.league.logo ?? null),
          altLogo:
            body.logo_alt !== undefined
              ? body.logo_alt
              : (current.league.altLogo ?? null),
        },
        country: {
          name:
            body.country_id?.trim() ||
            current.country?.name ||
            "USA",
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

export async function listAdminTeams(leagueId?: string): List<NflTeam> {
  if (leagueId) {
    const seasons = await listAdminSeasons(leagueId);
    const year =
      seasons.data.find((s) => s.current)?.year ?? seasons.data[0]?.year;
    if (year == null) return { data: [] };
    const response = await bffRequest<BffTeamItem[]>(
      `${PREFIX}/teams?league=${encodeURIComponent(leagueId)}&season=${year}`,
    );
    return { data: asList(response).map((t) => mapTeam(t, leagueId)) };
  }

  const leagues = await listAdminLeagues();
  const all: NflTeam[] = [];
  const seen = new Set<string>();
  for (const league of leagues.data) {
    if (!league.id) continue;
    try {
      const { data } = await listAdminTeams(league.id);
      for (const t of data) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        all.push(t);
      }
    } catch {
      /* skip */
    }
  }
  return { data: all };
}

export async function getAdminTeam(id: string): One<NflTeam> {
  const teams = await listAdminTeams();
  const found = teams.data.find((t) => t.id === id);
  if (!found) throw new Error(`Team not found: ${id}`);
  return { data: found };
}

export async function createTeam(body: {
  name: string;
  city?: string | null;
  league_id: string;
  logo?: string | null;
  conference?: string | null;
  division?: string | null;
}): One<NflTeam> {
  const response = await bffRequest<BffTeamItem[] | BffTeamItem>(
    `${PREFIX}/teams?league=${encodeURIComponent(body.league_id)}`,
    {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        logo: body.logo ?? null,
      }),
    },
  );
  const created = firstOf(response);
  if (!created) throw new Error("Team create returned empty response");
  const mapped = mapTeam(created, body.league_id);
  return {
    data: {
      ...mapped,
      team: { ...mapped.team, city: body.city ?? null },
      conference: body.conference ?? null,
      division: body.division ?? null,
    },
  };
}

export async function updateTeam(
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
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.logo !== undefined) patch.logo = body.logo;

  const response = await bffRequest<BffTeamItem[] | BffTeamItem>(
    `${PREFIX}/teams?id=${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("Team update returned empty response");
  const mapped = mapTeam(updated, body.league_id ?? "");
  return {
    data: {
      ...mapped,
      team: {
        ...mapped.team,
        city: body.city !== undefined ? body.city : mapped.team.city,
      },
      conference:
        body.conference !== undefined ? body.conference : mapped.conference,
      division: body.division !== undefined ? body.division : mapped.division,
    },
  };
}

export async function deleteTeam(id: string): Promise<void> {
  await bffRequest(`${PREFIX}/teams?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Seasons ──────────────────────────────────────────────────────────────────

export async function listAdminSeasons(leagueId?: string): List<NflSeason> {
  if (!leagueId) {
    const leagues = await listAdminLeagues();
    const all: NflSeason[] = [];
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
      .filter((s): s is NflSeason => s != null);
    return { data };
  }

  const years = await bffRequest<number[]>(
    `${PREFIX}/seasons?league=${encodeURIComponent(leagueId)}`,
  );
  const data = asList(years)
    .map((year) =>
      mapSeason(leagueId, { year, start: null, end: null, current: false }),
    )
    .filter((s): s is NflSeason => s != null);
  return { data };
}

export async function getAdminSeason(id: string): One<NflSeason> {
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
}): One<NflSeason> {
  await bffRequest(
    `${PREFIX}/seasons?league=${encodeURIComponent(body.league_id)}`,
    {
      method: "POST",
      body: JSON.stringify({ year: body.year }),
    },
  );

  if (
    body.start_date != null ||
    body.end_date != null ||
    body.status != null
  ) {
    await bffRequest(
      `${PREFIX}/seasons?league=${encodeURIComponent(body.league_id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          year: body.year,
          current: body.status === "current",
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
): One<NflSeason> {
  const { leagueId, year: seasonYear } = parseSeasonId(id);
  const existing = await getAdminSeason(id);
  const year = body.year ?? seasonYear;
  const current =
    body.status != null
      ? body.status === "current"
      : existing.data.current;

  await bffRequest(
    `${PREFIX}/seasons?league=${encodeURIComponent(leagueId)}`,
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

// ─── Participants (stub — derive from teams) ──────────────────────────────────

export async function listParticipants(seasonId: string): List<NflParticipant> {
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

export async function replaceParticipants(
  seasonId: string,
  _teamIds: string[],
): List<NflParticipant> {
  return listParticipants(seasonId);
}

// ─── Rounds (synthetic weeks 1–18) ────────────────────────────────────────────

export async function listRounds(seasonId: string): List<NflRound> {
  const { leagueId } = parseSeasonId(seasonId);
  return { data: synthesizeWeeks(seasonId, leagueId) };
}

export async function replaceRounds(
  seasonId: string,
  _rounds: Array<{ name: string; position: number; phase?: string | null }>,
): List<NflRound> {
  return listRounds(seasonId);
}

// ─── Games ────────────────────────────────────────────────────────────────────

export async function listSeasonGames(seasonId: string): List<NflGame> {
  const { leagueId, year } = parseSeasonId(seasonId);
  const response = await bffRequest<BffGameItem[]>(
    `${PREFIX}/games?league=${encodeURIComponent(leagueId)}&season=${year}`,
  );
  return {
    data: asList(response).map((g) => mapGame(g, seasonId, leagueId)),
  };
}

export async function saveGamesBatch(
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
  const { leagueId, year } = parseSeasonId(seasonId);
  const league = await getAdminLeague(leagueId);
  const teams = await listAdminTeams(leagueId);
  const teamById = new Map(teams.data.map((t) => [t.id, t]));

  for (const game of games) {
    const home = teamById.get(game.home_team_id);
    const away = teamById.get(game.away_team_id);
    const dateIso = game.game_date || new Date().toISOString();
    const datePart = dateIso.slice(0, 10);
    const timePart = dateIso.length > 10 ? dateIso.slice(11, 16) : "00:00";

    const body = {
      game: {
        week: game.week || game.round_id || null,
        date: {
          date: datePart,
          time: timePart,
          timezone: "UTC",
        },
        status: {
          short: fromBoStatus(game.status),
          long: game.status,
        },
      },
      league: {
        id: leagueId,
        name: league.data.name,
        season: year,
        logo: league.data.logo,
      },
      teams: {
        home: {
          id: game.home_team_id,
          name: home?.team.name ?? "",
          logo: home?.team.logo ?? null,
        },
        away: {
          id: game.away_team_id,
          name: away?.team.name ?? "",
          logo: away?.team.logo ?? null,
        },
      },
      scores: {
        home: { total: game.score_home ?? null },
        away: { total: game.score_away ?? null },
      },
    };

    if (game.id) {
      await bffRequest(
        `${PREFIX}/games/${encodeURIComponent(game.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );
    } else {
      await bffRequest(`${PREFIX}/games`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
  }

  return listSeasonGames(seasonId);
}

// ─── Standings ────────────────────────────────────────────────────────────────

export async function listStandings(seasonId: string): List<NflStanding> {
  const { leagueId, year } = parseSeasonId(seasonId);
  const response = await bffRequest<BffStandingItem[]>(
    `${PREFIX}/standings?league=${encodeURIComponent(leagueId)}&season=${year}`,
  );
  return {
    data: asList(response).map((row) => mapStanding(row, seasonId, leagueId)),
  };
}

export async function replaceStandings(
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
  const { leagueId, year } = parseSeasonId(seasonId);
  const league = await getAdminLeague(leagueId);
  const teams = await listAdminTeams(leagueId);
  const teamById = new Map(teams.data.map((t) => [t.id, t]));

  for (const row of standings) {
    const team = teamById.get(row.team_id);
    await bffRequest(`${PREFIX}/standings`, {
      method: "POST",
      body: JSON.stringify({
        league: {
          id: leagueId,
          name: league.data.name,
          season: year,
          logo: league.data.logo,
        },
        team: {
          id: row.team_id,
          name: team?.team.name ?? "",
          logo: team?.team.logo ?? null,
        },
        position: row.rank,
        won: row.won ?? 0,
        lost: row.lost ?? 0,
        ties: row.ties ?? 0,
      }),
    });
  }

  return listStandings(seasonId);
}
