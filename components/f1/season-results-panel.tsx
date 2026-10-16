"use client";

import { LoadingBlock } from "@/components/ui/spinner";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  getRaceHighlights,
  listAdminCircuits,
  listAdminDrivers,
  listAdminF1Teams,
  listF1Participants,
  listSeasonRaces,
  saveRaceHighlights,
} from "@/lib/api/admin-f1";
import {
  driverDisplayName,
  F1_RACE_TYPE_LABEL,
  type F1Race,
  type F1RaceHighlights,
  type F1RaceType,
} from "@/lib/api/f1-types";
import {
  EditableDataTable,
  type EditableColumn,
} from "@/components/data/editable-data-table";
import { Note } from "@/components/ui/note";

const RACE_STATUS_LABEL: Record<string, string> = {
  Scheduled: "Programada",
  Live: "En curso",
  Completed: "Finalizada",
  Cancelled: "Cancelada",
};

const EMPTY_HIGHLIGHTS: Omit<F1RaceHighlights, "race_id"> = {
  p1: "—",
  p2: "—",
  p3: "—",
  fastest_lap: "—",
  race_pole: "—",
  winning_team: "—",
  sprint_pole: "—",
  sprint_winner: "—",
  sprint_winning_team: "—",
  p1_driver_id: "",
  p2_driver_id: "",
  p3_driver_id: "",
  pole_driver_id: "",
  fastest_driver_id: "",
  winning_team_id: "",
};

type ResultsListRow = F1Race & {
  p1_driver_id: string;
  p2_driver_id: string;
  p3_driver_id: string;
  fastest_driver_id: string;
  pole_driver_id: string;
  winning_team_id: string;
};

/** Sprint Race and Sprint Shootout use sprint highlight fields. */
function isSprintSession(type: string | null | undefined) {
  return type === "Sprint" || type === "Sprint Shootout";
}

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.length >= 16 ? value.slice(11, 16) : "";
  }
  return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

