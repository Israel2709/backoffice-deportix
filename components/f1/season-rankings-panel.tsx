"use client";

import { LoadingBlock } from "@/components/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
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
import {
  EditableDataTable,
  type EditableColumn,
} from "@/components/data/editable-data-table";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";

type DriverRankingRow = {
  id: string;
  rankingId?: string;
  driver_id: string;
  position: number;
  points: number;
  wins: number;
  podiums: number;
};

type TeamRankingRow = {
  id: string;
  rankingId?: string;
  team_id: string;
  position: number;
  points: number;
  wins: number;
  podiums: number;
};

function draftDriverId(driverId: string) {
  return `new:driver:${driverId}`;
}

function draftTeamId(teamId: string) {
  return `new:team:${teamId}`;
}

function isDraftId(id: string) {
  return id.startsWith("new:");
}

function numFrom(value: string | undefined, fallback = 0): number {
  if (value == null || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Higher points first; ties broken by wins, then podiums. */
function withCalculatedPositions<
  T extends { id: string; points: number; wins: number; podiums: number },
>(rows: T[]): Array<T & { position: number }> {
  const ranked = [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.podiums - a.podiums;
  });
  const positionById = new Map(
    ranked.map((row, index) => [row.id, index + 1]),
  );
  return rows
    .map((row) => ({
      ...row,
      position: positionById.get(row.id) ?? 0,
    }))
    .sort((a, b) => a.position - b.position);
}

export function SeasonRankingsPanel({ seasonId }: { seasonId: string }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"drivers" | "teams">("drivers");

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

  const driverRows = useMemo<DriverRankingRow[]>(() => {
    const participants = participantsQuery.data?.data ?? [];
    const rankings = driverRankingsQuery.data?.data ?? [];
    const byDriver = new Map(rankings.map((r) => [r.driver_id, r]));

    const rows = participants.map((p) => {
      const ranking = byDriver.get(p.driver_id);
      if (ranking) {
        return {
          id: ranking.id,
          rankingId: ranking.id,
          driver_id: p.driver_id,
          position: ranking.position,
          points: ranking.points,
          wins: ranking.wins,
          podiums: ranking.podiums,
        };
      }
      return {
        id: draftDriverId(p.driver_id),
        driver_id: p.driver_id,
        position: 0,
        points: 0,
        wins: 0,
        podiums: 0,
      };
    });

    return withCalculatedPositions(rows);
  }, [participantsQuery.data, driverRankingsQuery.data]);

  const teamRows = useMemo<TeamRankingRow[]>(() => {
    const participants = participantsQuery.data?.data ?? [];
    const rankings = teamRankingsQuery.data?.data ?? [];
    const byTeam = new Map(rankings.map((r) => [r.team_id, r]));
    const teamIds = [...new Set(participants.map((p) => p.team_id))];

    const rows = teamIds.map((teamId) => {
      const ranking = byTeam.get(teamId);
      if (ranking) {
        return {
          id: ranking.id,
          rankingId: ranking.id,
          team_id: teamId,
          position: ranking.position,
          points: ranking.points,
          wins: ranking.wins,
          podiums: ranking.podiums,
        };
      }
      return {
        id: draftTeamId(teamId),
        team_id: teamId,
        position: 0,
        points: 0,
        wins: 0,
        podiums: 0,
      };
    });

    return withCalculatedPositions(rows);
  }, [participantsQuery.data, teamRankingsQuery.data]);

  const driverColumns = useMemo<EditableColumn<DriverRankingRow>[]>(
    () => [
      {
        id: "position",
        header: "Pos.",
        filterable: false,
        editable: false,
        className: "w-[88px]",
      },
      {
        id: "driver_id",
        header: "Piloto",
        filterable: false,
        editable: false,
        format: (driverId) => {
          const driver = driversById.get(driverId);
          return driver ? driverDisplayName(driver) : driverId;
        },
      },
      {
        id: "points",
        header: "Pts",
        filterable: false,
        className: "w-[88px]",
        placeholder: "0",
      },
      {
        id: "wins",
        header: "Triunfos",
        filterable: false,
        className: "w-[100px]",
        placeholder: "0",
      },
      {
        id: "podiums",
        header: "Podios",
        filterable: false,
        className: "w-[100px]",
        placeholder: "0",
      },
    ],
    [driversById],
  );

  const teamColumns = useMemo<EditableColumn<TeamRankingRow>[]>(
    () => [
      {
        id: "position",
        header: "Pos.",
        filterable: false,
        editable: false,
        className: "w-[88px]",
      },
      {
        id: "team_id",
        header: "Equipo",
        filterable: false,
        editable: false,
        format: (teamId) => teamsById.get(teamId)?.name ?? teamId,
      },
      {
        id: "points",
        header: "Pts",
        filterable: false,
        className: "w-[88px]",
        placeholder: "0",
      },
      {
        id: "wins",
        header: "Triunfos",
        filterable: false,
        className: "w-[100px]",
        placeholder: "0",
      },
      {
        id: "podiums",
        header: "Podios",
        filterable: false,
        className: "w-[100px]",
        placeholder: "0",
      },
    ],
    [teamsById],
  );

  const getDriverValues = useCallback(
    (row: DriverRankingRow) => ({
      position: String(row.position),
      driver_id: row.driver_id,
      points: String(row.points),
      wins: String(row.wins),
      podiums: String(row.podiums),
    }),
    [],
  );

  const getTeamValues = useCallback(
    (row: TeamRankingRow) => ({
      position: String(row.position),
      team_id: row.team_id,
      points: String(row.points),
      wins: String(row.wins),
      podiums: String(row.podiums),
    }),
    [],
  );

  const invalidateDrivers = () =>
    void queryClient.invalidateQueries({
      queryKey: ["admin", "f1", "driver-rankings", seasonId],
    });
  const invalidateTeams = () =>
    void queryClient.invalidateQueries({
      queryKey: ["admin", "f1", "team-rankings", seasonId],
    });

  const saveDriversMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      const changeMap = new Map(changes.map((c) => [c.id, c.values]));
      const merged = driverRows.map((row) => {
        const values = changeMap.get(row.id);
        return {
          ...row,
          points: values
            ? numFrom(values.points, row.points)
            : row.points,
          wins: values ? numFrom(values.wins, row.wins) : row.wins,
          podiums: values
            ? numFrom(values.podiums, row.podiums)
            : row.podiums,
        };
      });
      const positioned = withCalculatedPositions(merged);
      await replaceDriverRankings(
        seasonId,
        positioned.map((row) => ({
          id: isDraftId(row.id) ? undefined : row.id,
          driver_id: row.driver_id,
          position: row.position,
          points: row.points,
          wins: row.wins,
          podiums: row.podiums,
        })),
      );
    },
    onSuccess: () => {
      toast.success("Clasificación de pilotos guardada");
      invalidateDrivers();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveTeamsMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      const changeMap = new Map(changes.map((c) => [c.id, c.values]));
      const merged = teamRows.map((row) => {
        const values = changeMap.get(row.id);
        return {
          ...row,
          points: values
            ? numFrom(values.points, row.points)
            : row.points,
          wins: values ? numFrom(values.wins, row.wins) : row.wins,
          podiums: values
            ? numFrom(values.podiums, row.podiums)
            : row.podiums,
        };
      });
      const positioned = withCalculatedPositions(merged);
      await replaceTeamRankings(
        seasonId,
        positioned.map((row) => ({
          id: isDraftId(row.id) ? undefined : row.id,
          team_id: row.team_id,
          position: row.position,
          points: row.points,
          wins: row.wins,
          podiums: row.podiums,
        })),
      );
    },
    onSuccess: () => {
      toast.success("Clasificación de constructores guardada");
      invalidateTeams();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (
    driverRankingsQuery.isLoading ||
    teamRankingsQuery.isLoading ||
    participantsQuery.isLoading ||
    driversQuery.isLoading ||
    teamsQuery.isLoading
  ) {
    return <LoadingBlock label="Cargando clasificaciones…" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Clasificaciones</h2>
          <p className="text-sm text-dx-muted">
            Pilotos y constructores inscritos en esta competición
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
            Constructores
          </Button>
        </div>
      </div>

      {tab === "drivers" ? (
        <EditableDataTable
          columns={driverColumns}
          rows={driverRows}
          getValues={getDriverValues}
          showOpenAction={false}
          saving={saveDriversMutation.isPending}
          emptyLabel="No hay participantes inscritos. Agrega pilotos en la pestaña Participantes."
          onSave={(changes) => saveDriversMutation.mutateAsync(changes)}
        />
      ) : (
        <EditableDataTable
          columns={teamColumns}
          rows={teamRows}
          getValues={getTeamValues}
          showOpenAction={false}
          saving={saveTeamsMutation.isPending}
          emptyLabel="No hay constructores inscritos. Agrega participantes en la pestaña Participantes."
          onSave={(changes) => saveTeamsMutation.mutateAsync(changes)}
        />
      )}

      <Note>
        La posición se calcula automáticamente por puntos (desempate: triunfos,
        luego podios). Edita puntos, triunfos o podios y guarda para
        recalcular el orden.
      </Note>
    </div>
  );
}
