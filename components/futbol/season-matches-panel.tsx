"use client";
import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  deleteMatch,
  listParticipants,
  listRounds,
  listSeasonMatches,
  listSeasonTeams,
  listTeamsByIds,
  saveMatchesBatch,
} from "@/lib/api/admin-soccer";
import {
  MATCH_STATUS_LABEL,
  teamCode,
  teamDisplayName,
  type MatchBoStatus,
  type SoccerTeam,
} from "@/lib/api/soccer-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Note } from "@/components/ui/note";
import { StickyActions } from "@/components/capture/sticky-actions";
import { TextSelect } from "@/components/capture/field";
import { AddMatchesModal } from "@/components/futbol/add-matches-modal";
import { cn } from "@/lib/utils";
import { combineUtcDateTime, splitUtcDateTime } from "@/lib/format-date";
import { syncStandingsGoalsFromMatches } from "@/lib/soccer/sync-standings-goals";

type MatchRow = {
  key: string;
  id?: string;
  home_team_id: string;
  away_team_id: string;
  home_label: string;
  away_label: string;
  date: string;
  time: string;
  status: MatchBoStatus;
  goals_home: string;
  goals_away: string;
  round_id: string;
  round_name: string;
  round_phase: string;
  round_position: number;
};

type SortColumn = "phase" | "round" | "date";
type SortState = { column: SortColumn; direction: "asc" | "desc" } | null;

function buildTeamLookups(teams: SoccerTeam[]) {
  const byId = new Map<string, SoccerTeam>();
  const byExternal = new Map<string, SoccerTeam>();
  for (const team of teams) {
    byId.set(team.id, team);
    const external = String(team.team.id ?? "").trim();
    if (external) byExternal.set(external, team);
  }
  return { byId, byExternal };
}

function resolveTeamId(
  rawId: string,
  byId: Map<string, SoccerTeam>,
  byExternal: Map<string, SoccerTeam>,
): string {
  if (!rawId) return rawId;
  if (byId.has(rawId)) return rawId;
  return byExternal.get(rawId)?.id ?? rawId;
}

const inputClass =
  "w-full min-w-0 rounded-[7px] border border-[#d9e0ea] bg-white px-2 py-1.5 text-[13px] text-[#243147]";

/** Only fields the PATCH/POST actually persist — ignore display-only drift. */
function matchPersistSignature(row: MatchRow): string {
  return JSON.stringify({
    id: row.id ?? "",
    home_team_id: row.home_team_id,
    away_team_id: row.away_team_id,
    date: row.date,
    time: row.time,
    status: row.status,
    goals_home: row.goals_home,
    goals_away: row.goals_away,
    round_id: row.round_id,
    round_name: row.round_name,
  });
}

