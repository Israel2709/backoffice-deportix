export type TennisPlayerStatus = "active" | "inactive";

export type TennisEditionStatus =
  | "upcoming"
  | "current"
  | "finished"
  | "cancelled";

export type TennisPublishStatus = "draft" | "published";

export type TennisTournamentCategory =
  | "grand_slam"
  | "atp_1000"
  | "wta_1000";

export type TennisMatchBoStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "retired"
  | "walkover"
  | "bye"
  | "disqualified"
  | "cancelled";

/** UI sentinel for an empty bye opponent (never had a rival). Not a player id. */
export const BYE_PLAYER_ID = "__bye__";

export type TennisPlayerGender = "male" | "female";

export interface TennisPlayer {
  id: string;
  name: string;
  display_name?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  photo_url?: string | null;
  gender?: TennisPlayerGender | null;
  status: TennisPlayerStatus;
}

/** Edition maps to BFF `/tennis/tournaments`. */
export interface TennisEdition {
  id: string;
  tournament_name: string;
  short_name?: string | null;
  category: TennisTournamentCategory;
  year: number;
  gender: "ATP" | "WTA";
  country_code?: string | null;
  country_name?: string | null;
  city?: string | null;
  image_url?: string | null;
  image_alt_url?: string | null;
  start_date: string | null;
  end_date: string | null;
  /** Expected main-draw size (cantidad de participantes del cuadro). */
  participants_count: number | null;
  status: TennisEditionStatus;
  publish_status: TennisPublishStatus;
}

/** Maps edition circuit (ATP/WTA) to player gender filter. */
export function playerGenderForEdition(
  editionGender: TennisEdition["gender"],
): TennisPlayerGender {
  return editionGender === "WTA" ? "female" : "male";
}

/** Participant maps to BFF `/tennis/entries`. */
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
  /** API entry type; `bye` with null player id = empty bye side. */
  player1_entry_type?: string | null;
  player2_entry_type?: string | null;
  winner_id: string | null;
  next_match_id: string | null;
  next_slot: "player1" | "player2" | null;
  fixture_date: string | null;
  status: TennisMatchBoStatus;
  sets: Array<{ player1: number | null; player2: number | null }>;
}

export function isByePlayerId(id: string | null | undefined): boolean {
  return id === BYE_PLAYER_ID;
}

/**
 * Short label for tables and selectors: `{apellido} {inicial}.`
 * Uses the first token of `name` as given name and the rest as surname
 * (e.g. "Carlos Alcaraz" → "Alcaraz C.", "Max Alcala Gurri" → "Alcala Gurri M.").
 */
export function playerDisplayName(player: TennisPlayer): string {
  const full = player.name?.trim() || "";
  const display = player.display_name?.trim() || "";

  if (full) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const given = parts[0]!;
      const surname = parts.slice(1).join(" ");
      return `${surname} ${given.charAt(0).toUpperCase()}.`;
    }
    if (display && display.toLowerCase() !== full.toLowerCase()) {
      return `${display} ${full.charAt(0).toUpperCase()}.`;
    }
    return full;
  }

  return display || "Sin nombre";
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
  published: "Publicado",
};

export const TOURNAMENT_CATEGORY_LABEL: Record<
  TennisTournamentCategory,
  string
> = {
  grand_slam: "Grand Slam",
  atp_1000: "ATP 1000",
  wta_1000: "WTA 1000",
};

export const MATCH_STATUS_LABEL: Record<TennisMatchBoStatus, string> = {
  scheduled: "Programado",
  live: "En curso",
  finished: "Finalizado",
  retired: "Retirado",
  walkover: "Walkover",
  bye: "Bye",
  disqualified: "Descalificado",
  cancelled: "Cancelado",
};
