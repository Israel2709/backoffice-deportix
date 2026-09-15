"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { listAdminCompetitions } from "@/lib/api/admin-f1";
import { Note } from "@/components/ui/note";

export function CompetitionsListPanel() {
  const competitionsQuery = useQuery({
    queryKey: ["admin", "f1", "competitions"],
    queryFn: listAdminCompetitions,
  });

  return (
    <>
      {competitionsQuery.isLoading ? (
        <p className="text-sm text-dx-muted">Cargando…</p>
      ) : competitionsQuery.isError ? (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          {(competitionsQuery.error as Error).message}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {(competitionsQuery.data?.data ?? []).map((competition) => (
            <Link
              key={competition.id}
              href={`/operacion/formula-1/${competition.id}`}
              className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px] hover:border-[#becae0]"
            >
              <div>
                <div className="font-bold">{competition.name}</div>
                <div className="mt-1 text-[13px] text-dx-muted">
                  Temporadas · Calendario · Clasificaciones
                </div>
              </div>
              <span className="text-2xl text-[#8090a8]">→</span>
            </Link>
          ))}
          {(competitionsQuery.data?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-dx-muted">
              No hay competiciones. Usa{" "}
              <Link
                href="/operacion/formula-1/nueva"
                className="font-bold text-dx-blue hover:underline"
              >
                + Nueva competición
              </Link>{" "}
              para crear la primera.
            </p>
          ) : null}
        </div>
      )}

      <Note className="mt-5">
        Flujo: Competición → Temporada → Participantes → Calendario →
        Clasificaciones → Resultados por carrera.
      </Note>
    </>
  );
}
