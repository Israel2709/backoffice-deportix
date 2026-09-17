"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { EditableDataTable } from "@/components/data/editable-data-table";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";
import { listAdminCompetitions } from "@/lib/api/admin-f1";
import type { F1Competition } from "@/lib/api/f1-types";

const columns = [
  { id: "name", header: "Nombre" },
  {
    id: "scope",
    header: "Alcance",
    filterable: false,
    sortable: false,
  },
];

export function CompetitionsListPanel() {
  const competitionsQuery = useQuery({
    queryKey: ["admin", "f1", "competitions"],
    queryFn: listAdminCompetitions,
  });

  const getValues = useCallback((row: F1Competition) => {
    return {
      name: row.name ?? "",
      scope: "Temporadas · Calendario · Clasificaciones",
    };
  }, []);

  return (
    <>
      {competitionsQuery.isLoading ? (
        <LoadingBlock compact label="Cargando…" />
      ) : competitionsQuery.isError ? (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          {(competitionsQuery.error as Error).message}
        </div>
      ) : (
        <EditableDataTable
          columns={columns}
          rows={competitionsQuery.data?.data ?? []}
          getValues={getValues}
          rowHref={(row) => `/operacion/formula-1/${row.id}`}
          emptyLabel="No hay competiciones. Usa + Nueva competición para crear la primera."
        />
      )}

      {(competitionsQuery.data?.data.length ?? 0) === 0 &&
      !competitionsQuery.isLoading ? (
        <p className="mt-3 text-sm text-dx-muted">
          Crea la primera desde{" "}
          <Link
            href="/operacion/formula-1/nueva"
            className="font-bold text-dx-blue hover:underline"
          >
            + Nueva competición
          </Link>
          .
        </p>
      ) : null}

      <Note className="mt-5">
        Flujo: Competición → Temporada → Participantes → Calendario →
        Clasificaciones → Resultados por carrera.
      </Note>
    </>
  );
}
