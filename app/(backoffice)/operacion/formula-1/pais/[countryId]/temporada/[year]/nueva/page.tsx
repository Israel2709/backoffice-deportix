"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreateCompetitionPanel } from "@/components/f1/create-competition-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { listAdminCountries } from "@/lib/api/admin-soccer";
import { findCountry } from "@/lib/api/soccer-structure";

export default function NuevaCompeticionF1SeasonPage({
  params,
}: {
  params: Promise<{ countryId: string; year: string }>;
}) {
  const { countryId, year: yearParam } = use(params);
  const decodedCountryId = decodeURIComponent(countryId);
  const year = Number(yearParam);
  const yearLabel = Number.isFinite(year) ? String(year) : yearParam;

  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });

  const country = findCountry(
    countriesQuery.data?.data ?? [],
    decodedCountryId,
  );
  const countryName = country?.name ?? decodedCountryId;

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Fórmula 1", href: "/operacion/formula-1" },
              {
                label: countryName,
                href: `/operacion/formula-1/pais/${encodeURIComponent(decodedCountryId)}`,
              },
              {
                label: yearLabel,
                href: `/operacion/formula-1/pais/${encodeURIComponent(decodedCountryId)}/temporada/${yearLabel}`,
              },
              { label: "Nueva competición" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Nueva competición"
          description={`Define la competición para ${countryName} · ${yearLabel}.`}
        />
      </PageHeader>

      {Number.isFinite(year) ? (
        <CreateCompetitionPanel
          seasonId={String(year)}
          countryId={decodedCountryId}
          year={year}
        />
      ) : (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          Temporada inválida: {yearParam}
        </div>
      )}
    </>
  );
}
