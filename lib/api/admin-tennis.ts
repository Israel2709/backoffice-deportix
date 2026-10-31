/**
 * Tennis admin API — Deportix MVP BFF via `/api/proxy`.
 * Paths under `/tennis/*`. Envelope `{ response }` unwrapped by `bffRequest`.
 * Editions → tournaments, participants → entries. Catalog lists use `published=all`.
 * Individual matches have no `published` flag and are listed without that filter.
 */
import { bffRequest } from "./bff-client";
import type { ApiListResponse } from "./types";
import {
  BYE_PLAYER_ID,
  isByePlayerId,
  type TennisEdition,
  type TennisEditionParticipant,
  type TennisEditionStatus,
  type TennisMatch,
  type TennisMatchBoStatus,
  type TennisPlayer,
  type TennisPlayerStatus,
  type TennisPublishStatus,
  type TennisTournamentCategory,
} from "./tennis-types";

export type {
  TennisEditionStatus,
  TennisPublishStatus,
  TennisMatchBoStatus,
  TennisPlayerStatus,
  TennisTournamentCategory,
};

type List<T> = Promise<ApiListResponse<T>>;
type One<T> = Promise<{ data: T }>;

const PREFIX = "tennis";
const BO_PUBLISHED = "all";

// ─── BFF raw shapes ───────────────────────────────────────────────────────────

type BffPlayer = {
  id: string;
  fullName: string;
  displayName: string;
  photoUrl?: string | null;
  country: { code: string; name?: string | null; flag?: string | null };
  gender?: "male" | "female" | null;
  published: boolean;
};

type BffTournament = {
  id: string;
  name: string;
  shortName?: string | null;
  category: string;
  gender: "male" | "female";
  eventType: string;
  country: { code: string; name?: string | null };
  city?: string | null;
  imageUrl?: string | null;
  altImageUrl?: string | null;
  startDate: string;
  endDate: string;
  year: number;
  drawSize?: number | null;
  status: "upcoming" | "active" | "finished" | "cancelled";
  published: boolean;
};

type BffEntry = {
  id: string;
  tournamentId: string;
  player: BffPlayer;
  seed?: number | null;
  ranking?: number | null;
  entryType?: string | null;
  published: boolean;
};

type BffRound = {
  id: string;
  tournamentId: string;
  roundNumber: number;
  name: string;
  status: string;
  published: boolean;
};

