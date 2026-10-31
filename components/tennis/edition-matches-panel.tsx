"use client";
import { LoadingBlock, LoadingOverlay } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getAdminEdition,
  listAdminPlayers,
  listEditionMatches,
  listEditionParticipants,
  saveMatchesBatch,
  updateEdition,
} from "@/lib/api/admin-tennis";
import {
  BYE_PLAYER_ID,
  isByePlayerId,
  MATCH_STATUS_LABEL,
  playerDisplayName,
  type TennisMatchBoStatus,
  type TennisPlayer,
} from "@/lib/api/tennis-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { StickyActions } from "@/components/capture/sticky-actions";
import { TextInput, TextSelect } from "@/components/capture/field";
import { cn } from "@/lib/utils";
import {
  buildDrawRounds,
  resolveDrawParticipants,
  type DrawRound,
} from "@/lib/tennis/draw-rounds";
import { combineUtcDateTime, splitUtcDateTime } from "@/lib/format-date";

const DEFAULT_SET_SLOTS = 3;
const MAX_SET_SLOTS = 5;

type SetScoreInput = { p1: string; p2: string };

type MatchRow = {
  id?: string;
  round_name: string;
  round_order: number | null;
  slot: number;
  player1_id: string;
  player2_id: string;
  winner_id: string;
  next_match_id: string;
  next_slot: "" | "player1" | "player2";
  fixture_date: string;
  fixture_time: string;
  status: TennisMatchBoStatus;
  /** Games per set; always at least 3 slots, up to 5 per match. */
  sets: SetScoreInput[];
};

function emptySetScore(): SetScoreInput {
  return { p1: "", p2: "" };
}

function emptySetSlots(count = DEFAULT_SET_SLOTS): SetScoreInput[] {
  return Array.from({ length: count }, () => emptySetScore());
}

function normalizeSetSlots(
  sets: Array<{ player1: number | null; player2: number | null }> | undefined,
): SetScoreInput[] {
  const mapped = (sets ?? []).map((s) => ({
    p1: s.player1 != null ? String(s.player1) : "",
    p2: s.player2 != null ? String(s.player2) : "",
  }));
  const count = Math.min(
    MAX_SET_SLOTS,
    Math.max(DEFAULT_SET_SLOTS, mapped.length),
  );
  while (mapped.length < count) mapped.push(emptySetScore());
  return mapped.slice(0, MAX_SET_SLOTS);
}

