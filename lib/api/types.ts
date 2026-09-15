export type SyncSport = "soccer" | "nfl" | "f1" | "all";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface IngestionJob {
  id: string;
  sport: SyncSport;
  status: JobStatus;
  started_at: string;
  finished_at: string | null;
  progress: { step: string; current: number; total: number };
  triggered_by: "cli" | "admin";
  error: string | null;
}

export interface SyncLog {
  id: string;
  sport: string;
  endpoint: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  processed: number;
  inserted: number;
  updated: number;
  errors: string[];
}

export interface CollectionStats {
  sports: number;
  countries: number;
  leagues: number;
  seasons: number;
  soccer_teams: number;
  soccer_matches: number;
  soccer_standings: number;
  nfl_teams: number;
  nfl_games: number;
  nfl_standings: number;
  f1_teams: number;
  f1_drivers: number;
  f1_races: number;
  f1_rankings: number;
  f1_race_rankings: number;
  [key: string]: number;
}

export interface ApiListResponse<T> {
  data: T[];
}

export interface ApiHealth {
  status: string;
  project: string;
  firebaseEnv: string;
}

export type NamedEntity = {
  id?: string;
  name?: string;
  slug?: string;
  country_name?: string;
  logo_url?: string | null;
  flag_url?: string | null;
  [key: string]: unknown;
};
