"use client";
import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listParticipants,
  listRounds,
  listSeasonMatches,
  listAdminTeams,
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
import { Note } from "@/components/ui/note";
import { StickyActions } from "@/components/capture/sticky-actions";
import { TextSelect } from "@/components/capture/field";
import { cn } from "@/lib/utils";

type MatchRow = {
  key: string;
  id?: string;
  home_team_id: string;
  away_team_id: string;
  date: string;
  time: string;
  status: MatchBoStatus;
  goals_home: string;
  goals_away: string;
  round_id: string;
  round_name: string;
};

function splitFixtureDate(iso: string | null | undefined) {
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

export function SeasonMatchesPanel({ seasonId }: { seasonId: string }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [baseline, setBaseline] = useState("[]");
  const [roundFilter, setRoundFilter] = useState<string>("all");

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
  const teamsQuery = useQuery({
    queryKey: ["admin", "soccer", "teams"],
    queryFn: () => listAdminTeams(),
  });

  const teamsById = useMemo(() => {
    const map = new Map<string, SoccerTeam>();
    for (const team of teamsQuery.data?.data ?? []) map.set(team.id, team);
    return map;
  }, [teamsQuery.data]);

  const participantTeams = useMemo(() => {
    const ids = new Set(
      (participantsQuery.data?.data ?? []).map((p) => p.team_id),
    );
    const all = teamsQuery.data?.data ?? [];
    if (ids.size === 0) return all.filter((t) => (t.status ?? "active") === "active");
    return all.filter((t) => ids.has(t.id));
  }, [participantsQuery.data, teamsQuery.data]);

  useEffect(() => {
    const rounds = roundsQuery.data?.data ?? [];
    const next: MatchRow[] = (matchesQuery.data?.data ?? []).map((m) => {
      const { date, time } = splitFixtureDate(m.fixture_date);
      const round =
        rounds.find((r) => r.name === m.league?.round) ??
        rounds.find((r) => r.id === (m as { round_id?: string }).round_id);
      return {
        key: m.id,
        id: m.id,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        date,
        time,
        status: m.bo_status ?? "scheduled",
        goals_home: m.goals?.home == null ? "" : String(m.goals.home),
        goals_away: m.goals?.away == null ? "" : String(m.goals.away),
        round_id: round?.id ?? "",
        round_name: m.league?.round ?? round?.name ?? "",
      };
    });
    setRows(next);
    setBaseline(JSON.stringify(next));
  }, [matchesQuery.data, roundsQuery.data]);

  const dirty = JSON.stringify(rows) !== baseline;
  useDirtyGuard(dirty);

  const visibleRows = useMemo(() => {
    if (roundFilter === "all") return rows;
    return rows.filter((r) => r.round_id === roundFilter);
  }, [rows, roundFilter]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveMatchesBatch(
        seasonId,
        rows.map((row) => ({
          id: row.id,
          home_team_id: row.home_team_id,
          away_team_id: row.away_team_id,
          fixture_date: combineDateTime(row.date, row.time),
          status: row.status,
          goals_home:
            row.goals_home === "" ? null : Number(row.goals_home),
          goals_away:
            row.goals_away === "" ? null : Number(row.goals_away),
          round_id: row.round_id || null,
          round_name: row.round_name || null,
        })),
      ),
    onSuccess: () => {
      toast.success("Partidos guardados");
      setBaseline(JSON.stringify(rows));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "matches", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function updateRow(key: string, patch: Partial<MatchRow>) {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addMatch() {
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
        goals_home: "",
        goals_away: "",
        round_id: firstRound?.id ?? "",
        round_name: firstRound?.name ?? "",
      },
    ]);
  }

  if (matchesQuery.isLoading || roundsQuery.isLoading) {
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
            <option value="all">Todas las jornadas</option>
            {(roundsQuery.data?.data ?? []).map((round) => (
              <option key={round.id} value={round.id}>
                {round.phase ? `${round.phase} · ` : ""}
                {round.name}
              </option>
            ))}
          </TextSelect>
        </div>
        <Button onClick={addMatch}>+ Agregar partido</Button>
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
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left text-[13px]">
          <thead>
            <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
              <th className="border-b border-dx-line px-2 py-2.5">Fecha</th>
              <th className="border-b border-dx-line px-2 py-2.5">Hora</th>
              <th className="border-b border-dx-line px-2 py-2.5">Logo L</th>
              <th className="border-b border-dx-line px-2 py-2.5">Local</th>
              <th className="border-b border-dx-line px-2 py-2.5">ML</th>
              <th className="border-b border-dx-line px-2 py-2.5">MV</th>
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
                      {participantTeams.map((team) => (
                        <option key={team.id} value={team.id}>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Note>
        Orden visual: Logo Local → Nombre Local → ML → MV → Visitante → Logo
        Visitante. Guardado consolidado por lote.
      </Note>

      <StickyActions
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel="Guardar jornada"
        onDiscard={() => setRows(JSON.parse(baseline) as MatchRow[])}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}
