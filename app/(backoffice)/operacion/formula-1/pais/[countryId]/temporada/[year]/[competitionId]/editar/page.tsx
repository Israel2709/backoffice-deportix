"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CreateCompetitionPanel } from "@/components/f1/create-competition-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { listAdminCountries } from "@/lib/api/admin-soccer";
import { findCountry } from "@/lib/api/soccer-structure";

export default function EditarCompeticionF1SeasonPage({
  params,
}: {
  params: Promise<{ countryId: string; year: string; competitionId: string }>;
}) {
  const { countryId, year: yearParam, competitionId } = use(params);
  const decodedCountryId = decodeURIComponent(countryId);
  const decodedCompetitionId = decodeURIComponent(competitionId);
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
  const seasonHref = `/operacion/formula-1/pais/${encodeURIComponent(decodedCountryId)}/temporada/${yearLabel}`;

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
              { label: yearLabel, href: seasonHref },
              { label: "Editar competición" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Editar competición"
          description={`Actualiza la competición de ${countryName} · ${yearLabel}.`}
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
          countryId={decodedCountryId}
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
