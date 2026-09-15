import { proxyRequest } from "./proxy-client";
import type { ApiListResponse } from "./types";
import type {
  TennisEdition,
  TennisEditionParticipant,
  TennisEditionStatus,
  TennisMatch,
  TennisMatchBoStatus,
  TennisPlayer,
  TennisPlayerStatus,
  TennisPublishStatus,
} from "./tennis-types";

export type {
  TennisEditionStatus,
  TennisPublishStatus,
  TennisMatchBoStatus,
  TennisPlayerStatus,
};

type List<T> = Promise<ApiListResponse<T>>;
type One<T> = Promise<{ data: T }>;

export function listAdminPlayers(status?: TennisPlayerStatus): List<TennisPlayer> {
  const query = status
    ? `?status=${encodeURIComponent(status)}&limit=200`
    : "?limit=200";
  return proxyRequest(`admin/tennis/players${query}`);
}

export function createPlayer(body: {
  name: string;
  display_name?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  photo_url?: string | null;
  status?: TennisPlayerStatus;
}): One<TennisPlayer> {
  return proxyRequest("admin/tennis/players", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updatePlayer(
  id: string,
  body: Partial<{
    name: string;
    display_name: string | null;
    country_code: string | null;
    country_name: string | null;
    photo_url: string | null;
    status: TennisPlayerStatus;
  }>,
): One<TennisPlayer> {
  return proxyRequest(`admin/tennis/players/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deletePlayer(id: string): Promise<void | {
  data: TennisPlayer;
  message?: string;
}> {
  return proxyRequest(`admin/tennis/players/${id}`, { method: "DELETE" });
}

export function listAdminEditions(): List<TennisEdition> {
  return proxyRequest("admin/tennis/editions?limit=200");
}

export function getAdminEdition(id: string): One<TennisEdition> {
  return proxyRequest(`admin/tennis/editions/${id}`);
}

export function createEdition(body: {
  tournament_name: string;
  year: number;
  gender: "ATP" | "WTA" | "mixed";
  start_date?: string | null;
  end_date?: string | null;
  status?: TennisEditionStatus;
  publish_status?: TennisPublishStatus;
}): One<TennisEdition> {
  return proxyRequest("admin/tennis/editions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateEdition(
  id: string,
  body: Partial<{
    tournament_name: string;
    year: number;
    gender: "ATP" | "WTA" | "mixed";
    start_date: string | null;
    end_date: string | null;
    status: TennisEditionStatus;
    publish_status: TennisPublishStatus;
  }>,
): One<TennisEdition> {
  return proxyRequest(`admin/tennis/editions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listEditionParticipants(
  editionId: string,
): List<TennisEditionParticipant> {
  return proxyRequest(
    `admin/tennis/editions/${editionId}/participants?limit=200`,
  );
}

export function replaceEditionParticipants(
  editionId: string,
  participants: Array<{ player_id: string; seed?: number | null }>,
): List<TennisEditionParticipant> {
  return proxyRequest(`admin/tennis/editions/${editionId}/participants`, {
    method: "PUT",
    body: JSON.stringify({ participants }),
  });
}

export function listEditionMatches(editionId: string): List<TennisMatch> {
  return proxyRequest(
    `admin/tennis/editions/${editionId}/matches?limit=200`,
  );
}

export function saveMatchesBatch(
  editionId: string,
  matches: Array<{
    id?: string;
    round_name: string;
    round_order: number;
    slot: number;
    player1_id?: string | null;
    player2_id?: string | null;
    winner_id?: string | null;
    next_match_id?: string | null;
    next_slot?: "player1" | "player2" | null;
    fixture_date?: string | null;
    status: TennisMatchBoStatus;
    sets?: Array<{ player1: number | null; player2: number | null }>;
  }>,
): List<TennisMatch> {
  return proxyRequest(`admin/tennis/editions/${editionId}/matches/batch`, {
    method: "PUT",
    body: JSON.stringify({ matches }),
  });
}

export function propagateWinners(editionId: string): Promise<{
  data: { propagated: number; matches: TennisMatch[] };
}> {
  return proxyRequest(
    `admin/tennis/editions/${editionId}/propagate-winners`,
    { method: "POST" },
  );
}