type BffMatch = {
  id: string;
  tournamentId: string;
  roundId: string;
  roundNumber: number;
  roundName?: string | null;
  bracketPosition: number;
  competitor1: { id: string; fullName?: string; displayName?: string } | null;
  competitor2: { id: string; fullName?: string; displayName?: string } | null;
  scheduledAt?: string | null;
  status: string;
  bracket: {
    competitor1SourceMatchId: string | null;
    competitor2SourceMatchId: string | null;
    winnerToMatchId: string | null;
    winnerToPosition: "competitor_1" | "competitor_2" | null;
    competitor1EntryType?: string | null;
    competitor2EntryType?: string | null;
  };
  result?: {
    winnerId?: string | null;
    loserId?: string | null;
    resultType?: string | null;
    setScores?: Array<{
      set: number;
      competitor1: number;
      competitor2: number;
    }> | null;
  } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asList<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function firstOf<T>(value: T | T[] | null | undefined): T | undefined {
  return asList(value)[0];
}

function withPublished(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}published=${BO_PUBLISHED}`;
}

function toUiGender(gender: "male" | "female"): "ATP" | "WTA" {
  return gender === "female" ? "WTA" : "ATP";
}

function fromUiGender(gender: "ATP" | "WTA"): "male" | "female" {
  return gender === "WTA" ? "female" : "male";
}

function categoryFromGender(gender: "ATP" | "WTA"): TennisTournamentCategory {
  return gender === "WTA" ? "wta_1000" : "atp_1000";
}

function toUiCategory(value: string | null | undefined): TennisTournamentCategory {
  if (value === "grand_slam" || value === "atp_1000" || value === "wta_1000") {
    return value;
  }
  return "atp_1000";
}

function toUiStatus(
  status: BffTournament["status"],
): TennisEditionStatus {
  if (status === "active") return "current";
  return status;
}

function fromUiStatus(
  status: TennisEditionStatus,
): BffTournament["status"] {
  if (status === "current") return "active";
  return status;
}

function toBoMatchStatus(status: string): TennisMatchBoStatus {
  switch (status) {
    case "live":
      return "live";
    case "finished":
      return "finished";
    case "retirement":
      return "retired";
    case "walkover":
      return "walkover";
    case "bye":
      return "bye";
    case "disqualification":
      return "disqualified";
    case "cancelled":
      return "cancelled";
    case "pending_competitors":
    case "scheduled":
    case "suspended":
    case "postponed":
    default:
      return "scheduled";
  }
}

function fromBoMatchStatus(status: TennisMatchBoStatus): string {
  switch (status) {
    case "live":
      return "live";
    case "finished":
      return "finished";
    case "retired":
      return "retirement";
    case "walkover":
      return "walkover";
    case "bye":
      return "bye";
    case "disqualified":
      return "disqualification";
    case "cancelled":
      return "cancelled";
    default:
      return "scheduled";
  }
}

function resultTypeFromStatus(
  status: TennisMatchBoStatus,
): "normal" | "retirement" | "walkover" | "bye" | "disqualification" {
  switch (status) {
    case "retired":
      return "retirement";
    case "walkover":
      return "walkover";
    case "bye":
      return "bye";
    case "disqualified":
      return "disqualification";
    default:
      return "normal";
  }
}

function sideFromUi(
  playerId: string | null | undefined,
): { competitorId: string | null; entryType: string | null } {
  if (isByePlayerId(playerId)) {
    return { competitorId: null, entryType: "bye" };
  }
  const id = playerId?.trim() || null;
  return { competitorId: id, entryType: id ? "direct" : null };
}

function sideToUi(
  competitorId: string | null | undefined,
  entryType: string | null | undefined,
): string | null {
  if (entryType === "bye" && !competitorId) return BYE_PLAYER_ID;
  return competitorId != null ? String(competitorId) : null;
}

function dateOnly(value: string | null | undefined, fallbackYear: number): string {
  if (value) {
    const d = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  return `${fallbackYear}-01-01`;
}

function endDateOnly(
  value: string | null | undefined,
  fallbackYear: number,
): string {
  if (value) {
    const d = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  return `${fallbackYear}-12-31`;
}

function mapPlayer(p: BffPlayer): TennisPlayer {
  return {
    id: String(p.id),
    name: p.fullName,
    display_name: p.displayName,
    country_code: p.country?.code ?? null,
    country_name: p.country?.name ?? null,
    photo_url: p.photoUrl ?? null,
    gender: p.gender === "male" || p.gender === "female" ? p.gender : null,
    status: p.published ? "active" : "inactive",
  };
}

function mapEdition(t: BffTournament): TennisEdition {
  return {
    id: String(t.id),
    tournament_name: t.name,
    short_name: t.shortName ?? null,
    category: toUiCategory(t.category),
    year: t.year,
    gender: toUiGender(t.gender),
    country_code: t.country?.code ?? null,
    country_name: t.country?.name ?? null,
    city: t.city ?? null,
    image_url: t.imageUrl ?? null,
    image_alt_url: t.altImageUrl ?? null,
    start_date: t.startDate ?? null,
    end_date: t.endDate ?? null,
    participants_count:
      typeof t.drawSize === "number" && Number.isFinite(t.drawSize)
        ? t.drawSize
        : null,
    status: toUiStatus(t.status),
    publish_status: t.published ? "published" : "draft",
  };
}

function mapParticipant(e: BffEntry): TennisEditionParticipant {
  return {
    id: String(e.id),
    edition_id: String(e.tournamentId),
    player_id: String(e.player?.id ?? ""),
    seed: e.seed ?? null,
  };
}

function mapMatch(m: BffMatch): TennisMatch {
  const rawScores = [...(m.result?.setScores ?? [])].sort(
    (a, b) => (a.set ?? 0) - (b.set ?? 0),
  );
  const maxSet = rawScores.reduce(
    (max, s) => Math.max(max, typeof s.set === "number" ? s.set : 0),
    0,
  );
  const slotCount = Math.min(5, Math.max(3, maxSet, rawScores.length));
  const sets: Array<{ player1: number | null; player2: number | null }> =
    Array.from({ length: slotCount }, () => ({
      player1: null,
      player2: null,
    }));
  for (const score of rawScores) {
    const idx =
      typeof score.set === "number" && score.set >= 1
        ? score.set - 1
        : sets.findIndex((s) => s.player1 == null && s.player2 == null);
    if (idx < 0 || idx >= sets.length) continue;
    sets[idx] = {
      player1: score.competitor1 ?? null,
      player2: score.competitor2 ?? null,
    };
  }
  const winnerPos = m.bracket?.winnerToPosition;
  const entry1 = m.bracket?.competitor1EntryType ?? null;
  const entry2 = m.bracket?.competitor2EntryType ?? null;
  return {
    id: String(m.id),
    edition_id: String(m.tournamentId),
    round_name: m.roundName ?? `R${m.roundNumber}`,
    round_order: m.roundNumber,
    slot: m.bracketPosition,
    player1_id: sideToUi(
      m.competitor1?.id != null ? String(m.competitor1.id) : null,
      entry1,
    ),
    player2_id: sideToUi(
      m.competitor2?.id != null ? String(m.competitor2.id) : null,
      entry2,
    ),
    player1_entry_type: entry1,
    player2_entry_type: entry2,
    winner_id: m.result?.winnerId != null ? String(m.result.winnerId) : null,
    next_match_id: m.bracket?.winnerToMatchId ?? null,
    next_slot:
      winnerPos === "competitor_1"
        ? "player1"
        : winnerPos === "competitor_2"
          ? "player2"
          : null,
    fixture_date: m.scheduledAt ?? null,
    status: toBoMatchStatus(m.status),
    sets,
  };
}

async function syncPublishStatus(
  tournamentId: string,
  publishStatus?: TennisPublishStatus,
): Promise<void> {
  if (!publishStatus) return;
  const path =
    publishStatus === "published"
      ? `${PREFIX}/tournaments/${encodeURIComponent(tournamentId)}/publish`
      : `${PREFIX}/tournaments/${encodeURIComponent(tournamentId)}/unpublish`;
  try {
    await bffRequest(path, { method: "POST" });
  } catch {
    /* publish state may already match or be unavailable */
  }
}

async function listRounds(tournamentId: string): Promise<BffRound[]> {
  const response = await bffRequest<BffRound[]>(
    withPublished(
      `${PREFIX}/tournaments/${encodeURIComponent(tournamentId)}/rounds`,
    ),
  );
  return asList(response);
}

async function ensureRound(
  tournamentId: string,
  roundName: string,
  roundOrder: number,
  cache: Map<string, BffRound>,
): Promise<BffRound> {
  const key = `${roundOrder}:${roundName}`;
  const existing =
    cache.get(key) ||
    [...cache.values()].find(
      (r) => r.roundNumber === roundOrder || r.name === roundName,
    );
  if (existing) return existing;

  const response = await bffRequest<BffRound[] | BffRound>(
    `${PREFIX}/tournaments/${encodeURIComponent(tournamentId)}/rounds`,
    {
      method: "POST",
      body: JSON.stringify({
        roundNumber: roundOrder,
        name: roundName || `Ronda ${roundOrder}`,
        status: "pending",
      }),
    },
  );
  const created = firstOf(response);
  if (!created) throw new Error("Round create returned empty response");
  cache.set(`${created.roundNumber}:${created.name}`, created);
  return created;
}

// ─── Players ──────────────────────────────────────────────────────────────────

export async function listAdminPlayers(
  status?: TennisPlayerStatus,
  gender?: "male" | "female",
): List<TennisPlayer> {
  const path = gender
    ? withPublished(`${PREFIX}/players?gender=${gender}`)
    : withPublished(`${PREFIX}/players`);
  const response = await bffRequest<BffPlayer[]>(path);
  let data = asList(response).map(mapPlayer);
  if (status) {
    data = data.filter((p) => p.status === status);
  }
  return { data };
}

export async function createPlayer(body: {
  name: string;
  display_name?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  photo_url?: string | null;
  gender: "male" | "female";
  status?: TennisPlayerStatus;
}): One<TennisPlayer> {
  const response = await bffRequest<BffPlayer[] | BffPlayer>(
    `${PREFIX}/players`,
    {
      method: "POST",
      body: JSON.stringify({
        fullName: body.name,
        displayName: body.display_name?.trim() || body.name,
        photoUrl: body.photo_url ?? null,
        countryCode: body.country_code?.trim() || "XX",
        gender: body.gender,
        published: body.status !== "inactive",
      }),
    },
  );
  const created = firstOf(response);
  if (!created) throw new Error("Player create returned empty response");
  return { data: mapPlayer(created) };
}

export async function updatePlayer(
  id: string,
  body: Partial<{
    name: string;
    display_name: string | null;
    country_code: string | null;
    country_name: string | null;
    photo_url: string | null;
    gender: "male" | "female";
    status: TennisPlayerStatus;
  }>,
): One<TennisPlayer> {
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.fullName = body.name;
  if (body.display_name !== undefined) {
    patch.displayName = body.display_name || body.name;
  }
  if (body.photo_url !== undefined) patch.photoUrl = body.photo_url;
  if (body.country_code !== undefined) {
    patch.countryCode = body.country_code || "XX";
  }
  if (body.gender !== undefined) patch.gender = body.gender;
  if (body.status !== undefined) {
    patch.published = body.status !== "inactive";
  }

  const response = await bffRequest<BffPlayer[] | BffPlayer>(
    `${PREFIX}/players/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("Player update returned empty response");
  return { data: mapPlayer(updated) };
}

