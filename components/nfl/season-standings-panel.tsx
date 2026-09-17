"use client";
import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listAdminTeams,
  listParticipants,
  listStandings,
  replaceStandings,
} from "@/lib/api/admin-nfl";
import {
  deriveWinPercentage,
  formatWinPercentage,
  teamAbbrev,
  teamDisplayName,
  type NflTeam,
} from "@/lib/api/nfl-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { StickyActions } from "@/components/capture/sticky-actions";
import { cn } from "@/lib/utils";

type StandingRow = {
  team_id: string;
  rank: number;
  played: number;
  won: number;
  ties: number;
  lost: number;
};

const inputClass =
  "mx-auto max-w-[74px] rounded-[7px] border border-[#d9e0ea] bg-white px-2 py-1.5 text-center text-[13px]";

export function SeasonStandingsPanel({ seasonId }: { seasonId: string }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [baseline, setBaseline] = useState("[]");

  const standingsQuery = useQuery({
    queryKey: ["admin", "nfl", "standings", seasonId],
    queryFn: () => listStandings(seasonId),
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

  useEffect(() => {
    const standings = standingsQuery.data?.data ?? [];
    if (standings.length > 0) {
      const next = standings.map((s, index) => ({
        team_id: s.team_id,
        rank: s.rank ?? s.position ?? index + 1,
        played: s.played ?? s.won + s.lost + s.ties,
        won: s.won ?? 0,
        ties: s.ties ?? 0,
        lost: s.lost ?? 0,
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
      won: 0,
      ties: 0,
      lost: 0,
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
          team_id: row.team_id,
          rank: row.rank,
          played: row.played,
          won: row.won,
          lost: row.lost,
          ties: row.ties,
        })),
      ),
    onSuccess: () => {
      toast.success("Clasificación guardada");
      setBaseline(JSON.stringify(rows));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "nfl", "standings", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function updateRow(teamId: string, patch: Partial<StandingRow>) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.team_id !== teamId) return row;
        const next = { ...row, ...patch };
        if ("won" in patch || "lost" in patch || "ties" in patch) {
          next.played = next.won + next.lost + next.ties;
        }
        return next;
      }),
    );
  }

  if (standingsQuery.isLoading || participantsQuery.isLoading) {
    return <LoadingBlock label="Cargando clasificación…" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Clasificación</h2>
          <div className="text-sm text-dx-muted">
            {rows.length} equipos · % calculado automáticamente
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            const invalid = rows.some((r) => {
              const pj = r.won + r.lost + r.ties;
              return r.rank < 1 || r.played < 0 || r.played !== pj;
            });
            toast.message(
              invalid
                ? "Hay valores inválidos (PJ debe ser G + E + P)"
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
                G
              </th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                E
              </th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                P
              </th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const team = teamsById.get(row.team_id);
              const pct = deriveWinPercentage(
                row.won,
                row.lost,
                row.ties,
                row.played,
              );
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
                        {team ? teamAbbrev(team) : "EQ"}
                      </span>
                      <strong>
                        {team ? teamDisplayName(team) : row.team_id}
                      </strong>
                    </div>
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <span className="inline-flex min-w-[62px] justify-center rounded-[7px] border border-[#d9e4f3] bg-[#f2f6fc] px-2 py-1.5 font-extrabold text-[#41516b]">
                      {row.played}
                    </span>
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <input
                      className={inputClass}
                      value={row.won}
                      onChange={(e) =>
                        updateRow(row.team_id, {
                          won: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <input
                      className={inputClass}
                      value={row.ties}
                      onChange={(e) =>
                        updateRow(row.team_id, {
                          ties: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <input
                      className={inputClass}
                      value={row.lost}
                      onChange={(e) =>
                        updateRow(row.team_id, {
                          lost: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <span className="inline-flex min-w-[62px] justify-center rounded-[7px] border border-[#d9e4f3] bg-[#f2f6fc] px-2 py-1.5 font-extrabold text-[#41516b]">
                      {formatWinPercentage(pct)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Note>
        Clasificación NFL: <b>PJ = G + E + P</b>. El porcentaje de victorias se
        calcula como <b>(G + 0.5 × E) / PJ</b>.
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
