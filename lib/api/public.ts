import { proxyRequest } from "./proxy-client";
import type { ApiListResponse, CollectionStats, NamedEntity } from "./types";

export function getStats(): Promise<CollectionStats> {
  return proxyRequest("api/stats");
}

export function getSports(): Promise<ApiListResponse<NamedEntity>> {
  return proxyRequest("api/sports?limit=20");
}

export function getCountries(): Promise<ApiListResponse<NamedEntity>> {
  return proxyRequest("api/countries?limit=100");
}

export function getLeagues(
  sport?: string,
): Promise<ApiListResponse<NamedEntity>> {
  const query = sport
    ? `?sport=${encodeURIComponent(sport)}&limit=100`
    : "?limit=100";
  return proxyRequest(`api/leagues${query}`);
}

export function getSoccerTeams(): Promise<ApiListResponse<NamedEntity>> {
  return proxyRequest("api/soccer/teams?limit=100");
}

export function getNflTeams(): Promise<ApiListResponse<NamedEntity>> {
  return proxyRequest("api/nfl/teams?limit=100");
}

export function getF1Drivers(): Promise<ApiListResponse<NamedEntity>> {
  return proxyRequest("api/f1/drivers?limit=100");
}

export function getF1Teams(): Promise<ApiListResponse<NamedEntity>> {
  return proxyRequest("api/f1/teams?limit=50");
}

export function getF1Circuits(): Promise<ApiListResponse<NamedEntity>> {
  return proxyRequest("api/f1/circuits?limit=100");
}

export function getF1Races(): Promise<ApiListResponse<NamedEntity>> {
  return proxyRequest("api/f1/races?limit=100");
}

export function getF1Competitions(): Promise<ApiListResponse<NamedEntity>> {
  return proxyRequest("api/f1/competitions?limit=100");
}

export function getSeasons(
  league?: string,
): Promise<ApiListResponse<NamedEntity>> {
  const query = league
    ? `?league=${encodeURIComponent(league)}&limit=100`
    : "?limit=100";
  return proxyRequest(`api/seasons${query}`);
}
