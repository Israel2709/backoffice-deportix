"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { EditableDataTable } from "@/components/data/editable-data-table";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";
import {
  deleteCompetition,
  listAdminCompetitions,
} from "@/lib/api/admin-f1";
import { unlinkCompetitionFromCountry } from "@/lib/f1-competition-countries";
import { seasonIdFor, type F1Competition } from "@/lib/api/f1-types";

const columns = [
  { id: "name", header: "Nombre" },
  {
    id: "location",
    header: "País",
    filterable: false,
    sortable: false,
  },
  {
    id: "scope",
    header: "Alcance",
    filterable: false,
    sortable: false,
  },
];

export function CompetitionsListPanel({ year }: { year: number }) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const competitionsQuery = useQuery({
    queryKey: ["admin", "f1", "competitions", { season: year }],
    queryFn: () => listAdminCompetitions({ season: year }),
  });

  const rows = competitionsQuery.data?.data ?? [];
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

  const getValues = useCallback(
    (row: F1Competition) => {
      return {
        name: row.name ?? "",
        location: row.location?.trim() || "—",
        scope: `Temporada ${year} · Calendario · Clasificaciones`,
      };
    },
    [year],
  );

  if (competitionsQuery.isLoading) {
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
        rowHref={(row) =>
          `/operacion/formula-1/${row.id}/${encodeURIComponent(seasonIdFor(row.id, year))}`
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
