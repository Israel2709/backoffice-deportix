"use client";

import { LoadingBlock } from "@/components/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createRace,
  deleteRace,
  getAdminF1Season,
  listAdminCircuits,
  listSeasonRaces,
  updateRace,
} from "@/lib/api/admin-f1";
import {
  F1_RACE_TYPE_LABEL,
  F1_RACE_TYPES,
  type F1Race,
  type F1RaceType,
} from "@/lib/api/f1-types";
import {
  EditableDataTable,
  type EditableColumn,
} from "@/components/data/editable-data-table";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Note } from "@/components/ui/note";

const RACE_STATUS_OPTIONS = [
  { value: "Scheduled", label: "Programada" },
  { value: "Live", label: "En curso" },
  { value: "Completed", label: "Finalizada" },
  { value: "Cancelled", label: "Cancelada" },
] as const;

const RACE_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  RACE_STATUS_OPTIONS.map((opt) => [opt.value, opt.label]),
);

type NewRaceForm = {
  circuit_id: string;
  type: F1RaceType;
  race_date: string;
  race_time: string;
  status: string;
};

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

function combineDateTime(date: string, time: string): string {
  const normalizedTime = time.trim() || "00:00";
  const parsed = new Date(`${date}T${normalizedTime}`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Fecha u hora inválida.");
  }
  return parsed.toISOString();
}

function emptyRace(): NewRaceForm {
  return {
    circuit_id: "",
    type: "Race",
    race_date: "",
    race_time: "",
    status: "Scheduled",
  };
}

function raceLabel(
  row: F1Race | undefined,
  circuitsById: Map<string, { name: string }>,
): string {
  if (!row) return "esta carrera";
  const type =
    F1_RACE_TYPE_LABEL[row.type as F1RaceType] ?? row.type ?? "Carrera";
  const circuit = circuitsById.get(row.circuit_id)?.name;
  return circuit ? `${type} · ${circuit}` : type;
}

