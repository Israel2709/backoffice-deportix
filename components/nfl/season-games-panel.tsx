"use client";
import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listAdminTeams,
  listParticipants,
  listRounds,
  listSeasonGames,
  saveGamesBatch,
} from "@/lib/api/admin-nfl";
import {
  GAME_STATUS_LABEL,
  teamAbbrev,
  teamDisplayName,
  type GameBoStatus,
  type NflTeam,
} from "@/lib/api/nfl-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { StickyActions } from "@/components/capture/sticky-actions";
import { TextSelect } from "@/components/capture/field";
import { cn } from "@/lib/utils";

type GameRow = {
  key: string;
  id?: string;
  home_team_id: string;
  away_team_id: string;
  date: string;
  time: string;
  status: GameBoStatus;
  score_home: string;
  score_away: string;
  round_id: string;
  week: string;
};

function splitGameDate(iso: string | null | undefined) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return { date, time };
}

function combineDateTime(date: string, time: string) {
  if (!date) return null;
  const t = time || "00:00";
  const iso = new Date(`${date}T${t}:00`).toISOString();
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

const inputClass =
  "w-full min-w-0 rounded-[7px] border border-[#d9e0ea] bg-white px-2 py-1.5 text-[13px] text-[#243147]";

export function SeasonGamesPanel({ seasonId }: { seasonId: string }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<GameRow[]>([]);
  const [baseline, setBaseline] = useState("[]");
  const [roundFilter, setRoundFilter] = useState<string>("all");
  const [weekFilter, setWeekFilter] = useState<string>("all");

  const gamesQuery = useQuery({
    queryKey: ["admin", "nfl", "games", seasonId],
    queryFn: () => listSeasonGames(seasonId),
  });
  const roundsQuery = useQuery({
    queryKey: ["admin", "nfl", "rounds", seasonId],
    queryFn: () => listRounds(seasonId),
  });
  const participantsQuery = useQuery({
    queryKey: ["admin", "nfl", "participants", seasonId],
    queryFn: () => listParticipants(seasonId),
  });
  const teamsQuery = useQuery({
    queryKey: ["admin", "nfl", "teams"],
    queryFn: () => listAdminTeams(),
  });

  const teamsById = useMemo(() => {
    const map = new Map<string, NflTeam>();
    for (const team of teamsQuery.data?.data ?? []) map.set(team.id, team);
    return map;
  }, [teamsQuery.data]);

  const participantTeams = useMemo(() => {
    const ids = new Set(
      (participantsQuery.data?.data ?? []).map((p) => p.team_id),
    );
    const all = teamsQuery.data?.data ?? [];
    if (ids.size === 0) return all;
    return all.filter((t) => ids.has(t.id));
  }, [participantsQuery.data, teamsQuery.data]);

  const weekOptions = useMemo(() => {
    const weeks = new Set<string>();
    for (const row of rows) {
      if (row.week.trim()) weeks.add(row.week.trim());
    }
    return [...weeks].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rows]);

  useEffect(() => {
    const rounds = roundsQuery.data?.data ?? [];
    const next: GameRow[] = (gamesQuery.data?.data ?? []).map((g) => {
      const { date, time } = splitGameDate(g.game_date);
      const roundName = g.game?.week ?? "";
      const round =
        rounds.find((r) => r.name === roundName) ??
        rounds.find((r) => String(r.position) === roundName.replace(/\D/g, ""));
      return {
        key: g.id,
        id: g.id,
        home_team_id: g.home_team_id,
        away_team_id: g.away_team_id,
        date,
        time,
        status: g.bo_status ?? "scheduled",
        score_home:
          g.scores?.home?.total == null ? "" : String(g.scores.home.total),
        score_away:
          g.scores?.away?.total == null ? "" : String(g.scores.away.total),
        round_id: round?.id ?? "",
        week: g.game?.week ?? round?.name ?? "",
      };
    });
    setRows(next);
    setBaseline(JSON.stringify(next));
  }, [gamesQuery.data, roundsQuery.data]);

  const dirty = JSON.stringify(rows) !== baseline;
  useDirtyGuard(dirty);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (roundFilter !== "all" && row.round_id !== roundFilter) return false;
      if (weekFilter !== "all" && row.week !== weekFilter) return false;
      return true;
    });
  }, [rows, roundFilter, weekFilter]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveGamesBatch(
        seasonId,
        rows.map((row) => ({
          id: row.id,
          home_team_id: row.home_team_id,
          away_team_id: row.away_team_id,
          game_date: combineDateTime(row.date, row.time),
          status: row.status,
          score_home: row.score_home === "" ? null : Number(row.score_home),
          score_away: row.score_away === "" ? null : Number(row.score_away),
          round_id: row.round_id || null,
          week: row.week.trim() || null,
        })),
      ),
    onSuccess: () => {
      toast.success("Partidos guardados");
      setBaseline(JSON.stringify(rows));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "nfl", "games", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function updateRow(key: string, patch: Partial<GameRow>) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addGame() {
    const firstRound = roundsQuery.data?.data[0];
    const home = participantTeams[0]?.id ?? "";
    const away = participantTeams[1]?.id ?? "";
    setRows((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        home_team_id: home,
        away_team_id: away,
        date: "",
        time: "",
        status: "scheduled",
        score_home: "",
        score_away: "",
        round_id: firstRound?.id ?? "",
        week: firstRound?.name ?? "",
      },
    ]);
  }

  if (gamesQuery.isLoading || roundsQuery.isLoading) {
    return <LoadingBlock label="Cargando partidos…" />;
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
            <option value="all">Todas las semanas (estructura)</option>
            {(roundsQuery.data?.data ?? []).map((round) => (
              <option key={round.id} value={round.id}>
                {round.phase ? `${round.phase} · ` : ""}
                {round.name}
              </option>
            ))}
          </TextSelect>
          <TextSelect
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value)}
          >
            <option value="all">Todas las semanas (campo)</option>
            {weekOptions.map((week) => (
              <option key={week} value={week}>
                {week}
              </option>
            ))}
          </TextSelect>
        </div>
        <Button onClick={addGame}>+ Agregar partido</Button>
      </div>

      <div className="flex items-center justify-between rounded-[10px] border border-[#d9e4f3] bg-[#eef4fb] px-3 py-2.5">
        <div>
          <strong>
            {currentRound?.name ??
              (weekFilter !== "all" ? weekFilter : "Todos los partidos")}
          </strong>
          <div className="text-[13px] text-dx-muted">
            {visibleRows.length} partidos · edición directa
          </div>
        </div>
        <div className="text-xs text-[#64748b]">Tab avanza campo por campo</div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-dx-line bg-white">
        <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left text-[13px]">
          <thead>
            <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
              <th className="border-b border-dx-line px-2 py-2.5">Semana</th>
              <th className="border-b border-dx-line px-2 py-2.5">Fecha</th>
              <th className="border-b border-dx-line px-2 py-2.5">Hora</th>
              <th className="border-b border-dx-line px-2 py-2.5">Logo L</th>
              <th className="border-b border-dx-line px-2 py-2.5">Local</th>
              <th className="border-b border-dx-line px-2 py-2.5">SL</th>
              <th className="border-b border-dx-line px-2 py-2.5">SV</th>
              <th className="border-b border-dx-line px-2 py-2.5 text-right">
                Visitante
              </th>
              <th className="border-b border-dx-line px-2 py-2.5">Logo V</th>
              <th className="border-b border-dx-line px-2 py-2.5">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const home = teamsById.get(row.home_team_id);
              const away = teamsById.get(row.away_team_id);
              return (
                <tr key={row.key} className="hover:bg-[#fbfdff]">
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <input
                      className={cn(inputClass, "w-[88px]")}
                      value={row.week}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { week: e.target.value })
                      }
                    />
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
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <input
                      type="time"
                      className={cn(inputClass, "w-[82px]")}
                      value={row.time}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { time: e.target.value })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-dx-line text-[10px] font-black text-dx-blue">
                      {home ? teamAbbrev(home) : "—"}
                    </div>
                  </td>
                  <td className="min-w-[170px] border-b border-dx-line px-2 py-1.5">
                    <select
                      className={inputClass}
                      value={row.home_team_id}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { home_team_id: e.target.value })
                      }
                    >
                      {participantTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {teamDisplayName(team)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <input
                      className={cn(inputClass, "w-[58px] text-center")}
                      inputMode="numeric"
                      value={row.score_home}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { score_home: e.target.value })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <input
                      className={cn(inputClass, "w-[58px] text-center")}
                      inputMode="numeric"
                      value={row.score_away}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { score_away: e.target.value })
                      }
                    />
                  </td>
                  <td className="min-w-[170px] border-b border-dx-line px-2 py-1.5 text-right">
                    <select
                      className={inputClass}
                      value={row.away_team_id}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, { away_team_id: e.target.value })
                      }
                    >
                      {participantTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {teamDisplayName(team)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-dx-line text-[10px] font-black text-dx-blue">
                      {away ? teamAbbrev(away) : "—"}
                    </div>
                  </td>
                  <td className="border-b border-dx-line px-2 py-1.5">
                    <select
                      className={cn(inputClass, "min-w-[112px]")}
                      value={row.status}
                      tabIndex={1}
                      onChange={(e) =>
                        updateRow(row.key, {
                          status: e.target.value as GameBoStatus,
                        })
                      }
                    >
                      {(Object.keys(GAME_STATUS_LABEL) as GameBoStatus[]).map(
                        (status) => (
                          <option key={status} value={status}>
                            {GAME_STATUS_LABEL[status]}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Note>
        Orden visual: Semana → Logo Local → Local → SL → SV → Visitante → Logo
        Visitante. Marcadores por puntos (no goles). Guardado consolidado por
        lote.
      </Note>

      <StickyActions
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel="Guardar partidos"
        onDiscard={() => setRows(JSON.parse(baseline) as GameRow[])}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}
