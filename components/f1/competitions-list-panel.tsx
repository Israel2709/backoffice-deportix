"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { EditableDataTable } from "@/components/data/editable-data-table";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";
import {
  deleteCompetition,
  listAdminCompetitions,
  listAdminRacesBySeason,
} from "@/lib/api/admin-f1";
import { listAdminCountries } from "@/lib/api/admin-soccer";
import {
  filterCompetitionsForCountry,
  filterCompetitionsForCountrySeason,
  unlinkCompetitionFromCountry,
} from "@/lib/f1-competition-countries";
import { seasonIdFor, type F1Competition } from "@/lib/api/f1-types";
import { findCountry } from "@/lib/api/soccer-structure";

const columns = [
  { id: "name", header: "Nombre" },
  {
    id: "scope",
    header: "Alcance",
    filterable: false,
    sortable: false,
  },
];

export function CompetitionsListPanel({
  countryId,
  countryName,
  year,
}: {
  countryId?: string;
  countryName?: string;
  /** When set with countryId, only competitions with races in that season. */
  year?: number;
} = {}) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const competitionsQuery = useQuery({
    queryKey: ["admin", "f1", "competitions"],
    queryFn: listAdminCompetitions,
  });
  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
    enabled: Boolean(countryId),
  });
  const racesQuery = useQuery({
    queryKey: ["admin", "f1", "races", "season", year],
    queryFn: () => listAdminRacesBySeason(year!),
    enabled: Boolean(year),
  });

  const country = useMemo(() => {
    if (!countryId) return null;
    return (
      findCountry(countriesQuery.data?.data ?? [], countryId) ?? {
        id: countryId,
        name: countryName ?? countryId,
        code: null,
        flag: null,
      }
    );
  }, [countriesQuery.data?.data, countryId, countryName]);

  const activeCompetitionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const race of racesQuery.data?.data ?? []) {
      if (race.competition_id) ids.add(race.competition_id);
    }
    return ids;
  }, [racesQuery.data?.data]);

  const rows = useMemo(() => {
    const all = competitionsQuery.data?.data ?? [];
    if (!countryId || !country) return all;
    if (year) {
      return filterCompetitionsForCountrySeason(
        all,
        country,
        activeCompetitionIds,
      );
    }
    return filterCompetitionsForCountry(all, country);
  }, [
    activeCompetitionIds,
    competitionsQuery.data?.data,
    country,
    countryId,
    year,
  ]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCompetition(id),
    onMutate: (id) => setDeletingId(id),
    onSuccess: (_data, id) => {
      unlinkCompetitionFromCountry(id);
      toast.success("Competición eliminada");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "competitions"],
      });
      if (year) {
        void queryClient.invalidateQueries({
          queryKey: ["admin", "f1", "races", "season", year],
        });
      }
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setDeletingId(null),
  });

  const nuevaHref =
    countryId && year
      ? `/operacion/formula-1/pais/${encodeURIComponent(countryId)}/temporada/${year}/nueva`
      : countryId
        ? `/operacion/formula-1/pais/${encodeURIComponent(countryId)}/nueva`
        : "/operacion/formula-1/nueva";

  const labelCountry = countryName ?? country?.name ?? "este país";

  const getValues = useCallback((row: F1Competition) => {
    return {
      name: row.name ?? "",
      scope: year
        ? `Temporada ${year} · Calendario · Clasificaciones`
        : "Temporadas · Calendario · Clasificaciones",
    };
  }, [year]);

  const isLoading =
    competitionsQuery.isLoading ||
    (countryId && countriesQuery.isLoading) ||
    (year && racesQuery.isLoading);

  if (isLoading) {
    return <LoadingBlock compact label="Cargando…" />;
  }

  if (competitionsQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(competitionsQuery.error as Error).message}
      </div>
    );
  }

  if (racesQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(racesQuery.error as Error).message}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-dx-line bg-dx-card px-6 py-12 text-center shadow-[0_4px_14px_rgba(19,53,105,0.06)]">
          <p className="text-[16px] font-semibold text-dx-ink">
            {countryId && year
              ? `${labelCountry} no tiene competiciones en ${year}`
              : countryId
                ? `${labelCountry} no cuenta con competiciones`
                : "No hay competiciones"}
          </p>
          <p className="mt-2 text-[14px] text-dx-muted">
            {countryId && year
              ? "No hay Grand Prix de este país con carreras en esa temporada."
              : countryId
                ? "Crea la primera competición para empezar a operar en este país."
                : "Usa + Nueva competición para crear la primera."}
          </p>
          <Link
            href={nuevaHref}
            className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
          >
            + Crear competición
          </Link>
        </div>
        <Note className="mt-5">
          Flujo: País → Temporada → Competición → Participantes → Calendario →
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
          year
            ? `/operacion/formula-1/${row.id}/${encodeURIComponent(seasonIdFor(row.id, year))}`
            : `/operacion/formula-1/${row.id}`
        }
        editHref={
          countryId && year
            ? (row) =>
                `/operacion/formula-1/pais/${encodeURIComponent(countryId)}/temporada/${year}/${encodeURIComponent(row.id)}/editar`
            : undefined
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
        Flujo: País → Temporada → Competición → Participantes → Calendario →
        Clasificaciones.
      </Note>
    </>
  );
}
