"use client";

import { LoadingBlock } from "@/components/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  listAdminDrivers,
  listAdminF1Teams,
  listSeasonDriverRankings,
  listSeasonTeamRankings,
  replaceSeasonDriverRankings,
  replaceSeasonTeamRankings,
} from "@/lib/api/admin-f1";
import { driverDisplayName } from "@/lib/api/f1-types";
import {
  EditableDataTable,
  type EditableColumn,
} from "@/components/data/editable-data-table";
import { Note } from "@/components/ui/note";

type DriverRankingRow = {
  id: string;
  driver_id: string;
  position: number;
  points: number;
  wins: number;
  podiums: number;
};

type TeamRankingRow = {
  id: string;
  team_id: string;
  position: number;
  points: number;
  wins: number;
  podiums: number;
};

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

export function YearRankingsPanel({
  year,
  kind,
}: {
  year: number;
  kind: "drivers" | "teams";
}) {
  const queryClient = useQueryClient();

  const driverRankingsQuery = useQuery({
    queryKey: ["admin", "f1", "season-driver-rankings", year],
    queryFn: () => listSeasonDriverRankings(year),
    enabled: kind === "drivers",
  });
  const teamRankingsQuery = useQuery({
    queryKey: ["admin", "f1", "season-team-rankings", year],
    queryFn: () => listSeasonTeamRankings(year),
    enabled: kind === "teams",
  });
  const driversQuery = useQuery({
    queryKey: ["admin", "f1", "drivers"],
    queryFn: () => listAdminDrivers(),
    enabled: kind === "drivers",
  });
  const teamsQuery = useQuery({
    queryKey: ["admin", "f1", "teams"],
    queryFn: listAdminF1Teams,
    enabled: kind === "teams",
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
    const rankings = driverRankingsQuery.data?.data ?? [];
    const rows = rankings.map((r) => ({
      id: r.id,
      driver_id: r.driver_id,
      position: r.position,
      points: r.points,
      wins: r.wins,
      podiums: r.podiums,
    }));
    return withCalculatedPositions(rows);
  }, [driverRankingsQuery.data]);

  const teamRows = useMemo<TeamRankingRow[]>(() => {
    const rankings = teamRankingsQuery.data?.data ?? [];
    const rows = rankings.map((r) => ({
      id: r.id,
      team_id: r.team_id,
      position: r.position,
      points: r.points,
      wins: r.wins,
      podiums: r.podiums,
    }));
    return withCalculatedPositions(rows);
  }, [teamRankingsQuery.data]);

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

  const saveDriversMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      const changeMap = new Map(changes.map((c) => [c.id, c.values]));
      const merged = driverRows.map((row) => {
        const values = changeMap.get(row.id);
        return {
          ...row,
          points: values ? numFrom(values.points, row.points) : row.points,
          wins: values ? numFrom(values.wins, row.wins) : row.wins,
          podiums: values ? numFrom(values.podiums, row.podiums) : row.podiums,
        };
      });
      const positioned = withCalculatedPositions(merged);
      await replaceSeasonDriverRankings(
        year,
        positioned.map((row) => ({
          id: row.id,
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
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "season-driver-rankings", year],
      });
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
          points: values ? numFrom(values.points, row.points) : row.points,
          wins: values ? numFrom(values.wins, row.wins) : row.wins,
          podiums: values ? numFrom(values.podiums, row.podiums) : row.podiums,
        };
      });
      const positioned = withCalculatedPositions(merged);
      await replaceSeasonTeamRankings(
        year,
        positioned.map((row) => ({
          id: row.id,
          team_id: row.team_id,
          position: row.position,
          points: row.points,
          wins: row.wins,
          podiums: row.podiums,
        })),
      );
    },
    onSuccess: () => {
      toast.success("Clasificación de equipos guardada");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "season-team-rankings", year],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (kind === "drivers") {
    if (
      driverRankingsQuery.isLoading ||
      driversQuery.isLoading
    ) {
      return <LoadingBlock label="Cargando clasificación de pilotos…" />;
    }

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-[21px] font-semibold">
            Clasificación de pilotos
          </h2>
          <p className="text-sm text-dx-muted">
            Campeonato de la temporada {year}
          </p>
        </div>

        <EditableDataTable
          columns={driverColumns}
          rows={driverRows}
          getValues={getDriverValues}
          showOpenAction={false}
          saving={saveDriversMutation.isPending}
          emptyLabel="No hay clasificación de pilotos. Ejecuta la ingesta de rankings F1 para esta temporada."
          onSave={(changes) => saveDriversMutation.mutateAsync(changes)}
        />

        <Note>
          Clasificación de campeonato (toda la temporada). La posición se
          recalcula por puntos (desempate: triunfos, luego podios).
        </Note>
      </div>
    );
  }

  if (teamRankingsQuery.isLoading || teamsQuery.isLoading) {
    return <LoadingBlock label="Cargando clasificación de equipos…" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[21px] font-semibold">Clasificación de equipos</h2>
        <p className="text-sm text-dx-muted">
          Campeonato de constructores · temporada {year}
        </p>
      </div>

      <EditableDataTable
        columns={teamColumns}
        rows={teamRows}
        getValues={getTeamValues}
        showOpenAction={false}
        saving={saveTeamsMutation.isPending}
        emptyLabel="No hay clasificación de equipos. Ejecuta la ingesta de rankings de equipos F1 para esta temporada."
        onSave={(changes) => saveTeamsMutation.mutateAsync(changes)}
      />

      <Note>
        Clasificación de campeonato (toda la temporada). La posición se
        recalcula por puntos (desempate: triunfos, luego podios).
      </Note>
    </div>
  );
}
