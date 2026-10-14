"use client";

import { use } from "react";
import { CreateCompetitionPanel } from "@/components/f1/create-competition-panel";
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
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fórmula 1", href: "/operacion/formula-1" },
          { label: yearLabel, href: seasonHref },
          { label: "Editar competición" },
        ]}
        backLabel="Competiciones"
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Editar competición"
          description={`Actualiza la competición de la temporada ${yearLabel}.`}
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
