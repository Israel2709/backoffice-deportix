"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listAdminTeams,
  listParticipants,
  listStandings,
  replaceStandings,
} from "@/lib/api/admin-soccer";
import { teamDisplayName, type SoccerTeam } from "@/lib/api/soccer-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { StickyActions } from "@/components/capture/sticky-actions";
import { cn } from "@/lib/utils";

type StandingRow = {
  team_id: string;
  rank: number;
  played: number;
  goals_for: number;
  goals_against: number;
  points: number;
};

const inputClass =
  "mx-auto max-w-[74px] rounded-[7px] border border-[#d9e0ea] bg-white px-2 py-1.5 text-center text-[13px]";

export function SeasonStandingsPanel({ seasonId }: { seasonId: string }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [baseline, setBaseline] = useState("[]");

  const standingsQuery = useQuery({
    queryKey: ["admin", "soccer", "standings", seasonId],
    queryFn: () => listStandings(seasonId),
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

  useEffect(() => {
    const standings = standingsQuery.data?.data ?? [];
    if (standings.length > 0) {
      const next = standings.map((s, index) => ({
        team_id: s.team_id,
        rank: s.rank ?? index + 1,
        played: s.played ?? 0,
        goals_for: s.goals_for ?? 0,
        goals_against: s.goals_against ?? 0,
        points: s.points ?? 0,
      }));
      setRows(next);
      setBaseline(JSON.stringify(next));
      return;
    }

    const participants = participantsQuery.data?.data ?? [];
    if (participants.length === 0) return;
    const next = participants.map((p, index) => ({
      team_id: p.team_id,
      rank: index + 1,
      played: 0,
      goals_for: 0,
      goals_against: 0,
      points: 0,
    }));
    setRows(next);
    setBaseline(JSON.stringify(next));
  }, [standingsQuery.data, participantsQuery.data]);

  const dirty = JSON.stringify(rows) !== baseline;
  useDirtyGuard(dirty);

  const saveMutation = useMutation({
    mutationFn: () =>
      replaceStandings(
        seasonId,
        rows.map((row) => ({
          ...row,
          wins: 0,
          draws: 0,
          losses: 0,
        })),
      ),
    onSuccess: () => {
      toast.success("Clasificación guardada");
      setBaseline(JSON.stringify(rows));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "standings", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function updateRow(teamId: string, patch: Partial<StandingRow>) {
    setRows((prev) =>
      prev.map((row) => (row.team_id === teamId ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Clasificación</h2>
          <div className="text-sm text-dx-muted">
            {rows.length} equipos · DG calculada automáticamente
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            const invalid = rows.some(
              (r) => r.rank < 1 || r.played < 0 || r.points < 0,
            );
            toast.message(
              invalid
                ? "Hay valores inválidos en la tabla"
                : "Tabla válida para guardar",
            );
          }}
        >
          Validar tabla
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-dx-line bg-white">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                Pos.
              </th>
              <th className="border-b border-dx-line px-3 py-2.5">Equipo</th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                PJ
              </th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                GF
              </th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                GC
              </th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                DG
              </th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const team = teamsById.get(row.team_id);
              const dg = row.goals_for - row.goals_against;
              return (
                <tr key={row.team_id}>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <input
                      className={cn(inputClass, "max-w-[56px] font-extrabold")}
                      value={row.rank}
                      onChange={(e) =>
                        updateRow(row.team_id, {
                          rank: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[#cad9f0] bg-[#edf4ff] text-[10px] font-black text-dx-blue">
                        {team?.team.code?.slice(0, 3) ?? "EQ"}
                      </span>
                      <strong>
                        {team ? teamDisplayName(team) : row.team_id}
                      </strong>
                    </div>
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <input
                      className={inputClass}
                      value={row.played}
                      onChange={(e) =>
                        updateRow(row.team_id, {
                          played: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <input
                      className={inputClass}
                      value={row.goals_for}
                      onChange={(e) =>
                        updateRow(row.team_id, {
                          goals_for: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <input
                      className={inputClass}
                      value={row.goals_against}
                      onChange={(e) =>
                        updateRow(row.team_id, {
                          goals_against: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <span className="inline-flex min-w-[62px] justify-center rounded-[7px] border border-[#d9e4f3] bg-[#f2f6fc] px-2 py-1.5 font-extrabold text-[#41516b]">
                      {dg > 0 ? `+${dg}` : dg}
                    </span>
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <input
                      className={inputClass}
                      value={row.points}
                      onChange={(e) =>
                        updateRow(row.team_id, {
                          points: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Note>
        La posición y los puntos representan la clasificación oficial.{" "}
        <b>DG = GF − GC</b> se calcula automáticamente.
      </Note>

      <StickyActions
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel="Guardar clasificación"
        onDiscard={() => setRows(JSON.parse(baseline) as StandingRow[])}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}
