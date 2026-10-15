import type {
  SoccerCountry,
  SoccerLeague,
  SoccerOrganizationRecord,
} from "./soccer-types";

/** Catch-all for leagues in a country that are not assigned to an organization. */
export const DEFAULT_ORGANIZATION_ID = "organizacion";

export type SoccerOrganization = {
  id: string;
  name: string;
  abbreviation?: string | null;
  countryId: string;
  leagues: SoccerLeague[];
  logo?: string | null;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function leagueBelongsToCountry(
  league: SoccerLeague,
  country: SoccerCountry,
): boolean {
  const countryKeys = [country.id, country.name, country.code]
    .map(normalize)
    .filter(Boolean);
  const leagueKeys = [
    league.country_id,
    league.country_name,
    league.country_code,
  ]
    .map(normalize)
    .filter(Boolean);
  return leagueKeys.some((key) => countryKeys.includes(key));
}

export function findCountry(
  countries: SoccerCountry[],
  countryId: string,
): SoccerCountry | undefined {
  const key = normalize(safeDecode(countryId));
  if (!key) return undefined;
  return countries.find((country) =>
    [country.id, country.name, country.code]
      .map(normalize)
      .filter(Boolean)
      .includes(key),
  );
}

/** Countries that actually have at least one league, plus league-only countries. */
export function countriesWithLeagues(
  countries: SoccerCountry[],
  leagues: SoccerLeague[],
): SoccerCountry[] {
  const catalog = new Map<string, SoccerCountry>();
  for (const country of countries) {
    catalog.set(normalize(country.id), country);
    catalog.set(normalize(country.name), country);
    if (country.code) catalog.set(normalize(country.code), country);
  }

  const result = new Map<string, SoccerCountry>();
  for (const league of leagues) {
    const raw = league.country_id || league.country_name || "";
    const key = normalize(raw);
    if (!key) continue;
    const known = catalog.get(key);
    if (known) {
      result.set(known.id, known);
      continue;
    }
    const name = league.country_name || league.country_id || "Sin país";
    result.set(name, {
      id: name,
      name,
      code: league.country_code ?? null,
      flag: null,
    });
  }

  return [...result.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}

export function resolveCountry(
  countries: SoccerCountry[],
  leagues: SoccerLeague[],
  countryId: string,
): SoccerCountry | undefined {
  return (
    findCountry(countries, countryId) ??
    findCountry(countriesWithLeagues(countries, leagues), countryId)
  );
}

export function leaguesForCountry(
  leagues: SoccerLeague[],
  country: SoccerCountry,
): SoccerLeague[] {
  return leagues
    .filter((league) => leagueBelongsToCountry(league, country))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function orgBelongsToCountry(
  org: SoccerOrganizationRecord,
  country: SoccerCountry,
): boolean {
  const keys = [country.id, country.name, country.code]
    .map(normalize)
    .filter(Boolean);
  return (
    keys.includes(normalize(org.country_id)) ||
    keys.includes(normalize(org.country_name))
  );
}

export function organizationsForCountry(
  country: SoccerCountry,
  leagues: SoccerLeague[],
  stored: SoccerOrganizationRecord[] = [],
): SoccerOrganization[] {
  const countryLeagues = leaguesForCountry(leagues, country);
  const custom = stored
    .filter((row) => orgBelongsToCountry(row, country))
    .map((row) => ({
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation ?? null,
      countryId: country.id,
      leagues: countryLeagues.filter(
        (league) => normalize(league.organization_id) === normalize(row.id),
      ),
      logo: row.logo ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const unassigned = countryLeagues.filter(
    (league) => !normalize(league.organization_id),
  );

  if (countryLeagues.length === 0 && custom.length === 0) return [];

  return [
    ...custom,
    ...(unassigned.length > 0
      ? [
          {
            id: DEFAULT_ORGANIZATION_ID,
            name: "Organización deportiva",
            countryId: country.id,
            leagues: unassigned,
          },
        ]
      : []),
  ];
}

export function findOrganization(
  organizations: SoccerOrganization[],
  orgId: string,
): SoccerOrganization | undefined {
  const key = normalize(safeDecode(orgId));
  return organizations.find((org) => normalize(org.id) === key);
}

export function leagueNamesMeta(leagues: SoccerLeague[], limit = 3): string {
  if (leagues.length === 0) return "Sin ligas";
  const names = leagues.map((league) => league.name).filter(Boolean);
  if (names.length <= limit) return names.join(" · ");
  return `${names.slice(0, limit).join(" · ")} · +${names.length - limit}`;
}

export function equiposHref(countryId?: string, orgId?: string, leagueId?: string) {
  const parts = ["/datos-maestros/futbol/equipos"];
  if (countryId) parts.push(encodeURIComponent(countryId));
  if (countryId && orgId) parts.push(encodeURIComponent(orgId));
  if (countryId && orgId && leagueId) parts.push(encodeURIComponent(leagueId));
  return parts.join("/");
}

/** Org card used in Operación season-first navigation. */
export type SoccerNavOrganization = {
  id: string;
  name: string;
  logo: string | null;
  country_id: string | null;
  country_name: string | null;
  leagues: SoccerLeague[];
};

/**
 * Build org cards for a season year: every stored org (even with 0 leagues that
 * year, so alta under org works) plus a "Sin organización" bucket when needed.
 */
export function organizationsForSeasonYear(
  yearLeagues: SoccerLeague[],
  stored: SoccerOrganizationRecord[],
): SoccerNavOrganization[] {
  const byOrg = new Map<string, SoccerLeague[]>();
  const unassigned: SoccerLeague[] = [];

  for (const league of yearLeagues) {
    const orgId = league.organization_id?.trim();
    if (!orgId) {
      unassigned.push(league);
      continue;
    }
    const list = byOrg.get(orgId) ?? [];
    list.push(league);
    byOrg.set(orgId, list);
  }

  const rows: SoccerNavOrganization[] = stored
    .map((org) => {
      const leagues = (byOrg.get(org.id) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, "es"),
      );
      return {
        id: org.id,
        name: org.name,
        logo: org.logo ?? null,
        country_id: org.country_id,
        country_name: org.country_name ?? null,
        leagues,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  // Orgs referenced by leagues but missing from /organizations catalog
  for (const [orgId, leagues] of byOrg) {
    if (rows.some((row) => normalize(row.id) === normalize(orgId))) continue;
    const sample = leagues[0];
    rows.push({
      id: orgId,
      name: sample?.organization_name?.trim() || orgId,
      logo: null,
      country_id: sample?.country_id ?? null,
      country_name: sample?.country_name ?? null,
      leagues: leagues.sort((a, b) => a.name.localeCompare(b.name, "es")),
    });
  }

  // Always expose the orphan bucket so operators can assign organizations.
  rows.push({
    id: DEFAULT_ORGANIZATION_ID,
    name: "Sin organización deportiva",
    logo: null,
    country_id: null,
    country_name: null,
    leagues: unassigned.sort((a, b) => a.name.localeCompare(b.name, "es")),
  });

  return rows.sort((a, b) => {
    if (a.id === DEFAULT_ORGANIZATION_ID) return 1;
    if (b.id === DEFAULT_ORGANIZATION_ID) return -1;
    return a.name.localeCompare(b.name, "es");
  });
}

export function isDefaultOrganizationId(orgId: string): boolean {
  return normalize(safeDecode(orgId)) === normalize(DEFAULT_ORGANIZATION_ID);
}

export function soccerPartidosHref(leagueId: string, year: number): string {
  const seasonId = `${leagueId}:${year}`;
  return `/operacion/futbol/${encodeURIComponent(leagueId)}/${encodeURIComponent(seasonId)}/partidos`;
}

export function soccerOrgCompetitionsHref(year: number | string, orgId: string): string {
  return `/operacion/futbol/temporada/${encodeURIComponent(String(year))}/organizacion/${encodeURIComponent(orgId)}`;
}
