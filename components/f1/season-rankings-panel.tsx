"use client";
import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listAdminDrivers,
  listAdminF1Teams,
  listDriverRankings,
  listF1Participants,
  listTeamRankings,
  replaceDriverRankings,
  replaceTeamRankings,
} from "@/lib/api/admin-f1";
import { driverDisplayName } from "@/lib/api/f1-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { StickyActions } from "@/components/capture/sticky-actions";
import { cn } from "@/lib/utils";

type DriverRow = { driver_id: string; position: number; points: number };
type TeamRow = { team_id: string; position: number; points: number };

const inputClass =
  "mx-auto max-w-[74px] rounded-[7px] border border-[#d9e0ea] bg-white px-2 py-1.5 text-center text-[13px]";

export function SeasonRankingsPanel({ seasonId }: { seasonId: string }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"drivers" | "teams">("drivers");
  const [driverRows, setDriverRows] = useState<DriverRow[]>([]);
  const [teamRows, setTeamRows] = useState<TeamRow[]>([]);
  const [driverBaseline, setDriverBaseline] = useState("[]");
  const [teamBaseline, setTeamBaseline] = useState("[]");

  const driverRankingsQuery = useQuery({
    queryKey: ["admin", "f1", "driver-rankings", seasonId],
    queryFn: () => listDriverRankings(seasonId),
  });
  const teamRankingsQuery = useQuery({
    queryKey: ["admin", "f1", "team-rankings", seasonId],
    queryFn: () => listTeamRankings(seasonId),
  });
  const participantsQuery = useQuery({
    queryKey: ["admin", "f1", "participants", seasonId],
    queryFn: () => listF1Participants(seasonId),
  });
  const driversQuery = useQuery({
    queryKey: ["admin", "f1", "drivers"],
    queryFn: () => listAdminDrivers(),
  });
  const teamsQuery = useQuery({
    queryKey: ["admin", "f1", "teams"],
    queryFn: listAdminF1Teams,
  });

  const driversById = useMemo(
    () => new Map((driversQuery.data?.data ?? []).map((d) => [d.id, d])),
    [driversQuery.data],
  );
  const teamsById = useMemo(
    () => new Map((teamsQuery.data?.data ?? []).map((t) => [t.id, t])),
    [teamsQuery.data],
  );

  useEffect(() => {
    const rankings = driverRankingsQuery.data?.data ?? [];
    if (rankings.length > 0) {
      const next = rankings.map((r) => ({
        driver_id: r.driver_id,
        position: r.position,
        points: r.points,
      }));
      setDriverRows(next);
      setDriverBaseline(JSON.stringify(next));
      return;
    }
    const participants = participantsQuery.data?.data ?? [];
    if (participants.length === 0) return;
    const next = participants.map((p, index) => ({
      driver_id: p.driver_id,
      position: index + 1,
      points: 0,
    }));
    setDriverRows(next);
    setDriverBaseline(JSON.stringify(next));
  }, [driverRankingsQuery.data, participantsQuery.data]);

  useEffect(() => {
    const rankings = teamRankingsQuery.data?.data ?? [];
    if (rankings.length > 0) {
      const next = rankings.map((r) => ({
        team_id: r.team_id,
        position: r.position,
        points: r.points,
      }));
      setTeamRows(next);
      setTeamBaseline(JSON.stringify(next));
      return;
    }
    const participants = participantsQuery.data?.data ?? [];
    const teamIds = [...new Set(participants.map((p) => p.team_id))];
    if (teamIds.length === 0) return;
    const next = teamIds.map((teamId, index) => ({
      team_id: teamId,
      position: index + 1,
      points: 0,
    }));
    setTeamRows(next);
    setTeamBaseline(JSON.stringify(next));
  }, [teamRankingsQuery.data, participantsQuery.data]);

  const driverDirty = JSON.stringify(driverRows) !== driverBaseline;
  const teamDirty = JSON.stringify(teamRows) !== teamBaseline;
  const dirty = tab === "drivers" ? driverDirty : teamDirty;
  useDirtyGuard(dirty);

  const saveDriversMutation = useMutation({
    mutationFn: () => replaceDriverRankings(seasonId, driverRows),
    onSuccess: () => {
      toast.success("Clasificación de pilotos guardada");
      setDriverBaseline(JSON.stringify(driverRows));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "driver-rankings", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveTeamsMutation = useMutation({
    mutationFn: () => replaceTeamRankings(seasonId, teamRows),
    onSuccess: () => {
      toast.success("Clasificación de equipos guardada");
      setTeamBaseline(JSON.stringify(teamRows));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "team-rankings", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saving =
    tab === "drivers"
      ? saveDriversMutation.isPending
      : saveTeamsMutation.isPending;

  if (driverRankingsQuery.isLoading || teamRankingsQuery.isLoading) {
    return <LoadingBlock label="Cargando clasificaciones…" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Clasificaciones</h2>
          <p className="text-sm text-dx-muted">
            Campeonato de pilotos y constructores
          </p>
        </div>
        <div className="flex gap-1.5 rounded-xl border border-dx-line bg-white p-1.5">
          <Button
            variant={tab === "drivers" ? "primary" : "secondary"}
            onClick={() => setTab("drivers")}
          >
            Pilotos
          </Button>
          <Button
            variant={tab === "teams" ? "primary" : "secondary"}
            onClick={() => setTab("teams")}
          >
            Equipos
          </Button>
        </div>
      </div>

      {tab === "drivers" ? (
        <div className="overflow-x-auto rounded-[14px] border border-dx-line bg-white">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
                <th className="border-b border-dx-line px-3 py-2.5 text-center">
                  Pos.
                </th>
                <th className="border-b border-dx-line px-3 py-2.5">Piloto</th>
                <th className="border-b border-dx-line px-3 py-2.5 text-center">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {driverRows.map((row) => {
                const driver = driversById.get(row.driver_id);
                return (
                  <tr key={row.driver_id}>
                    <td className="border-b border-dx-line px-3 py-2 text-center">
                      <input
                        className={cn(inputClass, "max-w-[56px] font-extrabold")}
                        value={row.position}
                        onChange={(e) =>
                          setDriverRows((prev) =>
                            prev.map((r) =>
                              r.driver_id === row.driver_id
                                ? {
                                    ...r,
                                    position: Number(e.target.value) || 0,
                                  }
                                : r,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="border-b border-dx-line px-3 py-2">
                      <strong>
                        {driver
                          ? driverDisplayName(driver)
                          : row.driver_id}
                      </strong>
                    </td>
                    <td className="border-b border-dx-line px-3 py-2 text-center">
                      <input
                        className={inputClass}
                        value={row.points}
                        onChange={(e) =>
                          setDriverRows((prev) =>
                            prev.map((r) =>
                              r.driver_id === row.driver_id
                                ? {
                                    ...r,
                                    points: Number(e.target.value) || 0,
                                  }
                                : r,
                            ),
                          )
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-dx-line bg-white">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
                <th className="border-b border-dx-line px-3 py-2.5 text-center">
                  Pos.
                </th>
                <th className="border-b border-dx-line px-3 py-2.5">Equipo</th>
                <th className="border-b border-dx-line px-3 py-2.5 text-center">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {teamRows.map((row) => {
                const team = teamsById.get(row.team_id);
                return (
                  <tr key={row.team_id}>
                    <td className="border-b border-dx-line px-3 py-2 text-center">
                      <input
                        className={cn(inputClass, "max-w-[56px] font-extrabold")}
                        value={row.position}
                        onChange={(e) =>
                          setTeamRows((prev) =>
                            prev.map((r) =>
                              r.team_id === row.team_id
                                ? {
                                    ...r,
                                    position: Number(e.target.value) || 0,
                                  }
                                : r,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="border-b border-dx-line px-3 py-2">
                      <strong>{team?.name ?? row.team_id}</strong>
                    </td>
                    <td className="border-b border-dx-line px-3 py-2 text-center">
                      <input
                        className={inputClass}
                        value={row.points}
                        onChange={(e) =>
                          setTeamRows((prev) =>
                            prev.map((r) =>
                              r.team_id === row.team_id
                                ? {
                                    ...r,
                                    points: Number(e.target.value) || 0,
                                  }
                                : r,
                            ),
                          )
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Note>
        Las tablas se inicializan desde participantes si aún no hay ranking
        guardado.
      </Note>

      <StickyActions
        dirty={dirty}
        saving={saving}
        saveLabel={
          tab === "drivers"
            ? "Guardar clasificación pilotos"
            : "Guardar clasificación equipos"
        }
        onDiscard={() => {
          if (tab === "drivers") {
            setDriverRows(JSON.parse(driverBaseline) as DriverRow[]);
          } else {
            setTeamRows(JSON.parse(teamBaseline) as TeamRow[]);
          }
        }}
        onSave={() => {
          if (tab === "drivers") saveDriversMutation.mutate();
          else saveTeamsMutation.mutate();
        }}
      />
    </div>
  );
}