function parseSetGames(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Non-empty set scores with stable 1-based set numbers (keeps gaps as omitted). */
function filledSetsFromRow(row: MatchRow): Array<{
  set: number;
  player1: number;
  player2: number;
}> {
  const out: Array<{ set: number; player1: number; player2: number }> = [];
  row.sets.forEach((s, i) => {
    const player1 = parseSetGames(s.p1);
    const player2 = parseSetGames(s.p2);
    if (player1 == null && player2 == null) return;
    out.push({
      set: i + 1,
      player1: player1 ?? 0,
      player2: player2 ?? 0,
    });
  });
  return out;
}

function emptyMatchRow(round: DrawRound, slot: number): MatchRow {
  return {
    round_name: round.name,
    round_order: round.order,
    slot,
    player1_id: "",
    player2_id: "",
    winner_id: "",
    next_match_id: "",
    next_slot: "",
    fixture_date: "",
    fixture_time: "",
    status: "scheduled",
    sets: emptySetSlots(),
  };
}

/** Zero set scores for bye resolution (winner advances without playing). */
function zeroedSets(count = DEFAULT_SET_SLOTS): SetScoreInput[] {
  return Array.from({ length: count }, () => ({ p1: "0", p2: "0" }));
}

function realPlayerId(id: string): string {
  return id && !isByePlayerId(id) ? id : "";
}

/** After picking A vs BYE (or BYE vs A), lock winner + zeros + status bye. */
function applyByeResolution(row: MatchRow): MatchRow {
  const p1Bye = isByePlayerId(row.player1_id);
  const p2Bye = isByePlayerId(row.player2_id);
  if (p1Bye && p2Bye) {
    return {
      ...row,
      player2_id: "",
      winner_id: "",
      status: "scheduled",
      sets: emptySetSlots(row.sets.length),
    };
  }
  if (!p1Bye && !p2Bye) {
    if (row.status !== "bye") return row;
    return {
      ...row,
      status: "scheduled",
      sets: emptySetSlots(Math.max(row.sets.length, DEFAULT_SET_SLOTS)),
    };
  }
  const winner = p1Bye
    ? realPlayerId(row.player2_id)
    : realPlayerId(row.player1_id);
  return {
    ...row,
    winner_id: winner,
    status: winner ? "bye" : row.status === "bye" ? "scheduled" : row.status,
    sets: winner
      ? zeroedSets(Math.max(row.sets.length, DEFAULT_SET_SLOTS))
      : row.sets,
  };
}

function playerSlotLabel(
  playerId: string,
  playersById: Map<string, TennisPlayer>,
): string {
  if (isByePlayerId(playerId)) return "BYE";
  const player = playerId ? playersById.get(playerId) : undefined;
  if (player) return playerDisplayName(player);
  return playerId || "Por definir";
}

/** Fills missing slots per round from participants_count; keeps extra existing rows. */
function ensureBracketRows(
  existing: MatchRow[],
  participants: number,
): MatchRow[] {
  const rounds = buildDrawRounds(participants);
  if (rounds.length === 0) return existing;

  const plannedOrders = new Set(rounds.map((r) => r.order));
  const result: MatchRow[] = [];

  for (const round of rounds) {
    const inRound = existing
      .filter((row) => (row.round_order ?? 0) === round.order)
      .sort((a, b) => a.slot - b.slot || 0);
    const claimed = new Set<MatchRow>();

    for (let slot = 1; slot <= round.matchCount; slot += 1) {
      const exact = inRound.find(
        (row) => row.slot === slot && !claimed.has(row),
      );
      if (exact) {
        claimed.add(exact);
        result.push({
          ...exact,
          round_order: round.order,
          round_name: exact.round_name?.trim() ? exact.round_name : round.name,
          slot,
        });
        continue;
      }
      const leftover = inRound.find((row) => !claimed.has(row));
      if (leftover) {
        claimed.add(leftover);
        result.push({
          ...leftover,
          round_order: round.order,
          round_name: leftover.round_name?.trim()
            ? leftover.round_name
            : round.name,
          slot,
        });
        continue;
      }
      result.push(emptyMatchRow(round, slot));
    }

    for (const row of inRound) {
      if (!claimed.has(row)) {
        result.push({
          ...row,
          round_order: round.order,
          round_name: row.round_name?.trim() ? row.round_name : round.name,
        });
      }
    }
  }

  for (const row of existing) {
    if (!plannedOrders.has(row.round_order ?? 0)) {
      result.push(row);
    }
  }

  return renumberSlotsByRound(result);
}

function toRows(matches: Awaited<ReturnType<typeof listEditionMatches>>["data"]): MatchRow[] {
  return matches.map((m) => {
    const { date, time } = splitUtcDateTime(m.fixture_date);
    return {
      id: m.id,
      round_name: m.round_name,
      round_order: m.round_order,
      slot: m.slot,
      player1_id: m.player1_id ?? "",
      player2_id: m.player2_id ?? "",
      winner_id: m.winner_id ?? "",
      next_match_id: m.next_match_id ?? "",
      next_slot: m.next_slot ?? "",
      fixture_date: date,
      fixture_time: time,
      status: m.status,
      sets: normalizeSetSlots(m.sets),
    };
  });
}

function rowToPayload(row: MatchRow) {
  // Keep set numbers (1..5) so extra sets are not renumbered away on save.
  const sets = filledSetsFromRow(row).map((s) => ({
    set: s.set,
    player1: s.player1,
    player2: s.player2,
  }));

  return {
    id: row.id,
    round_name: row.round_name,
    round_order: row.round_order ?? 1,
    slot: row.slot,
    player1_id: row.player1_id || null,
    player2_id: row.player2_id || null,
    winner_id: row.winner_id || null,
    next_match_id: row.next_match_id || null,
    next_slot: row.next_slot || null,
    fixture_date: combineUtcDateTime(row.fixture_date, row.fixture_time),
    status: row.status,
    sets,
    /** Slot count so adding S4/S5 empty columns still marks the row dirty. */
    set_slot_count: row.sets.length,
  };
}

/** Reassigns slot 1..n within each round, keeping relative order by current slot. */
function renumberSlotsByRound(rows: MatchRow[]): MatchRow[] {
  const next = rows.map((row) => ({ ...row }));
  const roundOrders = [
    ...new Set(next.map((r) => r.round_order ?? 0)),
  ];
  for (const roundOrder of roundOrders) {
    const indices = next
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => (r.round_order ?? 0) === roundOrder)
      .sort((a, b) => a.r.slot - b.r.slot || a.i - b.i);
    indices.forEach(({ i }, seq) => {
      next[i] = { ...next[i], slot: seq + 1 };
    });
  }
  return next;
}

