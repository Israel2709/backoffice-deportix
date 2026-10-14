"use client";

import { use } from "react";
import { CreateCompetitionPanel } from "@/components/f1/create-competition-panel";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function NuevaCompeticionF1SeasonPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = use(params);
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
          { label: "Nueva competición" },
        ]}
        backLabel="Competiciones"
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Nueva competición"
          description={`Define la competición para la temporada ${yearLabel}.`}
        />
      </PageHeader>

      {Number.isFinite(year) ? (
        <CreateCompetitionPanel seasonId={String(year)} year={year} />
      ) : (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          Temporada inválida: {yearParam}
        </div>
      )}
    </>
  );
}
