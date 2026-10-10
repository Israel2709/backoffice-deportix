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
  updateF1Participant,
} from "@/lib/api/admin-f1";
import { driverDisplayName, type F1SeasonParticipant } from "@/lib/api/f1-types";
import {
  EditableDataTable,
  type EditableColumn,
} from "@/components/data/editable-data-table";
import { FilteredSelect } from "@/components/capture/filtered-select";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Note } from "@/components/ui/note";

export function SeasonParticipantsPanel({
  seasonId,
}: {
  seasonId: string;
}) {
  const queryClient = useQueryClient();
  const [pickDriverId, setPickDriverId] = useState("");
  const [pickConstructorId, setPickConstructorId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{
    ids: string[];
    label: string;
  } | null>(null);

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
        })),
    [driversQuery.data, usedDriverIds],
  );

  const constructorOptions = useMemo(
    () =>
      (constructorsQuery.data?.data ?? []).map((t) => ({
        value: t.id,
        label: t.name,
      })),
    [constructorsQuery.data],
  );

  const columns = useMemo<EditableColumn<F1SeasonParticipant>[]>(
    () => [
      {
        id: "driver",
        header: "Piloto",
        editAs: "select",
        placeholder: "Piloto…",
        format: (driverId) => {
          const driver = driversById.get(driverId);
          return driver ? driverDisplayName(driver) : driverId;
        },
        options: (row, draft) => {
          const currentDriverId = draft.driver || row.driver_id;
          return (driversQuery.data?.data ?? [])
            .filter(
              (d) => d.id === currentDriverId || !usedDriverIds.has(d.id),
            )
            .map((d) => ({
              value: d.id,
              label: driverDisplayName(d),
            }));
        },
        onCellChange: (_rowId, columnId, value, current) => {
          if (columnId !== "driver") return;
          const driver = driversById.get(value);
          return {
            ...current,
            driver: value,
            constructor_name:
              driver?.team_id ?? current.constructor_name ?? "",
          };
        },
      },
      {
        id: "constructor_name",
        header: "Constructor",
        editAs: "select",
        placeholder: "Constructor…",
        format: (teamId) => constructorsById.get(teamId)?.name ?? teamId,
        options: constructorOptions,
      },
    ],
    [
      driversById,
      constructorsById,
      driversQuery.data,
      usedDriverIds,
      constructorOptions,
    ],
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
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        setDeletingId(id);
        await deleteF1Participant(seasonId, id);
      }
    },
    onSuccess: (_data, ids) => {
      toast.success(
        ids.length === 1
          ? "Participante eliminado de la competición"
          : `${ids.length} participantes eliminados de la competición`,
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
        const driverId = change.values.driver?.trim();
        const teamId = change.values.constructor_name?.trim();
        if (!driverId || !teamId) {
          throw new Error("Cada fila necesita piloto y constructor.");
        }
        await updateF1Participant(seasonId, change.id, {
          driver_id: driverId,
          team_id: teamId,
        });
      }
    },
    onSuccess: () => {
      toast.success("Participantes actualizados");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const getValues = useCallback(
    (row: F1SeasonParticipant) => ({
      driver: row.driver_id,
      constructor_name: row.team_id,
    }),
    [],
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
          <div className="min-w-[280px] w-[280px]">
            <FilteredSelect
              value={pickDriverId}
              options={driverOptions}
              onChange={onPickDriver}
              placeholder="Piloto…"
              searchPlaceholder="Buscar piloto…"
              emptyLabel="Sin pilotos disponibles"
            />
          </div>
          <div className="min-w-[280px] w-[280px]">
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
                      ? (() => {
                          const row = rows.find(
                            (item) => item.id === selectedIds[0],
                          );
                          const driver = row
                            ? driversById.get(row.driver_id)
                            : null;
                          return driver
                            ? driverDisplayName(driver)
                            : "este participante";
                        })()
                      : `${selectedIds.length} participantes`,
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
        showOpenAction={false}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        saving={saveMutation.isPending}
        deletingId={deletingId}
        emptyLabel="No hay participantes registrados en esta competición."
        onSave={(changes) => saveMutation.mutateAsync(changes)}
        onDelete={(id) => {
          const row = rows.find((item) => item.id === id);
          const driver = row ? driversById.get(row.driver_id) : null;
          const label = driver
            ? driverDisplayName(driver)
            : "este participante";
          setPendingDelete({ ids: [id], label });
        }}
      />

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={
          pendingDelete && pendingDelete.ids.length > 1
            ? "Quitar participantes"
            : "Quitar participante"
        }
        description={
          pendingDelete
            ? pendingDelete.ids.length === 1
              ? `¿Eliminar a «${pendingDelete.label}» de esta competición? Se borrará de la base de datos y no se puede deshacer.`
              : `¿Eliminar ${pendingDelete.label} de esta competición? Se borrarán de la base de datos y no se puede deshacer.`
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
        Clic en piloto o constructor para editar. Si cambias el piloto, el
        constructor se actualiza al de datos maestros (puedes ajustarlo). Guarda
        con el botón al pie de la tabla. Si falta un piloto o constructor, créalo
        en Datos Maestros · Fórmula 1.
      </Note>
    </div>
  );
}
