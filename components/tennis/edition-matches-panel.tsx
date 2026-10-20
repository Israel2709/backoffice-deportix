"use client";
import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getAdminEdition,
  listAdminPlayers,
  listEditionMatches,
  propagateWinners,
  saveMatchesBatch,
} from "@/lib/api/admin-tennis";
import {
  MATCH_STATUS_LABEL,
  playerDisplayName,
  playerGenderForEdition,
  type TennisMatchBoStatus,
  type TennisPlayer,
} from "@/lib/api/tennis-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { StickyActions } from "@/components/capture/sticky-actions";
import { TextInput, TextSelect } from "@/components/capture/field";
import { cn } from "@/lib/utils";

type MatchRow = {
  id?: string;
  round_name: string;
  round_order: number;
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

function splitFixture(value: string | null | undefined) {
  if (!value) return { date: "", time: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}

function combineDateTime(date: string, time: string) {
  if (!date) return null;
  const t = time || "00:00";
  const iso = new Date(`${date}T${t}:00`).toISOString();
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function toRows(matches: Awaited<ReturnType<typeof listEditionMatches>>["data"]): MatchRow[] {
  return matches.map((m) => {
    const { date, time } = splitFixture(m.fixture_date);
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
    round_order: row.round_order,
    slot: row.slot,
    player1_id: row.player1_id || null,
    player2_id: row.player2_id || null,
    winner_id: row.winner_id || null,
    next_match_id: row.next_match_id || null,
    next_slot: row.next_slot || null,
    fixture_date: combineDateTime(row.fixture_date, row.fixture_time),
    status: row.status,
    sets,
  };
}

/** Reassigns slot 1..n within each round, keeping relative order by current slot. */
function renumberSlotsByRound(rows: MatchRow[]): MatchRow[] {
  const next = rows.map((row) => ({ ...row }));
  const roundOrders = [...new Set(next.map((r) => r.round_order))];
  for (const roundOrder of roundOrders) {
    const indices = next
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.round_order === roundOrder)
      .sort((a, b) => a.r.slot - b.r.slot || a.i - b.i);
    indices.forEach(({ i }, seq) => {
      next[i] = { ...next[i], slot: seq + 1 };
    });
  }
  return next;
}

function isRowDirty(row: MatchRow, baselineRows: MatchRow[]): boolean {
  if (!row.id) return true;
  const base = baselineRows.find((b) => b.id === row.id);
  if (!base) return true;
  return JSON.stringify(rowToPayload(row)) !== JSON.stringify(rowToPayload(base));
}

const inputClass =
  "w-full min-w-0 rounded-[7px] border border-[#d9e0ea] bg-white px-2 py-1.5 text-[13px]";

export function EditionMatchesPanel({ editionId }: { editionId: string }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [baseline, setBaseline] = useState("[]");

  const matchesQuery = useQuery({
    queryKey: ["admin", "tennis", "matches", editionId],
    queryFn: () => listEditionMatches(editionId),
  });
  const editionQuery = useQuery({
    queryKey: ["admin", "tennis", "edition", editionId],
    queryFn: () => getAdminEdition(editionId),
  });
  const genderFilter = playerGenderForEdition(
    editionQuery.data?.data.gender ?? "ATP",
  );
  const playersQuery = useQuery({
    queryKey: ["admin", "tennis", "players"],
    queryFn: () => listAdminPlayers(),
  });

  const playersById = useMemo(
    () => new Map((playersQuery.data?.data ?? []).map((p) => [p.id, p])),
    [playersQuery.data],
  );

  const selectablePlayers = useMemo(() => {
    const list = playersQuery.data?.data ?? [];
    return list.filter(
      (p) => p.status === "active" && p.gender === genderFilter,
    );
  }, [playersQuery.data, genderFilter]);

  function playersForSelect(
    selectedId: string,
    rowIndex: number,
    otherIdInMatch: string,
  ): TennisPlayer[] {
    const usedElsewhere = new Set(
      rows.flatMap((r, i) =>
        i === rowIndex ? [] : [r.player1_id, r.player2_id].filter(Boolean),
      ),
    );

    const available = selectablePlayers.filter((p) => {
      if (p.id === selectedId) return true;
      if (otherIdInMatch && p.id === otherIdInMatch) return false;
      return !usedElsewhere.has(p.id);
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
    const next = toRows(matchesQuery.data?.data ?? []);
    setRows(next);
    setBaseline(JSON.stringify(next));
  }, [matchesQuery.data]);

  const dirty = JSON.stringify(rows) !== baseline;
  useDirtyGuard(dirty);

  const saveMutation = useMutation({
    mutationFn: () => {
      const baselineRows = JSON.parse(baseline) as MatchRow[];
      const currentIds = new Set(
        rows.flatMap((r) => (r.id ? [r.id] : [])),
      );
      const deleteIds = baselineRows
        .flatMap((r) => (r.id ? [r.id] : []))
        .filter((id) => !currentIds.has(id));
      const dirtyRows = rows.filter((row) => isRowDirty(row, baselineRows));
      if (dirtyRows.length === 0 && deleteIds.length === 0) {
        return listEditionMatches(editionId);
      }
      return saveMatchesBatch(
        editionId,
        dirtyRows.map((row) => rowToPayload(row)),
        { deleteIds },
      );
    },
    onSuccess: (result) => {
      toast.success("Partidos guardados");
      const next = toRows(result.data);
      setRows(next);
      setBaseline(JSON.stringify(next));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "tennis", "matches", editionId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const propagateMutation = useMutation({
    mutationFn: () => propagateWinners(editionId),
    onSuccess: (result) => {
      toast.success(`${result.data.propagated} ganadores propagados`);
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
    const maxRound = rows.reduce((m, r) => Math.max(m, r.round_order), 0);
    const roundOrder = maxRound || 1;
    setRows((prev) =>
      renumberSlotsByRound([
        ...prev,
        {
          round_name: "Ronda",
          round_order: roundOrder,
          slot: Number.MAX_SAFE_INTEGER,
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
        },
      ]),
    );
  }

  function removeRow(index: number) {
    setRows((prev) => renumberSlotsByRound(prev.filter((_, i) => i !== index)));
  }

  if (matchesQuery.isLoading) {
    return <LoadingBlock label="Cargando partidos…" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Partidos / Draw</h2>
          <p className="text-sm text-dx-muted">{rows.length} partidos en el cuadro</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={addRow}>
            + Partido
          </Button>
          <Button
            variant="secondary"
            disabled={propagateMutation.isPending}
            onClick={() => propagateMutation.mutate()}
          >
            Propagar ganadores
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-dx-line bg-white">
        <table className="w-full min-w-[1200px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
              <th className="border-b border-dx-line px-2 py-2.5">Ronda</th>
              <th className="border-b border-dx-line px-2 py-2.5">Ord</th>
              <th className="border-b border-dx-line px-2 py-2.5">Slot</th>
              <th className="border-b border-dx-line px-2 py-2.5">J1</th>
              <th className="border-b border-dx-line px-2 py-2.5">J2</th>
              <th className="border-b border-dx-line px-2 py-2.5">Sets</th>
              <th className="border-b border-dx-line px-2 py-2.5">Ganador</th>
              <th className="border-b border-dx-line px-2 py-2.5">Estado</th>
              <th className="border-b border-dx-line px-2 py-2.5">Fecha</th>
              <th className="border-b border-dx-line px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id ?? `row-${index}`}>
                <td className="border-b border-dx-line px-2 py-2">
                  <TextInput
                    className={cn(inputClass, "min-w-[100px]")}
                    value={row.round_name}
                    onChange={(e) =>
                      updateRow(index, { round_name: e.target.value })
                    }
                  />
                </td>
                <td className="border-b border-dx-line px-2 py-2">
                  <TextInput
                    type="number"
                    className={cn(inputClass, "max-w-[56px]")}
                    value={row.round_order}
                    onChange={(e) =>
                      updateRow(index, {
                        round_order: Number(e.target.value) || 0,
                      })
                    }
                  />
                </td>
                <td className="border-b border-dx-line px-2 py-2">
                  <span className="inline-flex min-w-[56px] px-2 py-1.5 text-[13px] text-[#344054]">
                    {row.slot}
                  </span>
                </td>
                <td className="border-b border-dx-line px-2 py-2">
                  <TextSelect
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
                  <div className="flex flex-col gap-1">
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
          </tbody>
        </table>
      </div>

      <Note>
        Usa <b>Propagar ganadores</b> para avanzar al siguiente partido según
        next_match_id / next_slot. Guarda el draw con el botón inferior.
      </Note>

      <StickyActions
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel="Guardar partidos"
        onDiscard={() => setRows(JSON.parse(baseline) as MatchRow[])}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}