export async function deletePlayer(id: string): Promise<void | {
  data: TennisPlayer;
  message?: string;
}> {
  await bffRequest(`${PREFIX}/players/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Editions (tournaments) ───────────────────────────────────────────────────

export async function listAdminEditions(): List<TennisEdition> {
  const response = await bffRequest<BffTournament[]>(
    withPublished(`${PREFIX}/tournaments`),
  );
  return { data: asList(response).map(mapEdition) };
}

export async function getAdminEdition(id: string): One<TennisEdition> {
  const response = await bffRequest<BffTournament[] | BffTournament>(
    withPublished(`${PREFIX}/tournaments/${encodeURIComponent(id)}`),
  );
  const found = firstOf(response);
  if (!found) throw new Error(`Edition not found: ${id}`);
  return { data: mapEdition(found) };
}

export async function createEdition(body: {
  tournament_name: string;
  short_name?: string | null;
  category?: TennisTournamentCategory;
  year: number;
  gender: "ATP" | "WTA";
  country_code?: string | null;
  city?: string | null;
  image_url?: string | null;
  image_alt_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  participants_count?: number | null;
  status?: TennisEditionStatus;
  publish_status?: TennisPublishStatus;
}): One<TennisEdition> {
  const countryCode = body.country_code?.trim().toUpperCase() || "XX";
  const response = await bffRequest<BffTournament[] | BffTournament>(
    `${PREFIX}/tournaments`,
    {
      method: "POST",
      body: JSON.stringify({
        name: body.tournament_name,
        shortName: body.short_name?.trim() || null,
        category: body.category ?? categoryFromGender(body.gender),
        gender: fromUiGender(body.gender),
        eventType: "singles",
        countryCode,
        city: body.city?.trim() || null,
        imageUrl: body.image_url?.trim() || null,
        altImageUrl: body.image_alt_url?.trim() || null,
        startDate: dateOnly(body.start_date, body.year),
        endDate: endDateOnly(body.end_date, body.year),
        year: body.year,
        drawSize:
          typeof body.participants_count === "number" &&
          Number.isFinite(body.participants_count)
            ? body.participants_count
            : null,
        status: fromUiStatus(body.status ?? "upcoming"),
      }),
    },
  );
  const created = firstOf(response);
  if (!created) throw new Error("Edition create returned empty response");
  const publishStatus = body.publish_status ?? "published";
  await syncPublishStatus(created.id, publishStatus);
  const edition = mapEdition(created);
  edition.publish_status = publishStatus;
  return { data: edition };
}

export async function updateEdition(
  id: string,
  body: Partial<{
    tournament_name: string;
    short_name: string | null;
    category: TennisTournamentCategory;
    year: number;
    gender: "ATP" | "WTA";
    country_code: string | null;
    city: string | null;
    image_url: string | null;
    image_alt_url: string | null;
    start_date: string | null;
    end_date: string | null;
    participants_count: number | null;
    status: TennisEditionStatus;
    publish_status: TennisPublishStatus;
  }>,
): One<TennisEdition> {
  const current = await getAdminEdition(id);
  const year = body.year ?? current.data.year;
  const gender = body.gender ?? current.data.gender;

  const patch: Record<string, unknown> = {};
  if (body.tournament_name !== undefined) patch.name = body.tournament_name;
  if (body.short_name !== undefined) {
    patch.shortName = body.short_name?.trim() || null;
  }
  if (body.category !== undefined) patch.category = body.category;
  if (body.year !== undefined) patch.year = body.year;
  if (body.gender !== undefined) {
    patch.gender = fromUiGender(body.gender);
  }
  if (body.country_code !== undefined) {
    patch.countryCode = body.country_code?.trim().toUpperCase() || "XX";
  }
  if (body.city !== undefined) patch.city = body.city?.trim() || null;
  if (body.image_url !== undefined) {
    patch.imageUrl = body.image_url?.trim() || null;
  }
  if (body.image_alt_url !== undefined) {
    patch.altImageUrl = body.image_alt_url?.trim() || null;
  }
  if (body.start_date !== undefined) {
    patch.startDate = dateOnly(body.start_date, year);
  }
  if (body.end_date !== undefined) {
    patch.endDate = endDateOnly(body.end_date, year);
  }
  if (body.participants_count !== undefined) {
    patch.drawSize =
      typeof body.participants_count === "number" &&
      Number.isFinite(body.participants_count)
        ? body.participants_count
        : null;
  }
  if (body.status !== undefined) patch.status = fromUiStatus(body.status);

  if (Object.keys(patch).length === 0) {
    if (body.publish_status === undefined) return current;
    await syncPublishStatus(id, body.publish_status);
    return {
      data: { ...current.data, publish_status: body.publish_status },
    };
  }

  const response = await bffRequest<BffTournament[] | BffTournament>(
    `${PREFIX}/tournaments/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
  const updated = firstOf(response);
  if (!updated) throw new Error("Edition update returned empty response");
  if (body.publish_status !== undefined) {
    await syncPublishStatus(id, body.publish_status);
  }
  const edition = mapEdition(updated);
  if (body.publish_status !== undefined) {
    edition.publish_status = body.publish_status;
  }
  if (body.gender) edition.gender = gender;
  return { data: edition };
}

export async function deleteEdition(id: string): Promise<void> {
  await bffRequest(`${PREFIX}/tournaments/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Participants (entries) ───────────────────────────────────────────────────

export async function listEditionParticipants(
  editionId: string,
): List<TennisEditionParticipant> {
  const response = await bffRequest<BffEntry[]>(
    withPublished(
      `${PREFIX}/tournaments/${encodeURIComponent(editionId)}/entries`,
    ),
  );
  return { data: asList(response).map(mapParticipant) };
}

export async function replaceEditionParticipants(
  editionId: string,
  participants: Array<{ player_id: string; seed?: number | null }>,
): List<TennisEditionParticipant> {
  const existing = await listEditionParticipants(editionId);
  const desired = new Map(
    participants.map((p) => [p.player_id, p.seed ?? null]),
  );
  const existingByPlayer = new Map(
    existing.data.map((e) => [e.player_id, e]),
  );

  for (const entry of existing.data) {
    if (!desired.has(entry.player_id)) {
      await bffRequest(
        `${PREFIX}/entries/${encodeURIComponent(entry.id)}`,
        { method: "DELETE" },
      );
    }
  }

  for (const [playerId, seed] of desired) {
    const current = existingByPlayer.get(playerId);
    if (!current) {
      await bffRequest(
        `${PREFIX}/tournaments/${encodeURIComponent(editionId)}/entries`,
        {
          method: "POST",
          body: JSON.stringify({
            playerId,
            seed,
            entryType: "direct",
          }),
        },
      );
    } else if (current.seed !== seed) {
      await bffRequest(`${PREFIX}/entries/${encodeURIComponent(current.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ seed }),
      });
    }
  }

  return listEditionParticipants(editionId);
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export async function listEditionMatches(
  editionId: string,
): List<TennisMatch> {
  const response = await bffRequest<BffMatch[]>(
    `${PREFIX}/tournaments/${encodeURIComponent(editionId)}/matches`,
  );
  return { data: asList(response).map(mapMatch) };
}