function isRowDirty(row: MatchRow, baselineRows: MatchRow[]): boolean {
  const base = row.id
    ? baselineRows.find((b) => b.id === row.id)
    : baselineRows.find(
        (b) =>
          !b.id &&
          (b.round_order ?? 0) === (row.round_order ?? 0) &&
          b.slot === row.slot,
      );
  if (!base) return true;
  if (JSON.stringify(rowToPayload(row)) !== JSON.stringify(rowToPayload(base))) {
    return true;
  }
  return JSON.stringify(row.sets) !== JSON.stringify(base.sets);
}

function rowsToPersist(rows: MatchRow[], baselineRows: MatchRow[]): MatchRow[] {
  // Always create missing bracket shells (no API id) so R→R+1 wiring has targets.
  const seen = new Set<MatchRow>();
  const out: MatchRow[] = [];
  for (const row of rows) {
    if (isRowDirty(row, baselineRows) || !row.id) {
      if (seen.has(row)) continue;
      seen.add(row);
      out.push(row);
    }
  }
  return out;
}

const inputClass =
  "w-full min-w-0 rounded-[7px] border border-[#d9e0ea] bg-white px-2 py-1.5 text-[13px]";
const selectClass = cn(inputClass, "block");

export function EditionMatchesPanel({ editionId }: { editionId: string }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [baseline, setBaseline] = useState("[]");
  const [activeRoundOrder, setActiveRoundOrder] = useState(1);
  /** Which set-score cell is focused (`${rowIndex}-s${setIndex}-p1|p2`). */
  const [focusedScoreKey, setFocusedScoreKey] = useState<string | null>(null);

  const matchesQuery = useQuery({
    queryKey: ["admin", "tennis", "matches", editionId],
    queryFn: () => listEditionMatches(editionId),
  });
  const editionQuery = useQuery({
    queryKey: ["admin", "tennis", "edition", editionId],
    queryFn: () => getAdminEdition(editionId),
  });
  const participantsQuery = useQuery({
    queryKey: ["admin", "tennis", "participants", editionId],
    queryFn: () => listEditionParticipants(editionId),
  });
  const playersQuery = useQuery({
    queryKey: ["admin", "tennis", "players"],
    queryFn: () => listAdminPlayers(),
  });

  const enrolledCount = participantsQuery.data?.data.length ?? 0;
  const firstRoundMatchCount = useMemo(() => {
    const fromApi = (matchesQuery.data?.data ?? []).filter(
      (m) => (m.round_order ?? 0) === 1,
    ).length;
    if (fromApi > 0) return fromApi;
    return rows.filter((r) => (r.round_order ?? 0) === 1).length;
  }, [matchesQuery.data, rows]);

  const participantsCount = useMemo(
    () =>
      resolveDrawParticipants({
        configured: editionQuery.data?.data.participants_count,
        enrolledCount,
        firstRoundMatchCount,
      }),
    [
      editionQuery.data?.data.participants_count,
      enrolledCount,
      firstRoundMatchCount,
    ],
  );

  const drawRounds = useMemo(
    () =>
      participantsCount != null && participantsCount >= 2
        ? buildDrawRounds(participantsCount)
        : [],
    [participantsCount],
  );

  // Persist draw size when the tournament has entries/matches but drawSize was never saved.
  useEffect(() => {
    const configured = editionQuery.data?.data.participants_count;
    if (configured != null && configured >= 2) return;
    if (participantsCount == null || participantsCount < 2) return;
    if (editionQuery.isFetching || editionQuery.isLoading) return;

    let cancelled = false;
    void updateEdition(editionId, {
      participants_count: participantsCount,
    })
      .then(() => {
        if (cancelled) return;
        void queryClient.invalidateQueries({
          queryKey: ["admin", "tennis", "edition", editionId],
        });
      })
      .catch(() => {
        /* keep UI tabs even if heal fails */
      });
    return () => {
      cancelled = true;
    };
  }, [
    editionId,
    editionQuery.data?.data.participants_count,
    editionQuery.isFetching,
    editionQuery.isLoading,
    participantsCount,
    queryClient,
  ]);

  const playersById = useMemo(
    () => new Map((playersQuery.data?.data ?? []).map((p) => [p.id, p])),
    [playersQuery.data],
  );

  /** Only players enrolled in this edition (Participantes). */
  const selectablePlayers = useMemo(() => {
    const participantIds = new Set(
      (participantsQuery.data?.data ?? []).map((p) => p.player_id),
    );
    return (playersQuery.data?.data ?? []).filter((p) =>
      participantIds.has(p.id),
    );
  }, [participantsQuery.data, playersQuery.data]);

  function playersForSelect(
    selectedId: string,
    rowIndex: number,
    otherIdInMatch: string,
  ): TennisPlayer[] {
    const roundOrder = rows[rowIndex]?.round_order ?? null;
    // A player can appear in later rounds after winning; only block duplicates in the same round.
    // BYE is not a player and may appear in many R1 slots.
    const usedInRound = new Set(
      rows.flatMap((r, i) => {
        if (i === rowIndex) return [];
        if ((r.round_order ?? null) !== roundOrder) return [];
        return [r.player1_id, r.player2_id].filter(
          (id) => Boolean(id) && !isByePlayerId(id),
        );
      }),
    );

    const otherReal = realPlayerId(otherIdInMatch);
    const available = selectablePlayers.filter((p) => {
      if (p.id === selectedId) return true;
      if (otherReal && p.id === otherReal) return false;
      return !usedInRound.has(p.id);
    });

    if (
      selectedId &&
      !isByePlayerId(selectedId) &&
      !available.some((p) => p.id === selectedId) &&
      !selectablePlayers.some((p) => p.id === selectedId)
    ) {
      const selected = playersById.get(selectedId);
      if (selected) return [selected, ...available];
    }
    return available;
  }

  useEffect(() => {
    if (matchesQuery.data == null) return;
    if (editionQuery.isLoading) return;

    const loaded = toRows(matchesQuery.data.data ?? []);
    const enrolled = participantsQuery.data?.data.length ?? 0;
    const firstRound = loaded.filter((r) => (r.round_order ?? 0) === 1).length;
    const participants = resolveDrawParticipants({
      configured: editionQuery.data?.data.participants_count,
      enrolledCount: enrolled,
      firstRoundMatchCount: firstRound,
    });
    const next =
      participants != null && participants >= 2
        ? ensureBracketRows(loaded, participants)
        : loaded;
    setRows(next);
    // Baseline must match what the UI shows (including empty bracket shells).
    setBaseline(JSON.stringify(next));
  }, [
    matchesQuery.data,
    editionQuery.data,
    editionQuery.isLoading,
    participantsQuery.data,
  ]);

  useEffect(() => {
    if (drawRounds.length === 0) return;
    if (!drawRounds.some((round) => round.order === activeRoundOrder)) {
      setActiveRoundOrder(drawRounds[0]!.order);
    }
  }, [drawRounds, activeRoundOrder]);

  const activeRound =
    drawRounds.find((round) => round.order === activeRoundOrder) ?? null;

  const visibleRows = useMemo(() => {
    if (drawRounds.length === 0) {
      return rows.map((row, index) => ({ row, index }));
    }
    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => (row.round_order ?? 0) === activeRoundOrder)
      .sort((a, b) => a.row.slot - b.row.slot || a.index - b.index);
  }, [rows, drawRounds.length, activeRoundOrder]);

  const dirty = JSON.stringify(rows) !== baseline;
  useDirtyGuard(dirty);

  function applyMatchesToUi(
    matches: Awaited<ReturnType<typeof listEditionMatches>>["data"],
  ) {
    const loaded = toRows(matches);
    const participants = resolveDrawParticipants({
      configured: editionQuery.data?.data.participants_count,
      enrolledCount,
      firstRoundMatchCount: loaded.filter((r) => (r.round_order ?? 0) === 1)
        .length,
    });
    const next =
      participants != null && participants >= 2
        ? ensureBracketRows(loaded, participants)
        : loaded;
    setRows(next);
    setBaseline(JSON.stringify(next));
  }

  async function persistMatches() {
    const baselineRows = JSON.parse(baseline) as MatchRow[];
    const currentIds = new Set(rows.flatMap((r) => (r.id ? [r.id] : [])));
    const deleteIds = baselineRows
      .flatMap((r) => (r.id ? [r.id] : []))
      .filter((id) => !currentIds.has(id));
    const toSave = rowsToPersist(rows, baselineRows);
    return saveMatchesBatch(
      editionId,
      toSave.map((row) => rowToPayload(row)),
      { deleteIds },
    );
  }

  const saveMutation = useMutation({
    mutationFn: persistMatches,
    onSuccess: (result) => {
      if (result.propagated > 0) {
        toast.success(
          result.propagated === 1
            ? "Partidos guardados · 1 ganador pasó a la siguiente ronda"
            : `Partidos guardados · ${result.propagated} ganadores pasaron a la siguiente ronda`,
        );
      } else {
        toast.success("Partidos guardados");
      }
      applyMatchesToUi(result.data);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "tennis", "matches", editionId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function updateRow(index: number, patch: Partial<MatchRow>) {
    setRows((prev) => {
      const current = prev[index];
      if (!current) return prev;
      // From R2 on, competitors come from prior-round winners — not manual picks.
      // BYE is only assignable in R1.
      const lockedPlayers = (current.round_order ?? 0) > 1;
      const safePatch: Partial<MatchRow> = { ...patch };
      if (lockedPlayers) {
        delete safePatch.player1_id;
        delete safePatch.player2_id;
      } else {
        if (
          safePatch.player1_id === BYE_PLAYER_ID &&
          (current.round_order ?? 0) !== 1
        ) {
          delete safePatch.player1_id;
        }
        if (
          safePatch.player2_id === BYE_PLAYER_ID &&
          (current.round_order ?? 0) !== 1
        ) {
          delete safePatch.player2_id;
        }
      }
      if (Object.keys(safePatch).length === 0) return prev;

      const next = prev.map((row, i) =>
        i === index ? { ...row, ...safePatch } : row,
      );
      if (safePatch.round_order !== undefined) {
        return renumberSlotsByRound(next);
      }
      if (
        safePatch.player1_id !== undefined ||
        safePatch.player2_id !== undefined
      ) {
        let row = next[index]!;
        // Clear winner if it no longer matches a real competitor.
        if (
          row.winner_id &&
          row.winner_id !== realPlayerId(row.player1_id) &&
          row.winner_id !== realPlayerId(row.player2_id)
        ) {
          row = { ...row, winner_id: "" };
        }
        next[index] = applyByeResolution(row);
      }
      return next;
    });
  }

  const expectedMatchCount = useMemo(
    () => drawRounds.reduce((sum, round) => sum + round.matchCount, 0),
    [drawRounds],
  );

  const activeRoundMatchCount = useMemo(() => {
    if (!activeRound) return 0;
    return rows.filter((row) => (row.round_order ?? 0) === activeRound.order)
      .length;
  }, [rows, activeRound]);

  const plannedMatchCount = useMemo(() => {
    if (drawRounds.length === 0) return rows.length;
    const orders = new Set(drawRounds.map((round) => round.order));
    return rows.filter((row) => orders.has(row.round_order ?? 0)).length;
  }, [rows, drawRounds]);

  /** Draw already has every slot from participants_count → no manual extras. */
  const bracketComplete =
    drawRounds.length > 0 && plannedMatchCount >= expectedMatchCount;
  const activeRoundFull =
    activeRound != null && activeRoundMatchCount >= activeRound.matchCount;
  const canAddMatch =
    drawRounds.length === 0 ? true : !bracketComplete && !activeRoundFull;

  function addRow() {
    if (!canAddMatch) return;
    const round =
      activeRound ??
      ({
        order: activeRoundOrder || 1,
        name: "Ronda",
        matchCount: 0,
      } satisfies DrawRound);
    setRows((prev) =>
      renumberSlotsByRound([
        ...prev,
        emptyMatchRow(round, Number.MAX_SAFE_INTEGER),
      ]),
    );
  }

  if (
    matchesQuery.isLoading ||
    editionQuery.isLoading ||
    participantsQuery.isLoading ||
    playersQuery.isLoading
  ) {
    return <LoadingBlock label="Cargando partidos…" />;
  }

  const busy = saveMutation.isPending;

  return (
    <div className="relative space-y-4">
      {busy ? <LoadingOverlay label="Guardando partidos…" progress /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Partidos / Draw</h2>
          <p className="text-sm text-dx-muted">
            {participantsCount != null
              ? `${participantsCount} participantes · ${drawRounds.length} rondas · ${rows.length} partidos`
              : `${rows.length} partidos en el cuadro`}
          </p>
        </div>
        {drawRounds.length === 0 || !bracketComplete ? (
          <Button
            variant="secondary"
            onClick={addRow}
            disabled={busy || !canAddMatch}
            title={
              activeRoundFull
                ? "Esta ronda ya tiene todos sus partidos"
                : undefined
            }
          >
            + Partido
          </Button>
        ) : null}
      </div>

      {drawRounds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {drawRounds.map((round) => {
            const count = rows.filter(
              (row) => (row.round_order ?? 0) === round.order,
            ).length;
            const active = round.order === activeRoundOrder;
            return (
              <button
                key={round.order}
                type="button"
                onClick={() => setActiveRoundOrder(round.order)}
                className={cn(
                  "cursor-pointer whitespace-nowrap rounded-[9px] border px-2.5 py-2 text-[13px] font-bold",
                  active
                    ? "border-transparent bg-[#edf4ff] text-dx-blue"
                    : "border-dx-line bg-white text-[#5d697d]",
                )}
              >
                {round.name}
                <span className="ml-1.5 font-semibold text-dx-muted">
                  {count}/{round.matchCount}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Note>
          Define la <b>cantidad de participantes</b> en General para generar las
          pestañas de ronda automáticamente.
        </Note>
      )}

      {activeRound ? (
        <p className="text-sm text-dx-muted">
          {activeRound.name}: {visibleRows.length} de {activeRound.matchCount}{" "}
          partidos
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-[14px] border border-dx-line bg-white">
        <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
              <th className="w-[4%] border-b border-dx-line px-2 py-2.5 text-center">
                #
              </th>
              <th className="w-[20%] border-b border-dx-line px-2 py-2.5">
                Jugadores
              </th>
              <th className="w-[28%] border-b border-dx-line px-2 py-2.5">
                Sets
              </th>
              <th className="w-[16%] border-b border-dx-line px-2 py-2.5">
                Ganador
              </th>
              <th className="w-[14%] border-b border-dx-line px-2 py-2.5">
                Estado
              </th>
              <th className="w-[18%] border-b border-dx-line px-2 py-2.5">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ row, index }) => {
              const playersLocked = (row.round_order ?? 0) > 1;
              return (
              <tr key={row.id ?? `row-${index}`}>
                <td className="border-b border-dx-line px-2 py-2 align-middle text-center">
                  <span className="text-[13px] font-medium text-[#344054]">
                    {row.slot}
                  </span>
                </td>
                <td className="border-b border-dx-line px-2 py-2 align-top">
                  {/* pt matches S# header row so J1/J2 line up with set score rows */}
                  <div className="flex flex-col gap-1.5 pt-5">
                    {(
                      [
                        {
                          label: "J1",
                          playerId: row.player1_id,
                          otherId: row.player2_id,
                          field: "player1_id" as const,
                        },
                        {
                          label: "J2",
                          playerId: row.player2_id,
                          otherId: row.player1_id,
                          field: "player2_id" as const,
                        },
                      ] as const
                    ).map((slot) => {
                      const label = playerSlotLabel(
                        slot.playerId,
                        playersById,
                      );
                      const allowBye =
                        !playersLocked && (row.round_order ?? 0) === 1;
                      return (
                        <div
                          key={slot.field}
                          className="flex h-9 min-w-0 items-center gap-1.5"
                          title={
                            playersLocked
                              ? "Se llena con el ganador de la ronda anterior"
                              : undefined
                          }
                        >
                          <span className="w-6 shrink-0 text-[11px] font-bold tracking-wide text-[#667085]">
                            {slot.label}
                          </span>
                          {playersLocked ? (
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-[13px]",
                                slot.playerId
                                  ? "font-medium text-[#253047]"
                                  : "text-[#98a2b3]",
                              )}
                            >
                              {label}
                            </span>
                          ) : (
                            <TextSelect
                              className={cn(
                                selectClass,
                                "h-9 min-w-0 flex-1 py-0",
                              )}
                              value={slot.playerId}
                              disabled={busy}
                              onChange={(e) =>
                                updateRow(index, {
                                  [slot.field]: e.target.value,
                                })
                              }
                            >
                              <option value="">—</option>
                              {allowBye ? (
                                <option value={BYE_PLAYER_ID}>BYE</option>
                              ) : null}
                              {playersForSelect(
                                slot.playerId,
                                index,
                                slot.otherId,
                              ).map((p) => (
                                <option key={p.id} value={p.id}>
                                  {playerDisplayName(p)}
                                </option>
                              ))}
                            </TextSelect>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="border-b border-dx-line px-2 py-2 align-top">
                  <div className="flex items-start gap-1.5">
                    {/*
                      DOM order is row-major (all J1, then all J2) so Tab goes
                      S1→S2→S3 for one player before the other. Grid keeps S#
                      columns visually.
                    */}
                    <div
                      className="grid gap-x-1.5 gap-y-1.5"
                      style={{
                        gridTemplateColumns: `repeat(${row.sets.length}, 44px)`,
                      }}
                    >
                      {row.sets.map((_, setIndex) => (
                        <span
                          key={`sh-${setIndex}`}
                          className="flex h-3.5 items-center justify-center text-[10px] font-bold tracking-wide text-[#667085]"
                        >
                          S{setIndex + 1}
                        </span>
                      ))}
                      {row.sets.map((set, setIndex) => {
                        const key = `${index}-s${setIndex}-p1`;
                        const focused = focusedScoreKey === key;
                        const empty = set.p1 === "";
                        const byeMatch =
                          isByePlayerId(row.player1_id) ||
                          isByePlayerId(row.player2_id);
                        return (
                          <TextInput
                            key={key}
                            className={cn(
                              inputClass,
                              "h-9 w-full px-1 py-0 text-center tabular-nums",
                              !focused && empty && "text-[#98a2b3]",
                            )}
                            inputMode="numeric"
                            aria-label={`Set ${setIndex + 1} jugador 1`}
                            disabled={busy || byeMatch}
                            value={focused ? set.p1 : empty ? "—" : set.p1}
                            onFocus={() => setFocusedScoreKey(key)}
                            onBlur={() =>
                              setFocusedScoreKey((current) =>
                                current === key ? null : current,
                              )
                            }
                            onChange={(e) => {
                              const p1 = e.target.value.replace(/[^\d]/g, "");
                              setRows((prev) => {
                                const current = prev[index];
                                if (!current) return prev;
                                const sets = current.sets.map((s, i) =>
                                  i === setIndex ? { ...s, p1 } : s,
                                );
                                return prev.map((r, i) =>
                                  i === index ? { ...r, sets } : r,
                                );
                              });
                            }}
                          />
                        );
                      })}
                      {row.sets.map((set, setIndex) => {
                        const key = `${index}-s${setIndex}-p2`;
                        const focused = focusedScoreKey === key;
                        const empty = set.p2 === "";
                        const byeMatch =
                          isByePlayerId(row.player1_id) ||
                          isByePlayerId(row.player2_id);
                        return (
                          <TextInput
                            key={key}
                            className={cn(
                              inputClass,
                              "h-9 w-full px-1 py-0 text-center tabular-nums",
                              !focused && empty && "text-[#98a2b3]",
                            )}
                            inputMode="numeric"
                            aria-label={`Set ${setIndex + 1} jugador 2`}
                            disabled={busy || byeMatch}
                            value={focused ? set.p2 : empty ? "—" : set.p2}
                            onFocus={() => setFocusedScoreKey(key)}
                            onBlur={() =>
                              setFocusedScoreKey((current) =>
                                current === key ? null : current,
                              )
                            }
                            onChange={(e) => {
                              const p2 = e.target.value.replace(/[^\d]/g, "");
                              setRows((prev) => {
                                const current = prev[index];
                                if (!current) return prev;
                                const sets = current.sets.map((s, i) =>
                                  i === setIndex ? { ...s, p2 } : s,
                                );
                                return prev.map((r, i) =>
                                  i === index ? { ...r, sets } : r,
                                );
                              });
                            }}
                          />
                        );
                      })}
                    </div>
                    <div className="flex flex-col gap-1.5 pt-5">
                      {row.sets.length < MAX_SET_SLOTS ? (
                        <button
                          type="button"
                          disabled={busy}
                          title="Agregar set (máx. 5)"
                          aria-label="Agregar set"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f6f8fb] text-sm font-bold text-[#46546a] hover:bg-[#eef1f6] disabled:opacity-50"
                          onClick={() =>
                            setRows((prev) => {
                              const current = prev[index];
                              if (
                                !current ||
                                current.sets.length >= MAX_SET_SLOTS
                              ) {
                                return prev;
                              }
                              return prev.map((r, i) =>
                                i === index
                                  ? { ...r, sets: [...r.sets, emptySetScore()] }
                                  : r,
                              );
                            })
                          }
                        >
                          +
                        </button>
                      ) : null}
                      {row.sets.length > DEFAULT_SET_SLOTS ? (
                        <button
                          type="button"
                          disabled={busy}
                          title="Quitar último set"
                          aria-label="Quitar último set"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f6f8fb] text-sm font-bold text-[#46546a] hover:bg-[#eef1f6] disabled:opacity-50"
                          onClick={() =>
                            setRows((prev) => {
                              const current = prev[index];
                              if (
                                !current ||
                                current.sets.length <= DEFAULT_SET_SLOTS
                              ) {
                                return prev;
                              }
                              return prev.map((r, i) =>
                                i === index
                                  ? { ...r, sets: r.sets.slice(0, -1) }
                                  : r,
                              );
                            })
                          }
                        >
                          −
                        </button>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="border-b border-dx-line px-2 py-2 align-middle">
                  <TextSelect
                    className={cn(selectClass, "h-9 py-0")}
                    value={row.winner_id}
                    onChange={(e) =>
                      updateRow(index, { winner_id: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {[row.player1_id, row.player2_id]
                      .filter((id) => Boolean(id) && !isByePlayerId(id))
                      .map((id) => {
                        const p = playersById.get(id);
                        return (
                          <option key={id} value={id}>
                            {p ? playerDisplayName(p) : id}
                          </option>
                        );
                      })}
                  </TextSelect>
                </td>
                <td className="border-b border-dx-line px-2 py-2 align-middle">
                  <TextSelect
                    className={cn(selectClass, "h-9 py-0")}
                    value={row.status}
                    onChange={(e) =>
                      updateRow(index, {
                        status: e.target.value as TennisMatchBoStatus,
                      })
                    }
                  >
                    {(
                      Object.keys(MATCH_STATUS_LABEL) as TennisMatchBoStatus[]
                    )
                      .filter((key) => {
                        // Bye status only when a side is BYE (never had a rival).
                        if (key !== "bye") return true;
                        return (
                          isByePlayerId(row.player1_id) ||
                          isByePlayerId(row.player2_id)
                        );
                      })
                      .map((key) => (
                        <option key={key} value={key}>
                          {MATCH_STATUS_LABEL[key]}
                        </option>
                      ))}
                  </TextSelect>
                </td>
                <td className="border-b border-dx-line px-2 py-2 align-middle">
                  <div className="flex w-full flex-col gap-1">
                    <TextInput
                      type="date"
                      className={cn(inputClass, "h-9 py-0")}
                      value={row.fixture_date}
                      onChange={(e) =>
                        updateRow(index, { fixture_date: e.target.value })
                      }
                    />
                    <TextInput
                      type="time"
                      className={cn(inputClass, "h-9 py-0")}
                      value={row.fixture_time}
                      onChange={(e) =>
                        updateRow(index, { fixture_time: e.target.value })
                      }
                    />
                  </div>
                </td>
              </tr>
              );
            })}
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-sm text-dx-muted"
                >
                  No hay partidos en esta ronda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Note>
        Las rondas se calculan con la cantidad de participantes del torneo.
        En la primera ronda los contrincantes se eligen entre{" "}
        <b>Participantes</b> o <b>BYE</b> (sin rival; el jugador avanza con sets
        en 0). Desde la segunda se llenan solos con los ganadores de la ronda
        anterior. Cada partido trae 3 sets; puedes agregar hasta 5 con <b>+</b>.
      </Note>
      {selectablePlayers.length === 0 ? (
        <Note>
          Aún no hay participantes en este torneo. Captúralos en la pestaña
          Participantes para poder asignar contrincantes.
        </Note>
      ) : null}

      <StickyActions
        dirty={dirty}
        saving={busy}
        saveLabel="Guardar partidos"
        onDiscard={() => {
          const loaded = JSON.parse(baseline) as MatchRow[];
          const participants = resolveDrawParticipants({
            configured: editionQuery.data?.data.participants_count,
            enrolledCount,
            firstRoundMatchCount: loaded.filter(
              (r) => (r.round_order ?? 0) === 1,
            ).length,
          });
          setRows(
            participants != null && participants >= 2
              ? ensureBracketRows(loaded, participants)
              : loaded,
          );
        }}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}
