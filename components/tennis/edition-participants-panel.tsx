"use client";

import { LoadingBlock } from "@/components/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getAdminEdition,
  listAdminPlayers,
  listEditionParticipants,
  replaceEditionParticipants,
} from "@/lib/api/admin-tennis";
import {
  playerDisplayName,
  playerGenderForEdition,
} from "@/lib/api/tennis-types";
import { Note } from "@/components/ui/note";
import { FilteredMultiSelect } from "@/components/capture/filtered-multi-select";
import {
  EditableDataTable,
  type EditableColumn,
} from "@/components/data/editable-data-table";

type ParticipantRow = {
  id: string;
  name: string;
  country: string;
  status: string;
};

export function EditionParticipantsPanel({
  editionId,
}: {
  editionId: string;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const participantsQuery = useQuery({
    queryKey: ["admin", "tennis", "participants", editionId],
    queryFn: () => listEditionParticipants(editionId),
  });
  const editionQuery = useQuery({
    queryKey: ["admin", "tennis", "edition", editionId],
    queryFn: () => getAdminEdition(editionId),
  });
  const playersQuery = useQuery({
    queryKey: ["admin", "tennis", "players"],
    queryFn: () => listAdminPlayers(),
  });

  const playersById = useMemo(
    () => new Map((playersQuery.data?.data ?? []).map((p) => [p.id, p])),
    [playersQuery.data],
  );

  /** Keep API seeds when rewriting the roster (not edited in this UI). */
  const seedByPlayerId = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const entry of participantsQuery.data?.data ?? []) {
      map.set(entry.player_id, entry.seed ?? null);
    }
    return map;
  }, [participantsQuery.data]);

  useEffect(() => {
    const next = (participantsQuery.data?.data ?? [])
      .map((p) => {
        const player = playersById.get(p.player_id);
        return {
          id: p.player_id,
          name: player ? playerDisplayName(player) : p.player_id,
          country: player?.country_name || player?.country_code || "—",
          status: player?.status === "inactive" ? "Inactivo" : "Activo",
        } satisfies ParticipantRow;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    setRows(next);
    setPendingIds([]);
  }, [participantsQuery.data, playersById]);

  const capacity = editionQuery.data?.data.participants_count ?? null;
  const remainingSlots =
    capacity != null ? Math.max(0, capacity - rows.length) : null;
  const atCapacity = capacity != null && rows.length >= capacity;

  const genderFilter = playerGenderForEdition(
    editionQuery.data?.data.gender ?? "ATP",
  );
  const usedIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);

  const availableOptions = useMemo(() => {
    return (playersQuery.data?.data ?? [])
      .filter(
        (p) =>
          !usedIds.has(p.id) &&
          p.status === "active" &&
          p.gender === genderFilter,
      )
      .map((p) => ({
        value: p.id,
        label: playerDisplayName(p),
        meta: p.country_code ?? undefined,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [playersQuery.data, usedIds, genderFilter]);

  const columns = useMemo<EditableColumn<ParticipantRow>[]>(
    () => [
      {
        id: "name",
        header: "Jugador",
        editable: false,
        sortable: true,
        filterable: true,
      },
      {
        id: "country",
        header: "País",
        editable: false,
        sortable: true,
        filterable: false,
      },
      {
        id: "status",
        header: "Estado",
        editable: false,
        sortable: true,
        filterable: false,
      },
    ],
    [],
  );

  const getValues = useCallback(
    (row: ParticipantRow) => ({
      name: row.name,
      country: row.country,
      status: row.status,
    }),
    [],
  );

  function persist(next: ParticipantRow[]) {
    if (capacity != null && next.length > capacity) {
      throw new Error(
        `Este torneo admite como máximo ${capacity} participantes.`,
      );
    }
    return replaceEditionParticipants(
      editionId,
      next.map((r) => ({
        player_id: r.id,
        seed: seedByPlayerId.get(r.id) ?? null,
      })),
    );
  }

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: ["admin", "tennis", "participants", editionId],
    });
  }

  const deleteMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const next = rows.filter((row) => row.id !== playerId);
      await persist(next);
      return next;
    },
    onSuccess: (next) => {
      setRows(next);
      toast.success("Participante quitado");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) {
        return { next: rows, truncated: false, added: 0 };
      }
      const limit = remainingSlots == null ? ids.length : remainingSlots;
      if (limit <= 0) {
        throw new Error("Ya alcanzaste el cupo de participantes del torneo.");
      }
      const toAdd = ids.slice(0, limit);
      const additions: ParticipantRow[] = toAdd.map((playerId) => {
        const player = playersById.get(playerId);
        return {
          id: playerId,
          name: player ? playerDisplayName(player) : playerId,
          country: player?.country_name || player?.country_code || "—",
          status: player?.status === "inactive" ? "Inactivo" : "Activo",
        };
      });
      const next = [...rows, ...additions].sort((a, b) =>
        a.name.localeCompare(b.name, "es"),
      );
      await persist(next);
      return { next, truncated: toAdd.length < ids.length, added: toAdd.length };
    },
    onSuccess: (result) => {
      if (result.added === 0) return;
      setRows(result.next);
      setPendingIds([]);
      toast.success(
        result.added === 1
          ? "Participante agregado"
          : `${result.added} participantes agregados`,
      );
      if (result.truncated) {
        toast.message(
          `Solo se agregaron ${result.added} por el cupo del torneo.`,
        );
      }
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (
    participantsQuery.isLoading ||
    playersQuery.isLoading ||
    editionQuery.isLoading
  ) {
    return <LoadingBlock label="Cargando participantes…" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">
            {capacity != null
              ? `${rows.length} de ${capacity} seleccionados`
              : `${rows.length} jugadores`}
          </h2>
          <p className="text-sm text-dx-muted">
            Jugadores inscritos en el main draw
          </p>
        </div>
        <div className="flex min-w-[280px] flex-1 justify-end md:max-w-[420px]">
          <FilteredMultiSelect
            values={pendingIds}
            options={availableOptions}
            maxSelections={remainingSlots}
            selectionCount={rows.length + pendingIds.length}
            selectionTotal={capacity}
            placeholder={
              atCapacity
                ? "Cupo completo"
                : "Buscar y seleccionar jugadores…"
            }
            searchPlaceholder="Buscar jugador…"
            emptyLabel="Ningún jugador disponible coincide."
            confirmLabel="Agregar"
            disabled={
              atCapacity ||
              availableOptions.length === 0 ||
              addMutation.isPending
            }
            onChange={setPendingIds}
            onConfirm={(ids) => addMutation.mutate(ids)}
          />
        </div>
      </div>

      {capacity == null ? (
        <Note>
          Define la cantidad de participantes en General para limitar el cupo
          del cuadro.
        </Note>
      ) : atCapacity ? (
        <Note>
          Cupo completo ({capacity}). Quita un jugador si necesitas cambiar la
          lista.
        </Note>
      ) : null}

      <EditableDataTable
        columns={columns}
        rows={rows}
        getValues={getValues}
        showOpenAction={false}
        deletingId={
          deleteMutation.isPending ? deleteMutation.variables ?? null : null
        }
        emptyLabel="Aún no hay participantes. Selecciónalos arriba y pulsa Agregar."
        filterPlaceholder="Filtrar por nombre…"
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      <Note>
        Si falta un jugador, créalo en Datos Maestros · Tenis · Jugadores.
      </Note>
    </div>
  );
}
