/** localStorage keys for soccer operación recent-visit surfaces. */
export const SOCCER_SEASON_RECENT_KEY = "operacion:futbol:seasons";

/** Recent organizations for a season year. */
export function soccerOrgRecentKey(year: number | string): string {
  return `operacion:futbol:organizations:${year}`;
}

/** Recent competitions under year + org. */
export function soccerCompetitionRecentKey(
  year: number | string,
  orgId: string,
): string {
  return `operacion:futbol:competitions:${year}:${orgId}`;
}

export const SOCCER_ORG_RECENT_MAX = 10;
export const SOCCER_COMPETITION_RECENT_MAX = 10;
