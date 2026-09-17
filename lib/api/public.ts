import { bffRequest, v1Request } from "./bff-client";
import type { ApiListResponse, CollectionStats, NamedEntity } from "./types";

const EMPTY_STATS: CollectionStats = {
  sports: 0,
  countries: 0,
  leagues: 0,
  seasons: 0,
  soccer_teams: 0,
  soccer_matches: 0,
  soccer_standings: 0,
  nfl_teams: 0,
  nfl_games: 0,
  nfl_standings: 0,
  f1_teams: 0,
  f1_drivers: 0,
  f1_races: 0,
  f1_rankings: 0,
  f1_race_rankings: 0,
};

type DataStatusPayload = {
  leagues?: Array<{
    id?: string;
    sport?: string | null;
    coverage?: {
      teams?: boolean;
      matches?: boolean;
      standings?: boolean;
    };
    availableSeasons?: number[];
  }>;
  sports?: unknown[];
};

function asList<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Home dashboard KPIs. Prefers `v1/data-status`; falls back to empty-friendly defaults.
 */
export async function getStats(): Promise<CollectionStats> {
  try {
    const data = await v1Request<DataStatusPayload>("v1/data-status");
    const leagues = data?.leagues ?? [];
    const soccer = leagues.filter((l) => l.sport === "soccer");
    const nfl = leagues.filter(
      (l) => l.sport === "american-football" || l.sport === "nfl",
    );
    const f1 = leagues.filter(
      (l) => l.sport === "formula-1" || l.sport === "f1",
    );

    return {
      ...EMPTY_STATS,
      leagues: leagues.length,
      sports:
        data?.sports?.length ??
        new Set(leagues.map((l) => l.sport).filter(Boolean)).size,
      seasons: leagues.reduce(
        (acc, l) => acc + (l.availableSeasons?.length ?? 0),
        0,
      ),
      soccer_teams: soccer.filter((l) => l.coverage?.teams).length,
      soccer_matches: soccer.filter((l) => l.coverage?.matches).length,
      soccer_standings: soccer.filter((l) => l.coverage?.standings).length,
      nfl_teams: nfl.filter((l) => l.coverage?.teams).length,
      nfl_games: nfl.filter((l) => l.coverage?.matches).length,
      nfl_standings: nfl.filter((l) => l.coverage?.standings).length,
      f1_teams: f1.length,
      f1_drivers: f1.length,
      f1_races: f1.filter((l) => l.coverage?.matches).length,
    };
  } catch {
    return { ...EMPTY_STATS };
  }
}

export async function getSports(): Promise<ApiListResponse<NamedEntity>> {
  try {
    const data = await v1Request<NamedEntity[]>("v1/sports");
    return { data: data ?? [] };
  } catch {
    return { data: [] };
  }
}

export async function getCountries(): Promise<ApiListResponse<NamedEntity>> {
  try {
    const response = await bffRequest<
      Array<{ name: string; code?: string | null; flag?: string | null }>
    >("countries");
    return {
      data: (response ?? []).map((c) => ({
        id: c.name,
        name: c.name,
        slug: c.code ?? undefined,
        flag_url: c.flag ?? null,
      })),
    };
  } catch {
    return { data: [] };
  }
}

export async function getLeagues(
  sport?: string,
): Promise<ApiListResponse<NamedEntity>> {
  try {
    const sportParam =
      sport === "nfl" ? "american-football" : sport;
    const query = sportParam
      ? `v1/leagues?sport=${encodeURIComponent(sportParam)}&pageSize=100`
      : "v1/leagues?pageSize=100";
    const data = await v1Request<NamedEntity[]>(query);
    return { data: data ?? [] };
  } catch {
    if (sport === "nfl" || sport === "american-football") {
      try {
        const leagues = await bffRequest<
          Array<{
            league?: { id?: string; name?: string | null };
          }>
        >("american-football/leagues");
        return {
          data: asList(leagues).map((e) => ({
            id: String(e.league?.id ?? ""),
            name: e.league?.name ?? "",
          })),
        };
      } catch {
        return { data: [] };
      }
    }
    return { data: [] };
  }
}

export async function getSoccerTeams(): Promise<ApiListResponse<NamedEntity>> {
  return { data: [] };
}

