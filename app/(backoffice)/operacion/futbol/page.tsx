"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listAdminLeagues } from "@/lib/api/admin-soccer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader } from "@/components/ui/page";

export default function OperacionFutbolPage() {
  const leaguesQuery = useQuery({
    queryKey: ["admin", "soccer", "leagues"],
    queryFn: listAdminLeagues,
  });

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Fútbol" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title="Competiciones"
          description="Selecciona una competición para operar temporadas: Participantes → Estructura → Partidos → Clasificación."
          actions={
            <Link
              href="/operacion/futbol/nueva"
              className="inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
            >
              + Nueva competición
            </Link>
          }
        />
      </PageHeader>

      {leaguesQuery.isLoading ? (
        <p className="text-sm text-dx-muted">Cargando…</p>
      ) : leaguesQuery.isError ? (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          {(leaguesQuery.error as Error).message}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {(leaguesQuery.data?.data ?? []).map((league) => (
            <Link
              key={league.id}
              href={`/operacion/futbol/${league.id}`}
              className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px] hover:border-[#becae0]"
            >
              <div>
                <div className="font-bold">{league.name}</div>
                <div className="mt-1 text-[13px] text-dx-muted">
                  {league.name_alt || league.type}
                </div>
              </div>
              <span className="text-2xl text-[#8090a8]">→</span>
            </Link>
          ))}
          {(leaguesQuery.data?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-dx-muted">
              No hay competiciones. Usa{" "}
              <Link
                href="/operacion/futbol/nueva"
                className="font-bold text-dx-blue hover:underline"
              >
                + Nueva competición
              </Link>{" "}
              para crear la primera.
            </p>
          ) : null}
        </div>
      )}

      <Note>
        Flujo aceptado: Temporada → Participantes → Estructura → Partidos →
        Resultados → Clasificación.
      </Note>
    </>
  );
}
