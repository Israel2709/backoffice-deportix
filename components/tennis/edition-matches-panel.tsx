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
  const sets = row.sets
    .map((s) => ({
      player1: s.p1.trim() ? Number(s.p1) : null,
      player2: s.p2.trim() ? Number(s.p2) : null,
    }))
    .filter((s) => s.player1 != null || s.player2 != null);

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
  return JSON.stringify(rowToPayload(row)) !== JSON.stringify(rowToPayload(base));
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
    const usedInRound = new Set(
      rows.flatMap((r, i) => {
        if (i === rowIndex) return [];
        if ((r.round_order ?? null) !== roundOrder) return [];
        return [r.player1_id, r.player2_id].filter(Boolean);
      }),
    );

    const available = selectablePlayers.filter((p) => {
      if (p.id === selectedId) return true;
      if (otherIdInMatch && p.id === otherIdInMatch) return false;
      return !usedInRound.has(p.id);
    });

    if (
      selectedId &&
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
      const lockedPlayers = (current.round_order ?? 0) > 1;
      const safePatch: Partial<MatchRow> = { ...patch };
      if (lockedPlayers) {
        delete safePatch.player1_id;
        delete safePatch.player2_id;
      }
      if (Object.keys(safePatch).length === 0) return prev;

      const next = prev.map((row, i) =>
        i === index ? { ...row, ...safePatch } : row,
      );
      if (safePatch.round_order !== undefined) {
        return renumberSlotsByRound(next);
      }
      // Clear winner if it no longer matches either competitor.
      if (
        safePatch.player1_id !== undefined ||
        safePatch.player2_id !== undefined
      ) {
        const row = next[index];
        if (
          row.winner_id &&
          row.winner_id !== row.player1_id &&
          row.winner_id !== row.player2_id
        ) {
          next[index] = { ...row, winner_id: "" };
        }
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

  function removeRow(index: number) {
    setRows((prev) => renumberSlotsByRound(prev.filter((_, i) => i !== index)));
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
                  "whitespace-nowrap rounded-[9px] border px-2.5 py-2 text-[13px] font-bold",
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
        <table className="w-full min-w-[1100px] table-fixed border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
              <th className="w-[4%] border-b border-dx-line px-2 py-2.5">#</th>
              <th className="w-[16%] border-b border-dx-line px-2 py-2.5">
                Jugador 1
              </th>
              <th className="w-[16%] border-b border-dx-line px-2 py-2.5">
                Jugador 2
              </th>
              <th className="w-[18%] border-b border-dx-line px-2 py-2.5">
                Sets
              </th>
              <th className="w-[16%] border-b border-dx-line px-2 py-2.5">
                Ganador
              </th>
              <th className="w-[14%] border-b border-dx-line px-2 py-2.5">
                Estado
              </th>
              <th className="w-[14%] border-b border-dx-line px-2 py-2.5">
                Fecha
              </th>
              <th className="w-[8%] border-b border-dx-line px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ row, index }) => {
              const playersLocked = (row.round_order ?? 0) > 1;
              return (
              <tr key={row.id ?? `row-${index}`}>
                <td className="border-b border-dx-line px-2 py-2">
                  <span className="inline-flex min-w-[40px] px-2 py-1.5 text-[13px] text-[#344054]">
                    {row.slot}
                  </span>
                </td>
                <td className="border-b border-dx-line px-2 py-2">
                  <TextSelect
                    className={cn(
                      selectClass,
                      playersLocked && "cursor-not-allowed bg-[#f8fafc] opacity-80",
                    )}
                    value={row.player1_id}
                    disabled={playersLocked || busy}
                    title={
                      playersLocked
                        ? "Se llena con el ganador de la ronda anterior"
                        : undefined
                    }
                    onChange={(e) =>
                      updateRow(index, { player1_id: e.target.value })
                    }
                  >
                    <option value="">
                      {playersLocked ? "Por definir" : "—"}
                    </option>
                    {playersForSelect(row.player1_id, index, row.player2_id).map(
                      (p) => (
                        <option key={p.id} value={p.id}>
                          {playerDisplayName(p)}
                        </option>
                      ),
                    )}
                  </TextSelect>
                </td>
                <td className="border-b border-dx-line px-2 py-2">
                  <TextSelect
                    className={cn(
                      selectClass,
                      playersLocked && "cursor-not-allowed bg-[#f8fafc] opacity-80",
                    )}
                    value={row.player2_id}
                    disabled={playersLocked || busy}
                    title={
                      playersLocked
                        ? "Se llena con el ganador de la ronda anterior"
                        : undefined
                    }
                    onChange={(e) =>
                      updateRow(index, { player2_id: e.target.value })
                    }
                  >
                    <option value="">
                      {playersLocked ? "Por definir" : "—"}
                    </option>
                    {playersForSelect(row.player2_id, index, row.player1_id).map(
                      (p) => (
                        <option key={p.id} value={p.id}>
                          {playerDisplayName(p)}
                        </option>
                      ),
                    )}
                  </TextSelect>
                </td>
                <td className="border-b border-dx-line px-2 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {row.sets.map((set, setIndex) => (
                      <TextInput
                        key={`set-${setIndex}`}
                        className={cn(inputClass, "max-w-[40px]")}
                        placeholder={`S${setIndex + 1}`}
                        disabled={busy}
                        value={
                          set.p1 || set.p2 ? `${set.p1}-${set.p2}` : ""
                        }
                        onChange={(e) => {
                          const [a, b] = e.target.value.split("-");
                          const sets = row.sets.map((s, i) =>
                            i === setIndex
                              ? { p1: a ?? "", p2: b ?? "" }
                              : s,
                          );
                          updateRow(index, { sets });
                        }}
                      />
                    ))}
                    {row.sets.length < MAX_SET_SLOTS ? (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        title="Agregar set (máx. 5)"
                        onClick={() =>
                          updateRow(index, {
                            sets: [...row.sets, emptySetScore()],
                          })
                        }
                      >
                        + Set
                      </Button>
                    ) : null}
                    {row.sets.length > DEFAULT_SET_SLOTS ? (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        title="Quitar último set"
                        onClick={() =>
                          updateRow(index, {
                            sets: row.sets.slice(0, -1),
                          })
                        }
                      >
                        −
                      </Button>
                    ) : null}
                  </div>
                </td>
                <td className="border-b border-dx-line px-2 py-2">
                  <TextSelect
                    className={selectClass}
                    value={row.winner_id}
                    onChange={(e) =>
                      updateRow(index, { winner_id: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {[row.player1_id, row.player2_id]
                      .filter(Boolean)
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
                <td className="border-b border-dx-line px-2 py-2">
                  <TextSelect
                    className={selectClass}
                    value={row.status}
                    onChange={(e) =>
                      updateRow(index, {
                        status: e.target.value as TennisMatchBoStatus,
                      })
                    }
                  >
                    {(
                      Object.keys(MATCH_STATUS_LABEL) as TennisMatchBoStatus[]
                    ).map((key) => (
                      <option key={key} value={key}>
                        {MATCH_STATUS_LABEL[key]}
                      </option>
                    ))}
                  </TextSelect>
                </td>
                <td className="border-b border-dx-line px-2 py-2">
                  <div className="flex w-full flex-col gap-1">
                    <TextInput
                      type="date"
                      className={inputClass}
                      value={row.fixture_date}
                      onChange={(e) =>
                        updateRow(index, { fixture_date: e.target.value })
                      }
                    />
                    <TextInput
                      type="time"
                      className={inputClass}
                      value={row.fixture_time}
                      onChange={(e) =>
                        updateRow(index, { fixture_time: e.target.value })
                      }
                    />
                  </div>
                </td>
                <td className="border-b border-dx-line px-2 py-2">
                  <Button variant="ghost" onClick={() => removeRow(index)}>
                    Quitar
                  </Button>
                </td>
              </tr>
              );
            })}
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
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
        <b>Participantes</b>; desde la segunda se llenan solos con los ganadores
        de la ronda anterior (no se editan a mano). Cada partido trae 3 sets;
        puedes agregar hasta 5 con <b>+ Set</b>.
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
