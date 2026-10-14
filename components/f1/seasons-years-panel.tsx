"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  SeasonYearCard,
  SeasonYearsGrid,
} from "@/components/ui/season-year-card";
import { RecentlyVisited } from "@/components/ui/recently-visited";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";
import { useRecentVisits } from "@/hooks/use-recent-visits";
import { listAdminSeasonYears } from "@/lib/api/admin-f1";
import { F1_SEASON_RECENT_KEY } from "@/components/f1/recent-keys";

export function SeasonsYearsPanel() {
  const { items: recentSeasons } = useRecentVisits(F1_SEASON_RECENT_KEY);
  const seasonsQuery = useQuery({
    queryKey: ["admin", "f1", "season-years"],
    queryFn: listAdminSeasonYears,
  });

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [...(seasonsQuery.data?.data ?? [])]
      .filter((year) => Number.isFinite(year) && year <= currentYear)
      .sort((a, b) => b - a);
  }, [seasonsQuery.data?.data]);

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
          Flujo: Temporada → Competición → Participantes → Calendario →
          Clasificaciones.
        </Note>
      </>
    );
  }

  return (
    <>
      {recentSeasons.length > 0 ? (
        <div className="mb-4">
          <RecentlyVisited items={recentSeasons} />
        </div>
      ) : null}
      <SeasonYearsGrid>
        {years.map((year) => (
          <SeasonYearCard
            key={year}
            year={year}
            href={`/operacion/formula-1/temporada/${year}`}
          />
        ))}
      </SeasonYearsGrid>
      <Note className="mt-5">
        Flujo: Temporada → Competición → Participantes → Calendario →
        Clasificaciones.
      </Note>
    </>
  );
}