export async function deleteEditionMatch(matchId: string): Promise<void> {
  await bffRequest(`${PREFIX}/matches/${encodeURIComponent(matchId)}`, {
    method: "DELETE",
  });
}

function buildResultPayload(match: {
  player1_id?: string | null;
  player2_id?: string | null;
  winner_id?: string | null;
  status: TennisMatchBoStatus;
  sets?: Array<{
    set?: number;
    player1: number | null;
    player2: number | null;
  }>;
}): {
  winnerId: string;
  loserId?: string;
  resultType: "normal" | "retirement" | "walkover" | "bye" | "disqualification";
  setsPlayer1?: number;
  setsPlayer2?: number;
  setScores?: Array<{ set: number; competitor1: number; competitor2: number }>;
} | null {
  const winnerId = match.winner_id?.trim();
  if (!winnerId || isByePlayerId(winnerId)) return null;

  const p1Raw = match.player1_id?.trim() || null;
  const p2Raw = match.player2_id?.trim() || null;
  const p1Bye = isByePlayerId(p1Raw);
  const p2Bye = isByePlayerId(p2Raw);
  const p1 = p1Bye ? null : p1Raw;
  const p2 = p2Bye ? null : p2Raw;
  const isByeMatch = p1Bye || p2Bye;

  // Preserve explicit set numbers (1..5) so S4/S5 are not renumbered on save.
  const setScores = (match.sets ?? [])
    .map((s, i) => ({
      set:
        typeof s.set === "number" && Number.isFinite(s.set) && s.set >= 1
          ? s.set
          : i + 1,
      competitor1: s.player1 ?? 0,
      competitor2: s.player2 ?? 0,
    }))
    .filter(
      (s) =>
        Number.isFinite(s.competitor1) &&
        Number.isFinite(s.competitor2) &&
        (s.competitor1 > 0 || s.competitor2 > 0 || isByeMatch),
    )
    .sort((a, b) => a.set - b.set);

  if (isByeMatch) {
    const zeroScores =
      setScores.length > 0
        ? setScores.map((s) => ({
            set: s.set,
            competitor1: 0,
            competitor2: 0,
          }))
        : [
            { set: 1, competitor1: 0, competitor2: 0 },
            { set: 2, competitor1: 0, competitor2: 0 },
            { set: 3, competitor1: 0, competitor2: 0 },
          ];
    return {
      winnerId,
      resultType: "bye",
      setsPlayer1: 0,
      setsPlayer2: 0,
      setScores: zeroScores,
    };
  }

  const loserId = winnerId === p1 ? p2 : p1;

  const special =
    match.status === "retired" ||
    match.status === "walkover" ||
    match.status === "bye" ||
    match.status === "disqualified"
      ? resultTypeFromStatus(match.status)
      : null;

  if (special && special !== "normal") {
    return {
      winnerId,
      loserId: special === "bye" ? undefined : loserId || undefined,
      resultType: special,
      ...(special === "bye"
        ? {
            setsPlayer1: 0,
            setsPlayer2: 0,
            setScores: [
              { set: 1, competitor1: 0, competitor2: 0 },
              { set: 2, competitor1: 0, competitor2: 0 },
              { set: 3, competitor1: 0, competitor2: 0 },
            ],
          }
        : { setScores: setScores.length ? setScores : undefined }),
    };
  }

  // API requires setsPlayer1/setsPlayer2 for normal results. Derive from set
  // games when present; otherwise use a 2–0 placeholder so the draw can advance
  // without forcing the analyst to type scores first.
  let setsPlayer1 = 0;
  let setsPlayer2 = 0;
  if (setScores.length > 0) {
    for (const score of setScores) {
      if (score.competitor1 === score.competitor2) continue;
      if (score.competitor1 > score.competitor2) setsPlayer1 += 1;
      else setsPlayer2 += 1;
    }
  }
  if (setsPlayer1 === setsPlayer2) {
    if (setScores.length > 0) {
      // Incomplete / tied tally with typed scores: nudge winner so /result accepts
      // without wiping the setScores array (incl. sets 4–5).
      if (winnerId === p1) setsPlayer1 += 1;
      else setsPlayer2 += 1;
    } else if (winnerId === p1) {
      setsPlayer1 = 2;
      setsPlayer2 = 0;
    } else {
      setsPlayer1 = 0;
      setsPlayer2 = 2;
    }
  }

  return {
    winnerId,
    loserId: loserId || undefined,
    resultType: "normal",
    setsPlayer1,
    setsPlayer2,
    setScores: setScores.length ? setScores : undefined,
  };
}

