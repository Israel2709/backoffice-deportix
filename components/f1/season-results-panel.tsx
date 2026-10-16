"use client";

import { LoadingBlock } from "@/components/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
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
  type F1RaceType,
} from "@/lib/api/f1-types";
import {
  EditableDataTable,
  type EditableColumn,
} from "@/components/data/editable-data-table";
import { Note } from "@/components/ui/note";
import { formatDateDisplay } from "@/lib/format-date";

const RACE_STATUS_LABEL: Record<string, string> = {
  Scheduled: "Programada",
  Live: "En curso",
  Completed: "Finalizada",
  Cancelled: "Cancelada",
};

type HighlightField =
  | "p1_driver_id"
  | "p2_driver_id"
  | "p3_driver_id"
  | "fastest_driver_id"
  | "pole_driver_id"
  | "winning_team_id"
  | "sprint_pole"
  | "sprint_winner"
  | "sprint_winning_team";

type RaceDraft = Record<HighlightField, string> & {
  type: string;
  race_date: string;
  race_time: string;
  status: string;
};

/** Sprint Race and final Sprint Shootout use sprint highlight fields. */
function isSprintSession(type: string | null | undefined) {
  if (!type) return false;
  const normalized = type.trim().toLowerCase();
  if (normalized === "sprint") return true;
  if (!normalized.includes("sprint shootout")) return false;
  return !normalized.startsWith("1st") && !normalized.startsWith("2nd");
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

function emptyHighlights(): Record<HighlightField, string> {
  return {
    p1_driver_id: "",
    p2_driver_id: "",
    p3_driver_id: "",
    fastest_driver_id: "",
    pole_driver_id: "",
    winning_team_id: "",
    sprint_pole: "",
    sprint_winner: "",
    sprint_winning_team: "",
  };
}

function draftFromRace(
  race: F1Race,
  teamIdByDriver: Map<string, string>,
): RaceDraft {
  const highlights = race.highlights;
  const p1 = highlights?.p1_driver_id ?? "";
  const pole = highlights?.pole_driver_id ?? "";
  const winning =
    highlights?.winning_team_id ||
    (p1 ? (teamIdByDriver.get(p1) ?? "") : "");
  return {
    type: race.type ?? "",
    race_date: toDateInput(race.race_date),
    race_time: toTimeInput(race.race_date),
    status: race.status,
    p1_driver_id: p1,
    p2_driver_id: highlights?.p2_driver_id ?? "",
    p3_driver_id: highlights?.p3_driver_id ?? "",
    fastest_driver_id: highlights?.fastest_driver_id ?? "",
    pole_driver_id: pole,
    winning_team_id: winning,
    sprint_pole: pole,
    sprint_winner: p1,
    sprint_winning_team: winning,
  };
}

function applyFieldChange(
  field: HighlightField,
  value: string,
  current: RaceDraft,
  race: F1Race,
  teamIdByDriver: Map<string, string>,
): RaceDraft {
  const next = { ...current };

  if (field === "p1_driver_id") {
    const teamId = teamIdByDriver.get(value) ?? current.winning_team_id;
    next.p1_driver_id = value;
    next.winning_team_id = teamId;
    if (isSprintSession(race.type)) {
      next.sprint_winner = value;
      next.sprint_winning_team = teamId;
    }
    return next;
  }

  if (field === "pole_driver_id") {
    next.pole_driver_id = value;
    if (isSprintSession(race.type)) next.sprint_pole = value;
    return next;
  }

  if (field === "winning_team_id") {
    next.winning_team_id = value;
    if (isSprintSession(race.type)) next.sprint_winning_team = value;
    return next;
  }

  if (field === "sprint_pole") {
    next.sprint_pole = value;
    next.pole_driver_id = value;
    return next;
  }

  if (field === "sprint_winner") {
    const teamId = teamIdByDriver.get(value) ?? current.winning_team_id;
    next.sprint_winner = value;
    next.sprint_winning_team = teamId;
    next.p1_driver_id = value;
    next.winning_team_id = teamId;
    return next;
  }

  if (field === "sprint_winning_team") {
    next.sprint_winning_team = value;
    next.winning_team_id = value;
    return next;
  }

  next[field] = value;
  return next;
}

export function SeasonResultsPanel({ seasonId }: { seasonId: string }) {
  const queryClient = useQueryClient();

  const racesQuery = useQuery({
    queryKey: ["admin", "f1", "races", seasonId],
    queryFn: () => listSeasonRaces(seasonId),
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

  const races = useMemo(() => {
    const list = racesQuery.data?.data ?? [];
    return [...list].sort((a, b) =>
      String(a.race_date).localeCompare(String(b.race_date)),
    );
  }, [racesQuery.data?.data]);

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

  function formatDriver(id: string) {
    if (!id) return "—";
    const driver = driversById.get(id);
    return driver ? driverDisplayName(driver) : id;
  }

  function formatTeam(id: string) {
    if (!id) return "—";
    return teamsById.get(id)?.name ?? id;
  }

  const columns = useMemo<EditableColumn<F1Race>[]>(() => {
    const driverCol = (
      id: HighlightField,
      header: string,
      isEditable: (race: F1Race) => boolean,
    ): EditableColumn<F1Race> => ({
      id,
      header,
      filterable: false,
      editAs: "select",
      placeholder: "Piloto…",
      className: "min-w-[150px]",
      isCellEditable: isEditable,
      options: driverOptions,
      format: (value, row) =>
        isEditable(row) ? formatDriver(value) : "—",
      onCellChange: (rowId, columnId, value, current, row) =>
        applyFieldChange(
          columnId as HighlightField,
          value,
          current as RaceDraft,
          row,
          teamIdByDriver,
        ),
    });

    const teamCol = (
      id: HighlightField,
      header: string,
      isEditable: (race: F1Race) => boolean,
    ): EditableColumn<F1Race> => ({
      id,
      header,
      filterable: false,
      editAs: "select",
      placeholder: "Equipo…",
      className: "min-w-[160px]",
      isCellEditable: isEditable,
      options: teamOptions,
      format: (value, row) => (isEditable(row) ? formatTeam(value) : "—"),
      onCellChange: (_rowId, columnId, value, current, row) =>
        applyFieldChange(
          columnId as HighlightField,
          value,
          current as RaceDraft,
          row,
          teamIdByDriver,
        ),
    });

    return [
      {
        id: "type",
        header: "Sesión",
        filterable: false,
        editable: false,
        className: "min-w-[140px]",
        format: (value) =>
          F1_RACE_TYPE_LABEL[value as F1RaceType] ?? (value || "—"),
      },
      {
        id: "race_date",
        header: "Fecha",
        filterable: false,
        editable: false,
        className: "w-[120px]",
        format: (value) => formatDateDisplay(value),
      },
      {
        id: "race_time",
        header: "Hora",
        filterable: false,
        editable: false,
        className: "w-[80px]",
      },
      {
        id: "status",
        header: "Estado",
        filterable: false,
        editable: false,
        className: "w-[110px]",
        format: (value) => RACE_STATUS_LABEL[value] ?? value,
      },
      driverCol("p1_driver_id", "P1", () => true),
      driverCol("p2_driver_id", "P2", () => true),
      driverCol("p3_driver_id", "P3", () => true),
      driverCol(
        "fastest_driver_id",
        "Fastest lap",
        (race) => !isSprintSession(race.type),
      ),
      driverCol("pole_driver_id", "Race / Sprint pole", () => true),
      teamCol("winning_team_id", "Race / Sprint winning team", () => true),
    ];
    // formatDriver/formatTeam close over maps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverOptions, teamOptions, teamIdByDriver, driversById, teamsById]);

  const getValues = useCallback(
    (row: F1Race) => draftFromRace(row, teamIdByDriver),
    [teamIdByDriver],
  );

  const saveMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      for (const change of changes) {
        const values = change.values;
        if (!values.p1_driver_id?.trim()) {
          throw new Error("Cada carrera editada necesita al menos P1.");
        }
        await saveRaceHighlights(change.id, {
          p1_driver_id: values.p1_driver_id,
          p2_driver_id: values.p2_driver_id || undefined,
          p3_driver_id: values.p3_driver_id || undefined,
          pole_driver_id: values.pole_driver_id || undefined,
          fastest_driver_id: values.fastest_driver_id || undefined,
          winning_team_id: values.winning_team_id || undefined,
        });
      }
    },
    onSuccess: () => {
      toast.success("Resultados guardados");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "races", seasonId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "race-highlights"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (
    racesQuery.isLoading ||
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
          {races.length} {races.length === 1 ? "sesión" : "sesiones"}
        </h2>
        <p className="text-sm text-dx-muted">
          Captura de resultados por sesión del calendario
        </p>
      </div>

      <EditableDataTable
        columns={columns}
        rows={races}
        getValues={getValues}
        onSave={(changes) => saveMutation.mutateAsync(changes)}
        saving={saveMutation.isPending}
        emptyLabel="No hay carreras en el calendario. Créalas en la pestaña Calendario."
        filterPlaceholder="Filtrar sesiones…"
      />

      <Note>
        Filas = sesiones; columnas = resultados. P1, Race/Sprint pole y
        Race/Sprint winning team aplican a cualquier sesión (en Sprint, P1 es el
        winner). Fastest lap solo en Race/Qualifying; en Sprint queda —.
      </Note>
    </div>
  );
}