export function SeasonCalendarPanel({
  seasonId,
  competitionId,
}: {
  seasonId: string;
  competitionId: string;
}) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newRace, setNewRace] = useState<NewRaceForm>(emptyRace);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{
    ids: string[];
    label: string;
  } | null>(null);

  const seasonQuery = useQuery({
    queryKey: ["admin", "f1", "season", seasonId],
    queryFn: () => getAdminF1Season(seasonId),
  });
  const racesQuery = useQuery({
    queryKey: ["admin", "f1", "races", seasonId],
    queryFn: () => listSeasonRaces(seasonId),
  });
  const circuitsQuery = useQuery({
    queryKey: ["admin", "f1", "circuits"],
    queryFn: listAdminCircuits,
  });

  const rows = racesQuery.data?.data ?? [];

  const circuitsById = useMemo(
    () => new Map((circuitsQuery.data?.data ?? []).map((c) => [c.id, c])),
    [circuitsQuery.data],
  );

  const circuitOptions = useMemo(
    () =>
      (circuitsQuery.data?.data ?? []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [circuitsQuery.data],
  );

  const typeOptions = useMemo(
    () =>
      F1_RACE_TYPES.map((type) => ({
        value: type,
        label: F1_RACE_TYPE_LABEL[type],
      })),
    [],
  );

  const columns = useMemo<EditableColumn<F1Race>[]>(
    () => [
      {
        id: "type",
        header: "Tipo",
        filterable: false,
        editAs: "select",
        placeholder: "Tipo…",
        format: (value) =>
          F1_RACE_TYPE_LABEL[value as F1RaceType] ?? value,
        options: (row) => {
          const current = row.type ?? "";
          if (
            current &&
            !F1_RACE_TYPES.includes(current as F1RaceType)
          ) {
            return [{ value: current, label: current }, ...typeOptions];
          }
          return typeOptions;
        },
      },
      {
        id: "circuit_id",
        header: "Circuito",
        filterable: false,
        editAs: "select",
        placeholder: "Circuito…",
        format: (circuitId) => circuitsById.get(circuitId)?.name ?? circuitId,
        options: circuitOptions,
      },
      {
        id: "race_date",
        header: "Fecha",
        filterable: false,
        editAs: "date",
        placeholder: "Fecha…",
        className: "w-[140px]",
      },
      {
        id: "race_time",
        header: "Hora",
        filterable: false,
        editAs: "time",
        placeholder: "Hora…",
        className: "w-[110px]",
      },
      {
        id: "status",
        header: "Estado",
        filterable: false,
        editAs: "select",
        placeholder: "Estado…",
        format: (value) => RACE_STATUS_LABEL[value] ?? value,
        options: [...RACE_STATUS_OPTIONS],
      },
    ],
    [circuitsById, circuitOptions, typeOptions],
  );

  const getValues = useCallback(
    (row: F1Race) => ({
      type: row.type ?? "Race",
      circuit_id: row.circuit_id,
      race_date: toDateInput(row.race_date),
      race_time: toTimeInput(row.race_date),
      status: row.status,
    }),
    [],
  );

  const invalidate = () =>
    void queryClient.invalidateQueries({
      queryKey: ["admin", "f1", "races", seasonId],
    });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!newRace.circuit_id || !newRace.race_date || !newRace.type) {
        throw new Error("Circuito, tipo y fecha son requeridos.");
      }
      if (!newRace.race_time) {
        throw new Error("La hora de inicio es requerida.");
      }
      return createRace({
        competition_id: competitionId,
        season_id: seasonId,
        circuit_id: newRace.circuit_id,
        race_date: combineDateTime(newRace.race_date, newRace.race_time),
        type: newRace.type,
        status: newRace.status,
      });
    },
    onSuccess: () => {
      toast.success("Carrera creada");
      setShowCreate(false);
      setNewRace(emptyRace());
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        setDeletingId(id);
        await deleteRace(id);
      }
    },
    onSuccess: (_data, ids) => {
      toast.success(
        ids.length === 1
          ? "Carrera eliminada"
          : `${ids.length} carreras eliminadas`,
      );
      setPendingDelete(null);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setDeletingId(null),
  });

  const saveMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      for (const change of changes) {
        const type = change.values.type?.trim();
        const circuitId = change.values.circuit_id?.trim();
        const raceDate = change.values.race_date?.trim();
        const raceTime = change.values.race_time?.trim();
        const status = change.values.status?.trim();
        if (!type || !circuitId || !raceDate || !status) {
          throw new Error(
            "Cada carrera necesita tipo, circuito, fecha y estado.",
          );
        }
        await updateRace(change.id, {
          circuit_id: circuitId,
          type,
          race_date: combineDateTime(raceDate, raceTime ?? ""),
          status,
        });
      }
    },
    onSuccess: () => {
      toast.success("Calendario actualizado");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (racesQuery.isLoading || circuitsQuery.isLoading) {
    return <LoadingBlock label="Cargando calendario…" />;
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">
            {rows.length} {rows.length === 1 ? "carrera" : "carreras"}
          </h2>
          <p className="text-sm text-dx-muted">
            Calendario de la temporada {seasonQuery.data?.data.year ?? "—"}
          </p>
        </div>
        <Button onClick={() => setShowCreate((prev) => !prev)}>
          {showCreate ? "Cerrar formulario" : "+ Nueva carrera"}
        </Button>
      </div>

      {showCreate ? (
        <div className="rounded-2xl border border-dx-line bg-dx-card p-5">
          <h3 className="text-lg font-semibold">Nueva carrera</h3>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Tipo de carrera">
              <TextSelect
                value={newRace.type}
                onChange={(e) =>
                  setNewRace({
                    ...newRace,
                    type: e.target.value as F1RaceType,
                  })
                }
              >
                {F1_RACE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {F1_RACE_TYPE_LABEL[type]}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Circuito">
              <TextSelect
                value={newRace.circuit_id}
                onChange={(e) =>
                  setNewRace({ ...newRace, circuit_id: e.target.value })
                }
              >
                <option value="">Selecciona…</option>
                {(circuitsQuery.data?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Fecha">
              <TextInput
                type="date"
                value={newRace.race_date}
                onChange={(e) =>
                  setNewRace({ ...newRace, race_date: e.target.value })
                }
              />
            </Field>
            <Field label="Hora de inicio">
              <TextInput
                type="time"
                value={newRace.race_time}
                onChange={(e) =>
                  setNewRace({ ...newRace, race_time: e.target.value })
                }
              />
            </Field>
            <Field label="Estado">
              <TextSelect
                value={newRace.status}
                onChange={(e) =>
                  setNewRace({ ...newRace, status: e.target.value })
                }
              >
                {RACE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </TextSelect>
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creando…" : "Crear carrera"}
            </Button>
          </div>
        </div>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#f1dfa9] bg-[#fff9e8] px-4 py-3">
          <p className="text-[13px] text-[#7d5a00]">
            {selectedIds.length} seleccionado
            {selectedIds.length === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={deleteMutation.isPending}
              onClick={() => setSelectedIds([])}
            >
              Limpiar selección
            </Button>
            <Button
              disabled={deleteMutation.isPending}
              className="bg-dx-red text-white hover:bg-[#c81e1e]"
              onClick={() => {
                setPendingDelete({
                  ids: selectedIds,
                  label:
                    selectedIds.length === 1
                      ? raceLabel(
                          rows.find((item) => item.id === selectedIds[0]),
                          circuitsById,
                        )
                      : `${selectedIds.length} carreras`,
                });
              }}
            >
              Eliminar seleccionados
            </Button>
          </div>
        </div>
      ) : null}

      <EditableDataTable
        columns={columns}
        rows={rows}
        getValues={getValues}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        saving={saveMutation.isPending}
        deletingId={deletingId}
        emptyLabel="No hay carreras en el calendario de esta competición."
        showOpenAction={false}
        onSave={(changes) => saveMutation.mutateAsync(changes)}
        onDelete={(id) => {
          setPendingDelete({
            ids: [id],
            label: raceLabel(
              rows.find((item) => item.id === id),
              circuitsById,
            ),
          });
        }}
      />

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={
          pendingDelete && pendingDelete.ids.length > 1
            ? "Eliminar carreras"
            : "Eliminar carrera"
        }
        description={
          pendingDelete
            ? pendingDelete.ids.length === 1
              ? `¿Eliminar «${pendingDelete.label}» del calendario? Se borrará de la base de datos y no se puede deshacer.`
              : `¿Eliminar ${pendingDelete.label} del calendario? Se borrarán de la base de datos y no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        confirmingLabel="Eliminando…"
        confirming={deleteMutation.isPending}
        onCancel={() => {
          if (!deleteMutation.isPending) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.ids);
        }}
      />

      <Note>
        Clic en tipo, circuito, fecha, hora o estado para editar. Guarda con el
        botón al pie de la tabla.
      </Note>
    </div>
  );
}
