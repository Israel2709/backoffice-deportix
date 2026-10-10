"use client";

import { use } from "react";
import Link from "next/link";
import { CreateCompetitionPanel } from "@/components/f1/create-competition-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function EditarCompeticionF1SeasonPage({
  params,
}: {
  params: Promise<{ year: string; competitionId: string }>;
}) {
  const { year: yearParam, competitionId } = use(params);
  const decodedCompetitionId = decodeURIComponent(competitionId);
  const year = Number(yearParam);
  const yearLabel = Number.isFinite(year) ? String(year) : yearParam;
  const seasonHref = `/operacion/formula-1/temporada/${yearLabel}`;

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Fórmula 1", href: "/operacion/formula-1" },
              { label: yearLabel, href: seasonHref },
              { label: "Editar competición" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Editar competición"
          description={`Actualiza la competición de la temporada ${yearLabel}.`}
          actions={
            <Link
              href={seasonHref}
              className="inline-flex items-center gap-2 rounded-[10px] border border-[#cbd8ee] bg-white px-[15px] py-[11px] text-sm font-bold text-dx-blue hover:bg-[#f5f8ff]"
            >
              ← Competiciones
            </Link>
          }
        />
      </PageHeader>

      {Number.isFinite(year) ? (
        <CreateCompetitionPanel
          seasonId={String(year)}
          year={year}
          competitionId={decodedCompetitionId}
        />
      ) : (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          Temporada inválida: {yearParam}
        </div>
      )}
    </>
  );
}
