/**
 * Tennis admin API — Deportix MVP BFF via `/api/proxy`.
 * Paths under `/tennis/*`. Envelope `{ response }` unwrapped by `bffRequest`.
 * Editions → tournaments, participants → entries. Lists use `published=all`.
 */
import { bffRequest } from "./bff-client";
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

const PREFIX = "tennis";
const BO_PUBLISHED = "all";

// ─── BFF raw shapes ───────────────────────────────────────────────────────────

type BffPlayer = {
  id: string;
  fullName: string;
  displayName: string;
  photoUrl?: string | null;
  country: { code: string; name?: string | null; flag?: string | null };
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
  startDate: string;
  endDate: string;
  year: number;
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
  published: boolean;
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

function toUiGender(
  gender: "male" | "female",
  category?: string,
): "ATP" | "WTA" | "mixed" {
  if (category === "grand_slam" && gender === "male") return "mixed";
  return gender === "female" ? "WTA" : "ATP";
}

function fromUiGender(gender: "ATP" | "WTA" | "mixed"): "male" | "female" {
  return gender === "WTA" ? "female" : "male";
}

function categoryFromGender(
  gender: "ATP" | "WTA" | "mixed",
): "grand_slam" | "atp_1000" | "wta_1000" {
  if (gender === "WTA") return "wta_1000";
  if (gender === "mixed") return "grand_slam";
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
): "normal" | "retirement" | "walkover" | "disqualification" {
  switch (status) {
    case "retired":
      return "retirement";
    case "walkover":
      return "walkover";
    case "disqualified":
      return "disqualification";
    default:
      return "normal";
  }
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
    status: p.published ? "active" : "inactive",
  };
}

