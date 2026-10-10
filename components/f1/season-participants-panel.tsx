"use client";

import { LoadingBlock } from "@/components/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createF1Participant,
  deleteF1Participant,
  listAdminDrivers,
  listAdminF1Teams,
  listF1Participants,
} from "@/lib/api/admin-f1";
import { driverDisplayName, type F1SeasonParticipant } from "@/lib/api/f1-types";
import { EditableDataTable } from "@/components/data/editable-data-table";
import { FilteredSelect } from "@/components/capture/filtered-select";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";

const columns = [
  { id: "driver", header: "Piloto" },
  // Avoid id "constructor" — collides with Object.prototype.constructor in filters.
  { id: "constructor_name", header: "Constructor" },
];

export function SeasonParticipantsPanel({
  seasonId,
}: {
  seasonId: string;
}) {
  const queryClient = useQueryClient();
  const [pickDriverId, setPickDriverId] = useState("");
  const [pickConstructorId, setPickConstructorId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const participantsQuery = useQuery({
    queryKey: ["admin", "f1", "participants", seasonId],
    queryFn: () => listF1Participants(seasonId),
  });
  const driversQuery = useQuery({
    queryKey: ["admin", "f1", "drivers"],
    queryFn: () => listAdminDrivers(),
  });
  const constructorsQuery = useQuery({
    queryKey: ["admin", "f1", "teams"],
    queryFn: listAdminF1Teams,
  });

  const rows = participantsQuery.data?.data ?? [];

  const driversById = useMemo(
    () => new Map((driversQuery.data?.data ?? []).map((d) => [d.id, d])),
    [driversQuery.data],
  );
  const constructorsById = useMemo(
    () => new Map((constructorsQuery.data?.data ?? []).map((t) => [t.id, t])),
    [constructorsQuery.data],
  );

  const usedDriverIds = useMemo(
    () => new Set(rows.map((row) => row.driver_id)),
    [rows],
  );

  const driverOptions = useMemo(
    () =>
      (driversQuery.data?.data ?? [])
        .filter((d) => !usedDriverIds.has(d.id))
        .map((d) => ({
          value: d.id,
          label: driverDisplayName(d),
          meta: d.team_id
            ? (constructorsById.get(d.team_id)?.name ?? undefined)
            : undefined,
        })),
    [driversQuery.data, usedDriverIds, constructorsById],
  );

  const constructorOptions = useMemo(
    () =>
      (constructorsQuery.data?.data ?? []).map((t) => ({
        value: t.id,
        label: t.name,
      })),
    [constructorsQuery.data],
  );

  const invalidate = () =>
    void queryClient.invalidateQueries({
      queryKey: ["admin", "f1", "participants", seasonId],
    });

  const addMutation = useMutation({
    mutationFn: () =>
      createF1Participant(seasonId, {
        driver_id: pickDriverId,
        team_id: pickConstructorId,
      }),
    onSuccess: () => {
      toast.success("Participante agregado");
      setPickDriverId("");
      setPickConstructorId("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteF1Participant(seasonId, id),
    onMutate: (id) => setDeletingId(id),
    onSuccess: () => {
      toast.success("Participante eliminado");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setDeletingId(null),
  });

  const getValues = useCallback(
    (row: F1SeasonParticipant) => {
      const driver = driversById.get(row.driver_id);
      const constructor = constructorsById.get(row.team_id);
      return {
        driver: driver ? driverDisplayName(driver) : row.driver_id,
        constructor_name: constructor?.name ?? row.team_id,
      };
    },
    [driversById, constructorsById],
  );

  function onPickDriver(driverId: string) {
    setPickDriverId(driverId);
    if (!driverId) {
      setPickConstructorId("");
      return;
    }
    const driver = driversById.get(driverId);
    if (driver?.team_id) {
      setPickConstructorId(driver.team_id);
    }
  }

  if (
    participantsQuery.isLoading ||
    driversQuery.isLoading ||
    constructorsQuery.isLoading
  ) {
    return <LoadingBlock label="Cargando participantes…" />;
  }

  if (participantsQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(participantsQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">
            {rows.length} {rows.length === 1 ? "piloto" : "pilotos"}
          </h2>
          <p className="text-sm text-dx-muted">
            Participantes inscritos en esta competición (piloto + constructor)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[200px]">
            <FilteredSelect
              value={pickDriverId}
              options={driverOptions}
              onChange={onPickDriver}
              placeholder="Piloto…"
              searchPlaceholder="Buscar piloto…"
              emptyLabel="Sin pilotos disponibles"
            />
          </div>
          <div className="min-w-[200px]">
            <FilteredSelect
              value={pickConstructorId}
              options={constructorOptions}
              onChange={setPickConstructorId}
              placeholder="Constructor…"
              searchPlaceholder="Buscar constructor…"
              emptyLabel="Sin constructores"
            />
          </div>
          <Button
            disabled={
              !pickDriverId || !pickConstructorId || addMutation.isPending
            }
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending ? "Agregando…" : "+ Agregar"}
          </Button>
        </div>
      </div>

      <EditableDataTable
        columns={columns}
        rows={rows}
        getValues={getValues}
        showOpenAction={false}
        deletingId={deletingId}
        emptyLabel="No hay participantes registrados en esta competición."
        onDelete={(id) => {
          const row = rows.find((item) => item.id === id);
          const driver = row ? driversById.get(row.driver_id) : null;
          const label = driver
            ? driverDisplayName(driver)
            : "este participante";
          if (
            !window.confirm(
              `¿Quitar a «${label}» de esta competición?`,
            )
          ) {
            return;
          }
          deleteMutation.mutate(id);
        }}
      />

      <Note>
        Al elegir un piloto se precarga su constructor de datos maestros; puedes
        cambiarlo si corre con otro. Para cambiar el constructor de alguien ya
        inscrito, quítalo y vuelve a agregarlo. Si falta un piloto o constructor,
        créalo en Datos Maestros · Fórmula 1.
      </Note>
    </div>
  );
}