export async function getNflTeams(): Promise<ApiListResponse<NamedEntity>> {
  try {
    const leagues = await bffRequest<
      Array<{
        league?: {
          id?: string;
          name?: string | null;
        };
        seasons?: Array<{ year?: number | null; current?: boolean }>;
      }>
    >("american-football/leagues");
    const all: NamedEntity[] = [];
    const seen = new Set<string>();

    for (const entry of asList(leagues)) {
      const leagueId = entry.league?.id;
      if (!leagueId) continue;
      const year =
        entry.seasons?.find((s) => s.current)?.year ??
        entry.seasons?.[0]?.year;
      if (year == null) continue;
      try {
        const teams = await bffRequest<
          Array<{ id: string; name: string; logo?: string | null }>
        >(
          `american-football/teams?league=${encodeURIComponent(String(leagueId))}&season=${year}`,
        );
        for (const t of asList(teams)) {
          if (seen.has(t.id)) continue;
          seen.add(t.id);
          all.push({
            id: t.id,
            name: t.name,
            logo: t.logo ?? null,
          });
        }
      } catch {
        /* skip league */
      }
    }
    return { data: all };
  } catch {
    return { data: [] };
  }
}

export async function getF1Drivers(): Promise<ApiListResponse<NamedEntity>> {
  try {
    const drivers = await bffRequest<
      Array<{
        id: string;
        name: string;
        number?: number | null;
      }>
    >("formula-1/drivers");
    return {
      data: asList(drivers).map((d) => ({
        id: d.id,
        name: d.name,
        number: d.number ?? undefined,
      })),
    };
  } catch {
    return { data: [] };
  }
}

export async function getF1Teams(): Promise<ApiListResponse<NamedEntity>> {
  try {
    const teams = await bffRequest<
      Array<{ id: string; name: string; logo?: string | null }>
    >("formula-1/teams");
    return {
      data: asList(teams).map((t) => ({
        id: t.id,
        name: t.name,
        logo: t.logo ?? null,
      })),
    };
  } catch {
    return { data: [] };
  }
}

export async function getF1Circuits(): Promise<ApiListResponse<NamedEntity>> {
  try {
    const circuits = await bffRequest<
      Array<{
        id: string;
        name: string;
        country?: string | null;
      }>
    >("formula-1/circuits");
    return {
      data: asList(circuits).map((c) => ({
        id: c.id,
        name: c.name,
        country: c.country ?? undefined,
        country_name: c.country ?? undefined,
      })),
    };
  } catch {
    return { data: [] };
  }
}

export async function getF1Races(): Promise<ApiListResponse<NamedEntity>> {
  try {
    const years = await bffRequest<number[]>("formula-1/seasons");
    const year = asList(years).sort((a, b) => b - a)[0];
    if (year == null) return { data: [] };
    const races = await bffRequest<
      Array<{
        id: string;
        competition?: { name?: string };
        type?: string;
        date?: string;
        status?: string;
      }>
    >(`formula-1/races?season=${year}`);
    return {
      data: asList(races).map((r) => ({
        id: r.id,
        name: r.type ?? r.competition?.name ?? "Carrera",
        competition_name: r.competition?.name,
        date: r.date,
        status: r.status,
      })),
    };
  } catch {
    return { data: [] };
  }
}

export async function getF1Competitions(): Promise<ApiListResponse<NamedEntity>> {
  try {
    const competitions = await bffRequest<
      Array<{ id: string; name: string }>
    >("formula-1/competitions");
    return {
      data: asList(competitions).map((c) => ({
        id: c.id,
        name: c.name,
      })),
    };
  } catch {
    return { data: [] };
  }
}

export async function getSeasons(
  league?: string,
): Promise<ApiListResponse<NamedEntity>> {
  if (!league) return { data: [] };
  try {
    const years = await bffRequest<number[]>(
      `leagues/seasons?league=${encodeURIComponent(league)}`,
    );
    return {
      data: (years ?? []).map((year) => ({
        id: `${league}:${year}`,
        name: String(year),
      })),
    };
  } catch {
    try {
      const years = await bffRequest<number[]>(
        `american-football/seasons?league=${encodeURIComponent(league)}`,
      );
      return {
        data: asList(years).map((year) => ({
          id: `${league}:${year}`,
          name: String(year),
        })),
      };
    } catch {
      return { data: [] };
    }
  }
}
