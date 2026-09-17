"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { EditableDataTable } from "@/components/data/editable-data-table";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader } from "@/components/ui/page";
import { LoadingBlock } from "@/components/ui/spinner";
import { listAdminLeagues } from "@/lib/api/admin-nfl";
import type { NflLeague } from "@/lib/api/nfl-types";

const columns = [
  { id: "name", header: "Nombre" },
  { id: "name_alt", header: "Nombre alt.", placeholder: "—" },
  { id: "type", header: "Tipo", className: "w-[140px]" },
  { id: "country", header: "País", placeholder: "—" },
];

export default function OperacionNflPage() {
  const leaguesQuery = useQuery({
    queryKey: ["admin", "nfl", "leagues"],
    queryFn: listAdminLeagues,
  });

  const getValues = useCallback((row: NflLeague) => {
    return {
      name: row.name ?? "",
      name_alt: row.name_alt ?? "",
      type: row.type ?? "",
      country: row.country_name ?? row.country_id ?? "",
    };
  }, []);

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Football Americano" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · NFL"
          title="Competiciones"
          description="Selecciona una competición para operar temporadas: Participantes → Estructura → Partidos → Clasificación."
          actions={
            <Link
              href="/operacion/football-americano/nueva"
              className="inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
            >
              + Nueva competición
            </Link>
          }
        />
      </PageHeader>

      {leaguesQuery.isLoading ? (
        <LoadingBlock compact label="Cargando…" />
      ) : leaguesQuery.isError ? (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          {(leaguesQuery.error as Error).message}
        </div>
      ) : (
        <EditableDataTable
          columns={columns}
          rows={leaguesQuery.data?.data ?? []}
          getValues={getValues}
          rowHref={(row) => `/operacion/football-americano/${row.id}`}
          emptyLabel="No hay competiciones. Usa + Nueva competición para crear la primera."
        />
      )}

      <Note>
        Flujo aceptado: Temporada → Participantes → Estructura → Partidos →
        Clasificación.
      </Note>
    </>
  );
}