function formatDateDisplay(value: string) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SeasonResultsPanel({
  seasonId,
}: {
  seasonId: string;
}) {
  const queryClient = useQueryClient();

  const racesQuery = useQuery({
    queryKey: ["admin", "f1", "races", seasonId],
    queryFn: () => listSeasonRaces(seasonId),
  });
  const circuitsQuery = useQuery({
    queryKey: ["admin", "f1", "circuits"],
    queryFn: listAdminCircuits,
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

  const races = useMemo(
    () => racesQuery.data?.data ?? [],
    [racesQuery.data?.data],
  );
  const driversById = useMemo(
    () => new Map((driversQuery.data?.data ?? []).map((d) => [d.id, d])),
    [driversQuery.data],
  );
  const teamsById = useMemo(
    () => new Map((teamsQuery.data?.data ?? []).map((t) => [t.id, t])),
    [teamsQuery.data],
  );
  const teamIdByDriver = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of participantsQuery.data?.data ?? []) {
      map.set(p.driver_id, p.team_id);
    }
    return map;
  }, [participantsQuery.data]);

  const highlightQueries = useQueries({
    queries: races.map((race) => ({
      queryKey: ["admin", "f1", "race-highlights", race.id],
      queryFn: () => getRaceHighlights(race.id),
      enabled: races.length > 0,
    })),
  });

  const highlightsByRaceId = useMemo(() => {
    const map = new Map<string, F1RaceHighlights>();
    for (const query of highlightQueries) {
      if (query.data) map.set(query.data.race_id, query.data);
    }
    return map;
  }, [highlightQueries]);

  const circuitsById = useMemo(
    () => new Map((circuitsQuery.data?.data ?? []).map((c) => [c.id, c])),
    [circuitsQuery.data],
  );

  const driverOptions = useMemo(
    () =>
      (participantsQuery.data?.data ?? []).map((p) => {
        const driver = driversById.get(p.driver_id);
        return {
          value: p.driver_id,
          label: driver ? driverDisplayName(driver) : p.driver_id,
        };
      }),
    [participantsQuery.data, driversById],
  );

  const teamOptions = useMemo(() => {
    const ids = [
      ...new Set((participantsQuery.data?.data ?? []).map((p) => p.team_id)),
    ];
    return ids.map((id) => ({
      value: id,
      label: teamsById.get(id)?.name ?? id,
    }));
  }, [participantsQuery.data, teamsById]);

  const rows = useMemo<ResultsListRow[]>(
    () =>
      races.map((race) => {
        const highlights =
          highlightsByRaceId.get(race.id) ??
          ({ race_id: race.id, ...EMPTY_HIGHLIGHTS } as F1RaceHighlights);
        const p1 = highlights.p1_driver_id;
        return {
          ...race,
          p1_driver_id: p1,
          p2_driver_id: highlights.p2_driver_id,
          p3_driver_id: highlights.p3_driver_id,
          fastest_driver_id: highlights.fastest_driver_id,
          pole_driver_id: highlights.pole_driver_id,
          winning_team_id:
            highlights.winning_team_id ||
            (p1 ? teamIdByDriver.get(p1) ?? "" : ""),
        };
      }),
    [races, highlightsByRaceId, teamIdByDriver],
  );

  function formatDriver(id: string) {
    if (!id) return "—";
    const driver = driversById.get(id);
    return driver ? driverDisplayName(driver) : id;
  }

  function formatTeam(id: string) {
    if (!id) return "—";
    return teamsById.get(id)?.name ?? id;
  }

  const columns = useMemo<EditableColumn<ResultsListRow>[]>(() => {
    const base: EditableColumn<ResultsListRow>[] = [
      {
        id: "type",
        header: "Tipo",
        filterable: false,
        editable: false,
        format: (value) =>
          F1_RACE_TYPE_LABEL[value as F1RaceType] ?? (value || "—"),
      },
      {
        id: "circuit_id",
        header: "Circuito",
        filterable: false,
        editable: false,
        format: (circuitId) => circuitsById.get(circuitId)?.name ?? circuitId,
      },
      {
        id: "race_date",
        header: "Fecha",
        filterable: false,
        editable: false,
        format: (value) => formatDateDisplay(value),
      },
      {
        id: "race_time",
        header: "Hora",
        filterable: false,
        editable: false,
      },
      {
        id: "status",
        header: "Estado",
        filterable: false,
        editable: false,
        format: (value) => RACE_STATUS_LABEL[value] ?? value,
      },
      {
        id: "p1_driver_id",
        header: "P1",
        filterable: false,
        editAs: "select",
        placeholder: "Piloto…",
        options: driverOptions,
        format: (id) => formatDriver(id),
        onCellChange: (_rowId, columnId, value, current, row) => {
          if (columnId !== "p1_driver_id") return;
          const teamId = teamIdByDriver.get(value) ?? current.winning_team_id;
          return {
            ...current,
            p1_driver_id: value,
            winning_team_id: teamId,
            ...(isSprintSession(row.type)
              ? { sprint_winner: value, sprint_winning_team: teamId }
              : {}),
          };
        },
      },
      {
        id: "p2_driver_id",
        header: "P2",
        filterable: false,
        editAs: "select",
        placeholder: "Piloto…",
        options: driverOptions,
        format: (id) => formatDriver(id),
      },
      {
        id: "p3_driver_id",
        header: "P3",
        filterable: false,
        editAs: "select",
        placeholder: "Piloto…",
        options: driverOptions,
        format: (id) => formatDriver(id),
      },
      {
        id: "fastest_driver_id",
        header: "Fastest lap",
        filterable: false,
        editAs: "select",
        placeholder: "Piloto…",
        options: driverOptions,
        isCellEditable: (row) => !isSprintSession(row.type),
        format: (id, row) =>
          isSprintSession(row.type) ? "—" : formatDriver(id),
      },
      {
        id: "pole_driver_id",
        header: "Race pole",
        filterable: false,
        editAs: "select",
        placeholder: "Piloto…",
        options: driverOptions,
        isCellEditable: (row) => !isSprintSession(row.type),
        format: (id, row) =>
          isSprintSession(row.type) ? "—" : formatDriver(id),
        onCellChange: (_rowId, columnId, value, current, row) => {
          if (columnId !== "pole_driver_id") return;
          return {
            ...current,
            pole_driver_id: value,
            ...(isSprintSession(row.type) ? { sprint_pole: value } : {}),
          };
        },
      },
      {
        id: "winning_team_id",
        header: "Winning team",
        filterable: false,
        editAs: "select",
        placeholder: "Equipo…",
        options: teamOptions,
        isCellEditable: (row) => !isSprintSession(row.type),
        format: (id, row) =>
          isSprintSession(row.type) ? "—" : formatTeam(id),
        onCellChange: (_rowId, columnId, value, current, row) => {
          if (columnId !== "winning_team_id") return;
          return {
            ...current,
            winning_team_id: value,
            ...(isSprintSession(row.type) ? { sprint_winning_team: value } : {}),
          };
        },
      },
    ];

    base.push(
      {
        id: "sprint_pole",
        header: "Sprint pole",
        filterable: false,
        editAs: "select",
        placeholder: "Piloto…",
        options: driverOptions,
        isCellEditable: (row) => isSprintSession(row.type),
        format: (id, row) =>
          isSprintSession(row.type) ? formatDriver(id) : "—",
        onCellChange: (_rowId, columnId, value, current) => {
          if (columnId !== "sprint_pole") return;
          return { ...current, sprint_pole: value, pole_driver_id: value };
        },
      },
      {
        id: "sprint_winner",
        header: "Sprint winner",
        filterable: false,
        editAs: "select",
        placeholder: "Piloto…",
        options: driverOptions,
        isCellEditable: (row) => isSprintSession(row.type),
        format: (id, row) =>
          isSprintSession(row.type) ? formatDriver(id) : "—",
        onCellChange: (_rowId, columnId, value, current) => {
          if (columnId !== "sprint_winner") return;
          const teamId =
            teamIdByDriver.get(value) ?? current.winning_team_id;
          return {
            ...current,
            sprint_winner: value,
            sprint_winning_team: teamId,
            p1_driver_id: value,
            winning_team_id: teamId,
          };
        },
      },
      {
        id: "sprint_winning_team",
        header: "Sprint winning team",
        filterable: false,
        editAs: "select",
        placeholder: "Equipo…",
        options: teamOptions,
        isCellEditable: (row) => isSprintSession(row.type),
        format: (id, row) =>
          isSprintSession(row.type) ? formatTeam(id) : "—",
        onCellChange: (_rowId, columnId, value, current) => {
          if (columnId !== "sprint_winning_team") return;
          return {
            ...current,
            sprint_winning_team: value,
            winning_team_id: value,
          };
        },
      },
    );

    return base;
    // formatDriver/formatTeam close over maps; keep deps explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    circuitsById,
    driverOptions,
    teamOptions,
    teamIdByDriver,
    driversById,
    teamsById,
  ]);

  const getValues = useCallback(
    (row: ResultsListRow) => ({
      type: row.type ?? "",
      circuit_id: row.circuit_id,
      race_date: toDateInput(row.race_date),
      race_time: toTimeInput(row.race_date),
      status: row.status,
      p1_driver_id: row.p1_driver_id,
      p2_driver_id: row.p2_driver_id,
      p3_driver_id: row.p3_driver_id,
      fastest_driver_id: row.fastest_driver_id,
      pole_driver_id: row.pole_driver_id,
      winning_team_id: row.winning_team_id,
      sprint_pole: row.pole_driver_id,
      sprint_winner: row.p1_driver_id,
      sprint_winning_team: row.winning_team_id,
    }),
    [],
  );

  const saveMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      for (const change of changes) {
        if (!change.values.p1_driver_id?.trim()) {
          throw new Error("Cada carrera editada necesita al menos P1.");
        }
        await saveRaceHighlights(change.id, {
          p1_driver_id: change.values.p1_driver_id,
          p2_driver_id: change.values.p2_driver_id || undefined,
          p3_driver_id: change.values.p3_driver_id || undefined,
          pole_driver_id: change.values.pole_driver_id || undefined,
          fastest_driver_id: change.values.fastest_driver_id || undefined,
          winning_team_id: change.values.winning_team_id || undefined,
        });
      }
    },
    onSuccess: () => {
      toast.success("Resultados guardados");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "race-highlights"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (
    racesQuery.isLoading ||
    circuitsQuery.isLoading ||
    participantsQuery.isLoading ||
    driversQuery.isLoading ||
    teamsQuery.isLoading
  ) {
    return <LoadingBlock label="Cargando resultados…" />;
  }

  if (racesQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(racesQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[21px] font-semibold">
          {rows.length} {rows.length === 1 ? "carrera" : "carreras"}
        </h2>
        <p className="text-sm text-dx-muted">
          Captura de resultados por sesión del calendario
        </p>
      </div>

      <EditableDataTable
        columns={columns}
        rows={rows}
        getValues={getValues}
        showOpenAction={false}
        saving={saveMutation.isPending}
        emptyLabel="No hay carreras en el calendario. Créalas en la pestaña Calendario."
        onSave={(changes) => saveMutation.mutateAsync(changes)}
      />

      <Note>
        En Race y Qualifying edita P1–P3, fastest lap, race pole y winning
        team. En Sprint Race y Sprint Shootout edita P1–P3 más sprint pole,
        sprint winner y sprint winning team (sincronizados con pole, P1 y
        winning team).
      </Note>
    </div>
  );
}