export function SeasonMatchesPanel({ seasonId }: { seasonId: string }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [baseline, setBaseline] = useState("[]");
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(() => new Set());
  const [roundFilter, setRoundFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [sort, setSort] = useState<SortState>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    key: string;
    id?: string;
    label: string;
  } | null>(null);

  const matchesQuery = useQuery({
    queryKey: ["admin", "soccer", "matches", seasonId],
    queryFn: () => listSeasonMatches(seasonId),
  });
  const roundsQuery = useQuery({
    queryKey: ["admin", "soccer", "rounds", seasonId],
    queryFn: () => listRounds(seasonId),
  });
  const participantsQuery = useQuery({
    queryKey: ["admin", "soccer", "participants", seasonId],
    queryFn: () => listParticipants(seasonId),
  });

  const participantIds = useMemo(
    () =>
      [...new Set((participantsQuery.data?.data ?? []).map((p) => p.team_id))],
    [participantsQuery.data],
  );

  // One `GET /teams?league=&season=` instead of N× /v1/teams/{id}.
  const seasonTeamsQuery = useQuery({
    queryKey: ["admin", "soccer", "teams", "season", seasonId],
    queryFn: () => listSeasonTeams(seasonId),
  });

  const missingTeamIds = useMemo(() => {
    const known = new Set<string>();
    for (const team of seasonTeamsQuery.data?.data ?? []) {
      known.add(team.id);
      const external = String(team.team.id ?? "").trim();
      if (external) known.add(external);
    }
    return participantIds.filter((id) => id && !known.has(id));
  }, [seasonTeamsQuery.data, participantIds]);

  const orphanTeamsQuery = useQuery({
    queryKey: ["admin", "soccer", "teams-by-ids", seasonId, missingTeamIds],
    queryFn: () => listTeamsByIds(missingTeamIds),
    enabled: missingTeamIds.length > 0,
  });

  const { byId: teamsById, byExternal } = useMemo(
    () =>
      buildTeamLookups([
        ...(seasonTeamsQuery.data?.data ?? []),
        ...(orphanTeamsQuery.data?.data ?? []),
      ]),
    [seasonTeamsQuery.data, orphanTeamsQuery.data],
  );

  const participantTeams = useMemo(() => {
    const seen = new Set<string>();
    const rows: SoccerTeam[] = [];
    for (const id of participantIds) {
      const team = teamsById.get(id);
      if (!team || seen.has(team.id)) continue;
      seen.add(team.id);
      rows.push(team);
    }
    return rows;
  }, [participantIds, teamsById]);

  useEffect(() => {
    const rounds = roundsQuery.data?.data ?? [];
    const next: MatchRow[] = (matchesQuery.data?.data ?? []).map((m) => {
      const { date, time } = splitUtcDateTime(m.fixture_date);
      const round =
        rounds.find((r) => r.name === m.league?.round) ??
        rounds.find((r) => r.id === (m as { round_id?: string }).round_id);
      return {
        key: m.id,
        id: m.id,
        home_team_id: resolveTeamId(m.home_team_id, teamsById, byExternal),
        away_team_id: resolveTeamId(m.away_team_id, teamsById, byExternal),
        home_label: m.teams?.home?.name ?? m.home_team_id,
        away_label: m.teams?.away?.name ?? m.away_team_id,
        date,
        time,
        status: m.bo_status ?? "scheduled",
        goals_home: m.goals?.home == null ? "" : String(m.goals.home),
        goals_away: m.goals?.away == null ? "" : String(m.goals.away),
        round_id: round?.id ?? "",
        round_name: m.league?.round ?? round?.name ?? "",
        // BFF rounds list has no phase; keep the same default as Estructura.
        round_phase: (round?.phase ?? "").trim() || "Fase Regular",
        round_position: round?.position ?? Number.MAX_SAFE_INTEGER,
      };
    });
    setRows(next);
    setBaseline(JSON.stringify(next));
    setDirtyKeys(new Set());
  }, [matchesQuery.data, roundsQuery.data, teamsById, byExternal]);

  const dirty = useMemo(() => {
    if (dirtyKeys.size === 0) return false;
    const baselineRows = (() => {
      try {
        return JSON.parse(baseline) as MatchRow[];
      } catch {
        return [] as MatchRow[];
      }
    })();
    const baselineByKey = new Map(baselineRows.map((row) => [row.key, row]));
    return rows.some((row) => {
      if (!row.id) return true;
      if (!dirtyKeys.has(row.key)) return false;
      const original = baselineByKey.get(row.key);
      if (!original) return true;
      return matchPersistSignature(row) !== matchPersistSignature(original);
    });
  }, [rows, baseline, dirtyKeys]);
  useDirtyGuard(dirty);

  const roundsById = useMemo(() => {
    const map = new Map(
      (roundsQuery.data?.data ?? []).map((round) => [round.id, round]),
    );
    return map;
  }, [roundsQuery.data]);

  const visibleRows = useMemo(() => {
    const filtered =
      roundFilter === "all"
        ? [...rows]
        : rows.filter((r) => r.round_id === roundFilter);

    if (!sort) return filtered;

    const dir = sort.direction === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (sort.column === "phase") {
        const ap = a.round_phase || "—";
        const bp = b.round_phase || "—";
        const cmp = ap.localeCompare(bp, "es", { sensitivity: "base" });
        if (cmp !== 0) return cmp * dir;
        return (
          (a.round_position - b.round_position ||
            a.round_name.localeCompare(b.round_name, "es") ||
            `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)) * dir
        );
      }
      if (sort.column === "round") {
        const cmp =
          a.round_position - b.round_position ||
          a.round_name.localeCompare(b.round_name, "es", {
            sensitivity: "base",
            numeric: true,
          });
        if (cmp !== 0) return cmp * dir;
        return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) * dir;
      }
      // date
      const cmp = `${a.date}T${a.time || "00:00"}`.localeCompare(
        `${b.date}T${b.time || "00:00"}`,
      );
      if (cmp !== 0) return cmp * dir;
      return (
        a.round_position - b.round_position ||
        a.round_name.localeCompare(b.round_name, "es")
      );
    });
    return filtered;
  }, [rows, roundFilter, sort]);

  function toggleSort(column: SortColumn) {
    setSort((prev) => {
      if (!prev || prev.column !== column) {
        return { column, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { column, direction: "desc" };
      }
      return null;
    });
  }

  function SortHeader({
    column,
    label,
  }: {
    column: SortColumn;
    label: string;
  }) {
    const active = sort?.column === column;
    return (
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-[#667085] uppercase hover:text-dx-blue"
      >
        {label}
        {!active ? (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        ) : sort.direction === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5 text-dx-blue" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-dx-blue" />
        )}
      </button>
    );
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const baselineRows = JSON.parse(baseline) as MatchRow[];
      const baselineByKey = new Map(baselineRows.map((row) => [row.key, row]));
      const toPersist = rows.filter((row) => {
        // New rows (no id yet) always persist.
        if (!row.id) return true;
        // Prefer explicit edit tracking; fall back to persist-field diff.
        if (dirtyKeys.has(row.key)) {
          const original = baselineByKey.get(row.key);
          if (!original) return true;
          return matchPersistSignature(row) !== matchPersistSignature(original);
        }
        return false;
      });

      if (toPersist.length === 0) {
        return { data: matchesQuery.data?.data ?? [] };
      }

      for (const row of toPersist) {
        if (!row.home_team_id?.trim() || !row.away_team_id?.trim()) {
          throw new Error(
            "Hay partidos sin local o visitante. Elige ambos equipos antes de guardar.",
          );
        }
      }

      const saved = await saveMatchesBatch(
        seasonId,
        toPersist.map((row) => {
          const home = teamsById.get(row.home_team_id);
          const away = teamsById.get(row.away_team_id);
          return {
            id: row.id,
            home_team_id: row.home_team_id,
            away_team_id: row.away_team_id,
            home_name: home ? teamDisplayName(home) : row.home_label || null,
            away_name: away ? teamDisplayName(away) : row.away_label || null,
            fixture_date: combineUtcDateTime(row.date, row.time),
            status: row.status,
            goals_home:
              row.goals_home === "" ? null : Number(row.goals_home),
            goals_away:
              row.goals_away === "" ? null : Number(row.goals_away),
            round_id: row.round_id || null,
            round_name: row.round_name || null,
          };
        }),
      );
      await syncStandingsGoalsFromMatches(seasonId);
      return saved;
    },
    onSuccess: () => {
      toast.success("Partidos guardados");
      setBaseline(JSON.stringify(rows));
      setDirtyKeys(new Set());
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "matches", seasonId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "standings", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (target: { key: string; id?: string }) => {
      if (target.id?.trim()) {
        await deleteMatch(seasonId, target.id);
        await syncStandingsGoalsFromMatches(seasonId);
      }
      return target.key;
    },
    onSuccess: (key) => {
      toast.success("Partido eliminado");
      setPendingDelete(null);
      setRows((prev) => prev.filter((row) => row.key !== key));
      setBaseline((prev) => {
        try {
          const parsed = JSON.parse(prev) as MatchRow[];
          return JSON.stringify(parsed.filter((row) => row.key !== key));
        } catch {
          return prev;
        }
      });
      setDirtyKeys((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "matches", seasonId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "standings", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function updateRow(key: string, patch: Partial<MatchRow>) {
    setDirtyKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.round_id !== undefined) {
          const round = roundsById.get(patch.round_id);
          next.round_name = round?.name ?? "";
          next.round_phase =
            (round?.phase ?? "").trim() ||
            (round?.name ? "Fase Regular" : "");
          next.round_position =
            round?.position ?? Number.MAX_SAFE_INTEGER;
        }
        const home = next.goals_home.trim();
        const away = next.goals_away.trim();
        // Both scores filled (incl. 0) → Finalizado automatically.
        if (
          home !== "" &&
          away !== "" &&
          Number.isFinite(Number(home)) &&
          Number.isFinite(Number(away)) &&
          next.status !== "finished"
        ) {
          next.status = "finished";
        }
        return next;
      }),
    );
  }

  if (matchesQuery.isLoading || roundsQuery.isLoading) {
    return <LoadingBlock label="Cargando partidos…" />;
  }

  if (matchesQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(matchesQuery.error as Error).message}
      </div>
    );
  }

  const currentRound = roundsQuery.data?.data.find((r) => r.id === roundFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <TextSelect
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value)}
          >
            <option value="all">Todas las jornadas</option>
            {(roundsQuery.data?.data ?? []).map((round) => (
              <option key={round.id} value={round.id}>
                {round.phase ? `${round.phase} · ` : ""}
                {round.name}
              </option>
            ))}
          </TextSelect>
        </div>
        <Button onClick={() => setAddOpen(true)}>Agregar partidos</Button>
      </div>

      <div className="flex items-center justify-between rounded-[10px] border border-[#d9e4f3] bg-[#eef4fb] px-3 py-2.5">
        <div>
          <strong>{currentRound?.name ?? "Todas las jornadas"}</strong>
          <div className="text-[13px] text-dx-muted">
            {visibleRows.length} partidos · edición directa
          </div>
        </div>
        <div className="text-xs text-[#64748b]">Tab avanza campo por campo</div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-dx-line bg-white">
        <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-left text-[13px]">
          <thead>
            <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
              <th className="border-b border-dx-line px-2 py-2.5">
                <SortHeader column="phase" label="Fase" />
              </th>
              <th className="border-b border-dx-line px-2 py-2.5">
                <SortHeader column="round" label="Jornada" />
              </th>
              <th className="border-b border-dx-line px-2 py-2.5">
                <SortHeader column="date" label="Fecha" />
              </th>
              <th className="border-b border-dx-line px-2 py-2.5">Hora</th>
              <th className="border-b border-dx-line px-2 py-2.5">Logo L</th>
              <th className="border-b border-dx-line px-2 py-2.5">Local</th>
              <th className="border-b border-dx-line px-2 py-2.5">Goles L</th>
              <th className="border-b border-dx-line px-2 py-2.5">Goles V</th>
              <th className="border-b border-dx-line px-2 py-2.5 text-right">
                Visitante
              </th>
              <th className="border-b border-dx-line px-2 py-2.5">Logo V</th>
              <th className="border-b border-dx-line px-2 py-2.5">Estado</th>
              <th className="border-b border-dx-line px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const home = teamsById.get(row.home_team_id);
              const away = teamsById.get(row.away_team_id);
              const round = roundsById.get(row.round_id);
              const phaseLabel =
                row.round_phase ||
                round?.phase?.trim() ||
                (row.round_name || round?.name ? "Fase Regular" : "—");
              const rounds = roundsQuery.data?.data ?? [];
              const matchLabel = [
                home ? teamDisplayName(home) : row.home_label || "Local",
                away ? teamDisplayName(away) : row.away_label || "Visitante",
              ].join(" vs ");
              return (
                <tr key={row.key} className="hover:bg-[#fbfdff]">
                  <td className="border-b border-dx-line px-2 py-1.5 text-[#41516b]">
                    {phaseLabel}
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5 min-w-[160px]">
                    <select
                      className={inputClass}
                      value={row.round_id}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { round_id: e.target.value })
                      }
                    >
                      <option value="">Sin jornada</option>
                      {row.round_id && !roundsById.has(row.round_id) ? (
                        <option value={row.round_id}>
                          {row.round_name || row.round_id}
                        </option>
                      ) : null}
                      {rounds.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.phase ? `${item.phase} · ` : ""}
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <input
                      type="date"
                      className={cn(inputClass, "w-[112px]")}
                      value={row.date}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { date: e.target.value })
                      }
                    />
                  </td>                  <td className="border-b border-dx-line px-2 py-1.5">
                    <input
                      type="time"
                      className={cn(inputClass, "w-[120px]")}
                      value={row.time}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { time: e.target.value })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-dx-line text-[10px] font-black text-dx-blue">
                      {home ? teamCode(home).slice(0, 3) : "—"}
                    </div>
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5 min-w-[170px]">
                    <select
                      className={inputClass}
                      value={row.home_team_id}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { home_team_id: e.target.value })
                      }
                    >
                      {!row.home_team_id ? (
                        <option value="">Selecciona local…</option>
                      ) : null}
                      {!teamsById.has(row.home_team_id) && row.home_team_id ? (
                        <option value={row.home_team_id}>
                          {home ? teamDisplayName(home) : row.home_label}
                        </option>
                      ) : null}
                      {participantTeams.map((team) => (
                        <option key={`h-${row.key}-${team.id}`} value={team.id}>
                          {teamDisplayName(team)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <input
                      className={cn(inputClass, "w-[58px] text-center")}
                      inputMode="numeric"
                      value={row.goals_home}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { goals_home: e.target.value })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <input
                      className={cn(inputClass, "w-[58px] text-center")}
                      inputMode="numeric"
                      value={row.goals_away}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { goals_away: e.target.value })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5 min-w-[170px] text-right">
                    <select
                      className={inputClass}
                      value={row.away_team_id}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { away_team_id: e.target.value })
                      }
                    >
                      {!row.away_team_id ? (
                        <option value="">Selecciona visitante…</option>
                      ) : null}
                      {!teamsById.has(row.away_team_id) && row.away_team_id ? (
                        <option value={row.away_team_id}>
                          {away ? teamDisplayName(away) : row.away_label}
                        </option>
                      ) : null}
                      {participantTeams.map((team) => (
                        <option key={`a-${row.key}-${team.id}`} value={team.id}>
                          {teamDisplayName(team)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-dx-line text-[10px] font-black text-dx-blue">
                      {away ? teamCode(away).slice(0, 3) : "—"}
                    </div>
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <select
                      className={cn(inputClass, "min-w-[112px]")}
                      value={row.status}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, {
                          status: e.target.value as MatchBoStatus,
                        })
                      }
                    >
                      {(
                        Object.keys(MATCH_STATUS_LABEL) as MatchBoStatus[]
                      ).map((status) => (
                        <option key={status} value={status}>
                          {MATCH_STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <button
                      type="button"
                      title="Eliminar partido"
                      aria-label={`Eliminar partido ${matchLabel}`}
                      disabled={deleteMutation.isPending}
                      className="rounded-[7px] border border-dx-line p-1.5 text-[#64748b] hover:bg-[#fff1f0] hover:text-[#b42318] disabled:opacity-50"
                      onClick={() =>
                        setPendingDelete({
                          key: row.key,
                          id: row.id,
                          label: matchLabel,
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Note>
        Puedes cambiar la jornada de cada partido y ordenar por Fase, Jornada o
        Fecha. Al guardar, los goles con marcador completo actualizan GF/GC en
        Clasificación.
      </Note>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Eliminar partido"
        description={
          pendingDelete
            ? `¿Eliminar «${pendingDelete.label}»? Se borrará de la base de datos y no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        confirmingLabel="Eliminando…"
        confirming={deleteMutation.isPending}
        onCancel={() => {
          if (!deleteMutation.isPending) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete);
        }}
      />

      <StickyActions
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel="Guardar jornada"
        onDiscard={() => {
          setRows(JSON.parse(baseline) as MatchRow[]);
          setDirtyKeys(new Set());
        }}
        onSave={() => saveMutation.mutate()}
      />

      <AddMatchesModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        seasonId={seasonId}
        rounds={roundsQuery.data?.data ?? []}
        participantTeams={participantTeams}
        teamsById={teamsById}
        defaultRoundId={roundFilter === "all" ? "" : roundFilter}
      />
    </div>
  );
}