function mapEdition(t: BffTournament): TennisEdition {
  return {
    id: String(t.id),
    tournament_name: t.name,
    year: t.year,
    gender: toUiGender(t.gender, t.category),
    start_date: t.startDate ?? null,
    end_date: t.endDate ?? null,
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
  const sets = (m.result?.setScores ?? []).map((s) => ({
    player1: s.competitor1 ?? null,
    player2: s.competitor2 ?? null,
  }));
  const winnerPos = m.bracket?.winnerToPosition;
  return {
    id: String(m.id),
    edition_id: String(m.tournamentId),
    round_name: m.roundName ?? `R${m.roundNumber}`,
    round_order: m.roundNumber,
    slot: m.bracketPosition,
    player1_id: m.competitor1?.id != null ? String(m.competitor1.id) : null,
    player2_id: m.competitor2?.id != null ? String(m.competitor2.id) : null,
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

async function ensurePublished(
  tournamentId: string,
  publishStatus?: TennisPublishStatus,
): Promise<void> {
  if (publishStatus !== "published") return;
  try {
    await bffRequest(
      `${PREFIX}/tournaments/${encodeURIComponent(tournamentId)}/publish`,
      { method: "POST" },
    );
  } catch {
    /* publish may already be set or unavailable */
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
): List<TennisPlayer> {
  const response = await bffRequest<BffPlayer[]>(
    withPublished(`${PREFIX}/players`),
  );
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
  year: number;
  gender: "ATP" | "WTA" | "mixed";
  start_date?: string | null;
  end_date?: string | null;
  status?: TennisEditionStatus;
  publish_status?: TennisPublishStatus;
}): One<TennisEdition> {
  const response = await bffRequest<BffTournament[] | BffTournament>(
    `${PREFIX}/tournaments`,
    {
      method: "POST",
      body: JSON.stringify({
        name: body.tournament_name,
        category: categoryFromGender(body.gender),
        gender: fromUiGender(body.gender),
        eventType: "singles",
        countryCode: "US",
        startDate: dateOnly(body.start_date, body.year),
        endDate: endDateOnly(body.end_date, body.year),
        year: body.year,
        status: fromUiStatus(body.status ?? "upcoming"),
      }),
    },
  );
  const created = firstOf(response);
  if (!created) throw new Error("Edition create returned empty response");
  await ensurePublished(created.id, body.publish_status);
  const edition = mapEdition(created);
  if (body.publish_status === "published") {
    edition.publish_status = "published";
  }
  return { data: edition };
}

export async function updateEdition(
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
  const current = await getAdminEdition(id);
  const year = body.year ?? current.data.year;
  const gender = body.gender ?? current.data.gender;

  const patch: Record<string, unknown> = {};
  if (body.tournament_name !== undefined) patch.name = body.tournament_name;
  if (body.year !== undefined) patch.year = body.year;
  if (body.gender !== undefined) {
    patch.gender = fromUiGender(body.gender);
    patch.category = categoryFromGender(body.gender);
  }
  if (body.start_date !== undefined) {
    patch.startDate = dateOnly(body.start_date, year);
  }
  if (body.end_date !== undefined) {
    patch.endDate = endDateOnly(body.end_date, year);
  }
  if (body.status !== undefined) patch.status = fromUiStatus(body.status);

  if (Object.keys(patch).length === 0 && body.publish_status === undefined) {
    return current;
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
  await ensurePublished(id, body.publish_status);
  const edition = mapEdition(updated);
  if (body.publish_status === "published") {
    edition.publish_status = "published";
  } else if (body.publish_status === "draft") {
    edition.publish_status = "draft";
  }
  if (body.gender) edition.gender = gender;
  return { data: edition };
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
    withPublished(
      `${PREFIX}/tournaments/${encodeURIComponent(editionId)}/matches`,
    ),
  );
  return { data: asList(response).map(mapMatch) };
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
    sets?: Array<{ player1: number | null; player2: number | null }>;
  }>,
): List<TennisMatch> {
  const rounds = await listRounds(editionId);
  const roundCache = new Map(
    rounds.map((r) => [`${r.roundNumber}:${r.name}`, r]),
  );

  for (const match of matches) {
    const round = await ensureRound(
      editionId,
      match.round_name,
      match.round_order,
      roundCache,
    );

    const body = {
      roundId: round.id,
      bracketPosition: match.slot,
      competitor1Id: match.player1_id || null,
      competitor2Id: match.player2_id || null,
      scheduledAt: match.fixture_date || null,
      status: fromBoMatchStatus(match.status),
      winnerToMatchId: match.next_match_id || null,
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

    if (
      matchId &&
      match.winner_id &&
      (match.status === "finished" ||
        match.status === "retired" ||
        match.status === "walkover" ||
        match.status === "disqualified")
    ) {
      const loserId =
        match.winner_id === match.player1_id
          ? match.player2_id
          : match.player1_id;
      const setScores = (match.sets ?? [])
        .map((s, i) => ({
          set: i + 1,
          competitor1: s.player1 ?? 0,
          competitor2: s.player2 ?? 0,
        }))
        .filter((s) => s.competitor1 > 0 || s.competitor2 > 0);

      try {
        await bffRequest(
          `${PREFIX}/matches/${encodeURIComponent(matchId)}/result`,
          {
            method: "POST",
            body: JSON.stringify({
              winnerId: match.winner_id,
              loserId: loserId || undefined,
              resultType: resultTypeFromStatus(match.status),
              setScores: setScores.length ? setScores : undefined,
            }),
          },
        );
      } catch {
        /* result endpoint may reject incomplete brackets */
      }
    }
  }

  return listEditionMatches(editionId);
}

/**
 * Client-side winner propagation using match bracket fields
 * `winnerToMatchId` / `winnerToPosition` (no dedicated BFF endpoint).
 */
export async function propagateWinners(editionId: string): Promise<{
  data: { propagated: number; matches: TennisMatch[] };
}> {
  const { data: matches } = await listEditionMatches(editionId);
  const byId = new Map(matches.map((m) => [m.id, m]));
  let propagated = 0;

  for (const match of matches) {
    if (!match.winner_id || !match.next_match_id) continue;
    const next = byId.get(match.next_match_id);
    if (!next) continue;

    const patch: Record<string, unknown> = {};
    if (match.next_slot === "player1") {
      if (next.player1_id === match.winner_id) continue;
      patch.competitor1Id = match.winner_id;
    } else if (match.next_slot === "player2") {
      if (next.player2_id === match.winner_id) continue;
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
  }

  const refreshed = await listEditionMatches(editionId);
  return {
    data: { propagated, matches: refreshed.data },
  };
}
