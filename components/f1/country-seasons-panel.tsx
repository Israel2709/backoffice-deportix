"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CountryCard,
  CountryCardsGrid,
} from "@/components/ui/country-card";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";
import { listAdminSeasonYears } from "@/lib/api/admin-f1";

export function CountrySeasonsPanel({
  countryId,
}: {
  countryId: string;
  countryName: string;
}) {
  const seasonsQuery = useQuery({
    queryKey: ["admin", "f1", "season-years"],
    queryFn: listAdminSeasonYears,
  });

  const years = seasonsQuery.data?.data ?? [];

  if (seasonsQuery.isLoading) {
    return <LoadingBlock compact label="Cargando temporadas…" />;
  }

  if (seasonsQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(seasonsQuery.error as Error).message}
      </div>
    );
  }

  if (years.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-dx-line bg-dx-card px-6 py-12 text-center">
          <p className="text-[16px] font-semibold text-dx-ink">
            No hay temporadas disponibles
          </p>
          <p className="mt-2 text-[14px] text-dx-muted">
            Las temporadas aparecen cuando existen carreras en la base de datos.
          </p>
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
      <CountryCardsGrid>
        {years.map((year) => (
          <CountryCard
            key={year}
            href={`/operacion/formula-1/pais/${encodeURIComponent(countryId)}/temporada/${year}`}
            name={String(year)}
            mediaLabel={String(year)}
          />
        ))}
      </CountryCardsGrid>
      <Note className="mt-5">
        Flujo: País → Temporada → Competición → Participantes → Calendario →
        Clasificaciones.
      </Note>
    </>
  );
}
