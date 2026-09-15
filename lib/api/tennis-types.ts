export type TennisPlayerStatus = "active" | "inactive";

export type TennisEditionStatus =
  | "upcoming"
  | "current"
  | "finished"
  | "cancelled";

export type TennisPublishStatus = "draft" | "published";

export type TennisMatchBoStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "retired"
  | "walkover"
  | "disqualified"
  | "cancelled";

export interface TennisPlayer {
  id: string;
  name: string;
  display_name?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  photo_url?: string | null;
  status: TennisPlayerStatus;
}

export interface TennisEdition {
  id: string;
  tournament_name: string;
  year: number;
  gender: "ATP" | "WTA" | "mixed";
  start_date: string | null;
  end_date: string | null;
  status: TennisEditionStatus;
  publish_status: TennisPublishStatus;
}

export interface TennisEditionParticipant {
  id: string;
  edition_id: string;
  player_id: string;
  seed?: number | null;
}

export interface TennisMatch {
  id: string;
  edition_id: string;
  round_name: string;
  round_order: number;
  slot: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  next_match_id: string | null;
  next_slot: "player1" | "player2" | null;
  fixture_date: string | null;
  status: TennisMatchBoStatus;
  sets: Array<{ player1: number | null; player2: number | null }>;
}

export function playerDisplayName(player: TennisPlayer): string {
  return player.display_name?.trim() || player.name?.trim() || "Sin nombre";
}

export function editionLabel(edition: TennisEdition): string {
  return `${edition.tournament_name} ${edition.year} (${edition.gender})`;
}

export const EDITION_STATUS_LABEL: Record<TennisEditionStatus, string> = {
  upcoming: "Próxima",
  current: "Vigente",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

export const PUBLISH_STATUS_LABEL: Record<TennisPublishStatus, string> = {
  draft: "Borrador",
  published: "Publicada",
};

export const MATCH_STATUS_LABEL: Record<TennisMatchBoStatus, string> = {
  scheduled: "Programado",
  live: "En curso",
  finished: "Finalizado",
  retired: "Retirado",
  walkover: "Walkover",
  disqualified: "Descalificado",
  cancelled: "Cancelado",
};
