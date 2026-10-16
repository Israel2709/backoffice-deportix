"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import {
  EditableDataTable,
  type EditableColumn,
} from "@/components/data/editable-data-table";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  deleteCompetition,
  listAdminCompetitions,
  listAdminRacesBySeason,
  updateF1CompetitionDocument,
} from "@/lib/api/admin-f1";
import { F1_COMPETITION_STATUS_LABEL } from "@/lib/api/f1-competition";
import { unlinkCompetitionFromCountry } from "@/lib/f1-competition-countries";
import { sortCompetitionsBySchedule } from "@/lib/f1-competition-schedule";
import {
  seasonIdFor,
  type F1Competition,
  type F1CompetitionStatus,
} from "@/lib/api/f1-types";

const STATUS_OPTIONS = (
  Object.entries(F1_COMPETITION_STATUS_LABEL) as Array<
    [F1CompetitionStatus, string]
  >
).map(([value, label]) => ({ value, label }));

const STATUS_VALUES = new Set<string>(STATUS_OPTIONS.map((o) => o.value));

function competitionStatusTone(status?: F1CompetitionStatus | null) {
  if (status === "active") return "green" as const;
  if (status === "scheduled") return "amber" as const;
  if (status === "cancelled") return "red" as const;
  return "gray" as const;
}

function competitionStatusLabel(status?: F1CompetitionStatus | null) {
  if (!status) return "—";
  return F1_COMPETITION_STATUS_LABEL[status] ?? status;
}

function asCompetitionStatus(value: string): F1CompetitionStatus | null {
  return STATUS_VALUES.has(value) ? (value as F1CompetitionStatus) : null;
}

export function CompetitionsListPanel({ year }: { year: number }) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const competitionsQuery = useQuery({
    queryKey: ["admin", "f1", "competitions", { season: year }],
    queryFn: () => listAdminCompetitions({ season: year }),
  });

  const racesQuery = useQuery({
    queryKey: ["admin", "f1", "races", { season: year }],
    queryFn: () => listAdminRacesBySeason(year),
  });

  const rows = useMemo(() => {
    const competitions = competitionsQuery.data?.data ?? [];
    const races = racesQuery.data?.data ?? [];
    if (races.length === 0) return competitions;
    return sortCompetitionsBySchedule(competitions, races);
  }, [competitionsQuery.data?.data, racesQuery.data?.data]);

  const columns = useMemo<EditableColumn<F1Competition>[]>(
    () => [
      { id: "name", header: "Nombre", editable: false },
      {
        id: "location",
        header: "País",
        filterable: false,
        sortable: false,
        editable: false,
      },
      {
        id: "status",
        header: "Estado",
        className: "w-[160px]",
        editAs: "select",
        placeholder: "Estado…",
        options: STATUS_OPTIONS,
        format: (value) => {
          const status = asCompetitionStatus(value);
          return (
            <StatusBadge tone={competitionStatusTone(status)}>
              {competitionStatusLabel(status)}
            </StatusBadge>
          );
        },
      },
      {
        id: "scope",
        header: "Alcance",
        filterable: false,
        sortable: false,
        editable: false,
      },
    ],
    [],
  );

  const nuevaHref = `/operacion/formula-1/temporada/${year}/nueva`;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCompetition(id),
    onMutate: (id) => setDeletingId(id),
    onSuccess: (_data, id) => {
      unlinkCompetitionFromCountry(id);
      toast.success("Competición eliminada");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "competitions"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setDeletingId(null),
  });

  const saveMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      for (const change of changes) {
        const status = asCompetitionStatus(change.values.status ?? "");
        if (!status) {
          throw new Error("Selecciona un estado válido para cada fila editada.");
        }
        await updateF1CompetitionDocument(change.id, { status });
      }
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "competitions"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const getValues = useCallback(
    (row: F1Competition) => {
      return {
        name: row.name ?? "",
        location: row.location?.trim() || "—",
        status: row.status ?? "scheduled",
        scope: `Temporada ${year} · Calendario · Clasificaciones`,
      };
    },
    [year],
  );

  if (competitionsQuery.isLoading || racesQuery.isLoading) {
    return <LoadingBlock compact label="Cargando…" />;
  }

  if (competitionsQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(competitionsQuery.error as Error).message}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-dx-line bg-dx-card px-6 py-12 text-center shadow-[0_4px_14px_rgba(19,53,105,0.06)]">
          <p className="text-[16px] font-semibold text-dx-ink">
            No hay competiciones en {year}
          </p>
          <p className="mt-2 text-[14px] text-dx-muted">
            Crea la primera competición para esta temporada.
          </p>
          <Link
            href={nuevaHref}
            className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
          >
            + Crear competición
          </Link>
        </div>
        <Note className="mt-5">
          Flujo: Temporada → Competición → Participantes → Calendario →
          Clasificaciones.
        </Note>
      </>
    );
  }

  return (
    <>
      <EditableDataTable
        columns={columns}
        rows={rows}
        getValues={getValues}
        onSave={(changes) => saveMutation.mutateAsync(changes)}
        saving={saveMutation.isPending}
        rowHref={(row) =>
          `/operacion/formula-1/${row.id}/${seasonIdFor(row.id, year)}`
        }
        editHref={(row) =>
          `/operacion/formula-1/temporada/${year}/${encodeURIComponent(row.id)}/editar`
        }
        showOpenAction={false}
        deletingId={deletingId}
        emptyLabel="No hay competiciones."
        onDelete={(id) => {
          const competition = rows.find((row) => row.id === id);
          const name = competition?.name ?? "esta competición";
          if (
            !window.confirm(
              `¿Eliminar «${name}» de la base de datos? Esta acción no se puede deshacer.`,
            )
          ) {
            return;
          }
          deleteMutation.mutate(id);
        }}
      />

      <Note className="mt-5">
        Flujo: Temporada → Competición → Participantes → Calendario →
        Clasificaciones.
      </Note>
    </>
  );
}
