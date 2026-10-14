/** localStorage keys for F1 recent-visit surfaces (reusable pattern for other sports). */
export const F1_SEASON_RECENT_KEY = "operacion:formula-1:seasons";

/** Recent competitions for a season year (e.g. list under `/temporada/2026`). */
export function f1CompetitionRecentKey(year: number | string): string {
  return `operacion:formula-1:competitions:${year}`;
}

export const F1_COMPETITION_RECENT_MAX = 10;