export async function saveMatchesBatch(
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
    sets?: Array<{
      set?: number;
      player1: number | null;
      player2: number | null;
    }>;
  }>,
  options?: { deleteIds?: string[] },
): Promise<{ data: TennisMatch[]; propagated: number }> {
  for (const id of options?.deleteIds ?? []) {
    await deleteEditionMatch(id);
  }

  const rounds = await listRounds(editionId);
  const roundCache = new Map(
    rounds.map((r) => [`${r.roundNumber}:${r.name}`, r]),
  );

  const pendingResults: Array<{
    matchId: string;
    payload: NonNullable<ReturnType<typeof buildResultPayload>>;
  }> = [];

  // 1) Upsert match shells (competitors + schedule) so bracket links can resolve.
  for (const match of matches) {
    const round = await ensureRound(
      editionId,
      match.round_name,
      match.round_order,
      roundCache,
    );

    const scheduledAt = match.fixture_date || null;
    const side1 = sideFromUi(match.player1_id);
    const side2 = sideFromUi(match.player2_id);
    const competitor1Id = side1.competitorId;
    const competitor2Id = side2.competitorId;
    const isByeMatch = side1.entryType === "bye" || side2.entryType === "bye";
    const hasRealPair = Boolean(competitor1Id && competitor2Id);
    const winnerToMatchId = match.next_match_id?.trim() || null;

    let shellStatus: string = "pending_competitors";
    if (hasRealPair || (isByeMatch && (competitor1Id || competitor2Id))) {
      if (match.winner_id && isByeMatch) {
        shellStatus = "bye";
      } else if (match.winner_id && match.status === "scheduled") {
        shellStatus = "finished";
      } else {
        shellStatus = fromBoMatchStatus(match.status);
      }
    }

    const body = {
      roundId: round.id,
      bracketPosition: match.slot,
      competitor1Id,
      competitor2Id,
      competitor1EntryType: side1.entryType,
      competitor2EntryType: side2.entryType,
      scheduledAt,
      // BFF requires timezone whenever scheduledAt is set.
      timezone: scheduledAt ? "utc" : null,
      status: shellStatus,
      winnerToMatchId,
      winnerToPosition:
        match.next_slot === "player1"
          ? "competitor_1"
          : match.next_slot === "player2"
            ? "competitor_2"
            : null,
    };

    let matchId = match.id;
    if (matchId) {
      await bffRequest(`${PREFIX}/matches/${encodeURIComponent(matchId)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } else {
      const created = await bffRequest<BffMatch[] | BffMatch>(
        `${PREFIX}/tournaments/${encodeURIComponent(editionId)}/matches`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
      matchId = firstOf(created)?.id;
    }

    const resultPayload = buildResultPayload(match);
    if (matchId && resultPayload) {
      pendingResults.push({ matchId, payload: resultPayload });
    }
  }

  // 2) Wire R→R+1 before results so the API can advanceWinner on /result.
  await wireBracketLinks(editionId);

  // 3) Persist winners (required for next-round fill).
  for (const { matchId, payload } of pendingResults) {
    await bffRequest(
      `${PREFIX}/matches/${encodeURIComponent(matchId)}/result`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }

  // 4) Client-side fill for any slot the API did not advance.
  let propagated = 0;
  if (pendingResults.length > 0) {
    const prop = await propagateWinners(editionId);
    propagated = prop.data.propagated + prop.data.alreadySet;
  }

  // Publishing the edition only covers rounds and entries that already existed.
  // Re-publish so newly created rounds inherit published=true for App QD.
  try {
    const edition = await getAdminEdition(editionId);
    if (edition.data.publish_status === "published") {
      await syncPublishStatus(editionId, "published");
    }
  } catch {
    /* keep match writes even if re-publish fails */
  }

  const listed = await listEditionMatches(editionId);
  return { data: listed.data, propagated };
}

/**
 * Single-elim links: round R slot S → round R+1 slot ceil(S/2).
 * Odd S → competitor_1, even S → competitor_2.
 */
async function wireBracketLinks(editionId: string): Promise<void> {
  const { data: matches } = await listEditionMatches(editionId);
  const byRound = new Map<number, TennisMatch[]>();
  for (const match of matches) {
    const list = byRound.get(match.round_order) ?? [];
    list.push(match);
    byRound.set(match.round_order, list);
  }

  const roundOrders = [...byRound.keys()].sort((a, b) => a - b);
  for (const roundOrder of roundOrders) {
    const nextRound = byRound.get(roundOrder + 1);
    if (!nextRound?.length) continue;

    const current = [...(byRound.get(roundOrder) ?? [])].sort(
      (a, b) => a.slot - b.slot,
    );
    const nextSorted = [...nextRound].sort((a, b) => a.slot - b.slot);

    for (const match of current) {
      const nextMatch = nextSorted[Math.ceil(match.slot / 2) - 1];
      if (!nextMatch) continue;
      const nextSlot = match.slot % 2 === 1 ? "player1" : "player2";
      if (
        match.next_match_id === nextMatch.id &&
        match.next_slot === nextSlot
      ) {
        continue;
      }
      await bffRequest(
        `${PREFIX}/matches/${encodeURIComponent(match.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            winnerToMatchId: nextMatch.id,
            winnerToPosition:
              nextSlot === "player1" ? "competitor_1" : "competitor_2",
          }),
        },
      );
    }
  }
}

