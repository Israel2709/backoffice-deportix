"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { EditableDataTable } from "@/components/data/editable-data-table";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";
import { listLeaguesForOrgSeasonYear } from "@/lib/api/admin-soccer";
import {
  soccerOrgCompetitionsHref,
  soccerPartidosHref,
} from "@/lib/api/soccer-structure";
import type { SoccerLeague } from "@/lib/api/soccer-types";

const columns = [
  { id: "name", header: "Nombre" },
  { id: "name_alt", header: "Nombre alt.", placeholder: "—" },
  { id: "type", header: "Tipo", className: "w-[140px]" },
  { id: "country", header: "País", placeholder: "—" },
];

export function CompetitionsListPanel({
  year,
  orgId,
}: {
  year: number;
  orgId: string;
}) {
  const leaguesQuery = useQuery({
    queryKey: ["admin", "soccer", "nav-leagues", year, orgId],
    queryFn: () => listLeaguesForOrgSeasonYear(orgId, year),
  });

  const nuevaHref = `${soccerOrgCompetitionsHref(year, orgId)}/nueva`;

  const getValues = useCallback((row: SoccerLeague) => {
    return {
      name: row.name ?? "",
      name_alt: row.name_alt ?? "",
      type: row.type ?? "",
      country: row.country_name ?? row.country_id ?? "",
    };
  }, []);

  if (leaguesQuery.isLoading) {
    return <LoadingBlock compact label="Cargando…" />;
  }

  if (leaguesQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(leaguesQuery.error as Error).message}
      </div>
    );
  }

  const rows = leaguesQuery.data?.data ?? [];

  if (rows.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-dx-line bg-dx-card px-6 py-12 text-center shadow-[0_4px_14px_rgba(19,53,105,0.06)]">
          <p className="text-[16px] font-semibold text-dx-ink">
            No hay competiciones en {year}
          </p>
          <p className="mt-2 text-[14px] text-dx-muted">
            Crea la primera competición para esta organización y temporada.
          </p>
          <Link
            href={nuevaHref}
            className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
          >
            + Crear competición
          </Link>
        </div>
        <Note className="mt-5">
          Flujo: Temporada → Organización → Competición → Partidos.
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
        rowHref={(row) => soccerPartidosHref(row.id, year)}
        showOpenAction={false}
        emptyLabel="No hay competiciones."
      />
      <Note className="mt-5">
        Flujo: Temporada → Organización → Competición → Partidos.
      </Note>
    </>
  );
}
