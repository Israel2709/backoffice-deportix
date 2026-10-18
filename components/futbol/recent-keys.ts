/** localStorage keys for soccer operación recent-visit surfaces. */
export const SOCCER_ORG_RECENT_KEY = "operacion:futbol:organizations";

/** Recent leagues under an organization. */
export function soccerLeagueRecentKey(orgId: string): string {
  return `operacion:futbol:leagues:${orgId}`;
}

export const SOCCER_ORG_RECENT_MAX = 10;
export const SOCCER_LEAGUE_RECENT_MAX = 10;