/**
 * Client-side winner propagation using match bracket fields
 * `winnerToMatchId` / `winnerToPosition` (no dedicated BFF endpoint).
 */
export async function propagateWinners(editionId: string): Promise<{
  data: { propagated: number; alreadySet: number; matches: TennisMatch[] };
}> {
  // Ensure R → R+1 links exist before reading winners from the API.
  await wireBracketLinks(editionId);

  const { data: matches } = await listEditionMatches(editionId);
  const byId = new Map(matches.map((m) => [m.id, m]));
  let propagated = 0;
  let alreadySet = 0;

  for (const match of matches) {
    if (!match.winner_id || !match.next_match_id) continue;
    const next = byId.get(match.next_match_id);
    if (!next) continue;

    const patch: Record<string, unknown> = {};
    if (match.next_slot === "player1") {
      if (next.player1_id === match.winner_id) {
        alreadySet += 1;
        continue;
      }
      patch.competitor1Id = match.winner_id;
    } else if (match.next_slot === "player2") {
      if (next.player2_id === match.winner_id) {
        alreadySet += 1;
        continue;
      }
      patch.competitor2Id = match.winner_id;
    } else {
      // Infer empty slot
      if (!next.player1_id) patch.competitor1Id = match.winner_id;
      else if (!next.player2_id) patch.competitor2Id = match.winner_id;
      else continue;
    }

    await bffRequest(
      `${PREFIX}/matches/${encodeURIComponent(next.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(patch),
      },
    );
    propagated += 1;
    // Keep local map in sync for later sources pointing at the same next match.
    if (patch.competitor1Id) {
      byId.set(next.id, { ...next, player1_id: String(patch.competitor1Id) });
    }
    if (patch.competitor2Id) {
      byId.set(next.id, {
        ...byId.get(next.id)!,
        player2_id: String(patch.competitor2Id),
      });
    }
  }

  const refreshed = await listEditionMatches(editionId);
  return {
    data: { propagated, alreadySet, matches: refreshed.data },
  };
}
