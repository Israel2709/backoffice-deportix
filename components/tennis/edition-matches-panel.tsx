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
  type DrawRound,
} from "@/lib/tennis/draw-rounds";
import { combineUtcDateTime, splitUtcDateTime } from "@/lib/format-date";

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
  set1_p1: string;
  set1_p2: string;
  set2_p1: string;
  set2_p2: string;
  set3_p1: string;
  set3_p2: string;
};

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
    set1_p1: "",
    set1_p2: "",
    set2_p1: "",
    set2_p2: "",
    set3_p1: "",
    set3_p2: "",
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
    const sets = m.sets ?? [];
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
      set1_p1: sets[0]?.player1 != null ? String(sets[0].player1) : "",
      set1_p2: sets[0]?.player2 != null ? String(sets[0].player2) : "",
      set2_p1: sets[1]?.player1 != null ? String(sets[1].player1) : "",
      set2_p2: sets[1]?.player2 != null ? String(sets[1].player2) : "",
      set3_p1: sets[2]?.player1 != null ? String(sets[2].player1) : "",
      set3_p2: sets[2]?.player2 != null ? String(sets[2].player2) : "",
    };
  });
}

function rowToPayload(row: MatchRow) {
  const sets = [
    { player1: row.set1_p1 ? Number(row.set1_p1) : null, player2: row.set1_p2 ? Number(row.set1_p2) : null },
    { player1: row.set2_p1 ? Number(row.set2_p1) : null, player2: row.set2_p2 ? Number(row.set2_p2) : null },
    { player1: row.set3_p1 ? Number(row.set3_p1) : null, player2: row.set3_p2 ? Number(row.set3_p2) : null },
  ].filter((s) => s.player1 != null || s.player2 != null);

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

  const participantsCount =
    editionQuery.data?.data.participants_count ?? null;

  const drawRounds = useMemo(
    () =>
      participantsCount != null && participantsCount >= 2
        ? buildDrawRounds(participantsCount)
        : [],
    [participantsCount],
  );

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
    const participants = editionQuery.data?.data.participants_count;
    const next =
      participants != null && participants >= 2
        ? ensureBracketRows(loaded, participants)
        : loaded;
    setRows(next);
    // Baseline must match what the UI shows (including empty bracket shells).
    setBaseline(JSON.stringify(next));
  }, [matchesQuery.data, editionQuery.data, editionQuery.isLoading]);

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
    const participants = editionQuery.data?.data.participants_count;
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
      const next = prev.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      );
      if (patch.round_order !== undefined) {
        return renumberSlotsByRound(next);
      }
      // Clear winner if it no longer matches either competitor.
      if (patch.player1_id !== undefined || patch.player2_id !== undefined) {
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

  function addRow() {
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
        <Button variant="secondary" onClick={addRow} disabled={busy}>
          + Partido
        </Button>
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
              <th className="w-[12%] border-b border-dx-line px-2 py-2.5">
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
            {visibleRows.map(({ row, index }) => (
              <tr key={row.id ?? `row-${index}`}>
                <td className="border-b border-dx-line px-2 py-2">
                  <span className="inline-flex min-w-[40px] px-2 py-1.5 text-[13px] text-[#344054]">
                    {row.slot}
                  </span>
                </td>
                <td className="border-b border-dx-line px-2 py-2">
                  <TextSelect
                    className={selectClass}
                    value={row.player1_id}
                    onChange={(e) =>
                      updateRow(index, { player1_id: e.target.value })
                    }
                  >
                    <option value="">—</option>
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
                    className={selectClass}
                    value={row.player2_id}
                    onChange={(e) =>
                      updateRow(index, { player2_id: e.target.value })
                    }
                  >
                    <option value="">—</option>
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
                  <div className="flex gap-1">
                    <TextInput
                      className={cn(inputClass, "max-w-[36px]")}
                      placeholder="S1"
                      value={`${row.set1_p1}-${row.set1_p2}`}
                      onChange={(e) => {
                        const [a, b] = e.target.value.split("-");
                        updateRow(index, { set1_p1: a ?? "", set1_p2: b ?? "" });
                      }}
                    />
                    <TextInput
                      className={cn(inputClass, "max-w-[36px]")}
                      placeholder="S2"
                      value={`${row.set2_p1}-${row.set2_p2}`}
                      onChange={(e) => {
                        const [a, b] = e.target.value.split("-");
                        updateRow(index, { set2_p1: a ?? "", set2_p2: b ?? "" });
                      }}
                    />
                    <TextInput
                      className={cn(inputClass, "max-w-[36px]")}
                      placeholder="S3"
                      value={`${row.set3_p1}-${row.set3_p2}`}
                      onChange={(e) => {
                        const [a, b] = e.target.value.split("-");
                        updateRow(index, { set3_p1: a ?? "", set3_p2: b ?? "" });
                      }}
                    />
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
            ))}
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
        Los contrincantes solo pueden elegirse entre los de{" "}
        <b>Participantes</b>. Al guardar con ganadores, el cuadro se enlaza y
        cada ganador pasa solo a la ronda siguiente; revisa esa pestaña.
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
          const participants = editionQuery.data?.data.participants_count;
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
