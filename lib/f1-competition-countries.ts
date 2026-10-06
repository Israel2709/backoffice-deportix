/**
 * Resolve which F1 competitions belong to a country.
 * Prefer API `location`, then explicit BO links, then name heuristics
 * (Grand Prix titles usually include the country, e.g. "Mexico Grand Prix").
 */

const STORAGE_KEY = "operacion:formula-1:competition-countries";

/** Name fragments that map to a catalog country (id / name / code). */
const COMPETITION_COUNTRY_ALIASES: Record<string, string[]> = {
  usa: ["miami", "las vegas", "united states"],
  us: ["miami", "las vegas"],
  "united-arab-emirates": ["abu dhabi"],
  ae: ["abu dhabi"],
  england: ["great britain", "britain", "silverstone"],
  "gb-eng": ["great britain", "britain", "silverstone"],
  "south-korea": ["korean", "korea"],
  kr: ["korean", "korea"],
  "saudi-arabia": ["saudi"],
  sa: ["saudi"],
  italy: ["emilia romagna", "toscana", "imola", "monza"],
  it: ["emilia romagna", "toscana"],
  austria: ["steiermark", "spielberg"],
  at: ["steiermark"],
  germany: ["eifel", "nurburgring", "nürburgring", "hockenheim"],
  de: ["eifel"],
  bahrain: ["sakhir"],
  bh: ["sakhir"],
  spain: ["barcelona", "catalunya"],
  es: ["barcelona", "catalunya"],
  malaysia: ["malaysian"],
  my: ["malaysian"],
};

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const result: Record<string, string> = {};
    for (const [competitionId, countryId] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (typeof competitionId === "string" && typeof countryId === "string") {
        result[competitionId] = countryId;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

export function linkCompetitionToCountry(
  competitionId: string,
  countryId: string,
) {
  if (!competitionId || !countryId) return;
  const map = readMap();
  map[competitionId] = countryId;
  writeMap(map);
}

export function unlinkCompetitionFromCountry(competitionId: string) {
  if (!competitionId) return;
  const map = readMap();
  if (!(competitionId in map)) return;
  delete map[competitionId];
  writeMap(map);
}

export function getCompetitionCountryId(
  competitionId: string,
): string | undefined {
  return readMap()[competitionId];
}

type CountryRef = { id: string; name: string; code?: string | null };

type CompetitionRef = {
  id: string;
  name?: string | null;
  location?: string | null;
};

function countryKeys(country: CountryRef): string[] {
  return [country.id, country.name, country.code]
    .map(normalize)
    .filter(Boolean);
}

function matchTokensForCountry(country: CountryRef): string[] {
  const keys = countryKeys(country);
  const tokens = new Set<string>(keys);
  for (const key of keys) {
    for (const alias of COMPETITION_COUNTRY_ALIASES[key] ?? []) {
      tokens.add(normalize(alias));
    }
  }
  return [...tokens];
}

function textIncludesToken(haystack: string, token: string): boolean {
  if (!token) return false;
  if (token.length <= 2) {
    return new RegExp(
      `(?:^|[^a-z0-9])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`,
    ).test(haystack);
  }
  return haystack.includes(token);
}

function linkedToCountry(competitionId: string, country: CountryRef): boolean {
  const linked = readMap()[competitionId];
  if (!linked) return false;
  return countryKeys(country).includes(normalize(safeDecode(linked)));
}

export function competitionBelongsToCountry(
  competition: CompetitionRef,
  country: CountryRef,
): boolean {
  const location = normalize(competition.location);
  if (location && countryKeys(country).some((key) => location.includes(key) || key.includes(location))) {
    return true;
  }

  if (linkedToCountry(competition.id, country)) return true;

  const hay = normalize(competition.name);
  if (!hay) return false;
  return matchTokensForCountry(country).some((token) =>
    textIncludesToken(hay, token),
  );
}

export function filterCompetitionsForCountry<T extends CompetitionRef>(
  competitions: T[],
  country: CountryRef,
): T[] {
  return competitions.filter((competition) =>
    competitionBelongsToCountry(competition, country),
  );
}
