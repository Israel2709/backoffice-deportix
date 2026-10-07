"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CompetitionsListPanel } from "@/components/f1/competitions-list-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";
import { listAdminCountries } from "@/lib/api/admin-soccer";
import { findCountry } from "@/lib/api/soccer-structure";

export default function OperacionF1CountrySeasonPage({
  params,
}: {
  params: Promise<{ countryId: string; year: string }>;
}) {
  const { countryId, year: yearParam } = use(params);
  const decodedCountryId = decodeURIComponent(countryId);
  const year = Number(yearParam);

  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });

  const country = findCountry(
    countriesQuery.data?.data ?? [],
    decodedCountryId,
  );
  const countryName = country?.name ?? decodedCountryId;
  const yearLabel = Number.isFinite(year) ? String(year) : yearParam;

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
              { label: yearLabel },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Competiciones"
          description={`Grand Prix de ${countryName} en la temporada ${yearLabel}. Selecciona uno para operar calendario, participantes y clasificaciones.`}
          actions={
            <>
              <Link
                href={`/operacion/formula-1/pais/${encodeURIComponent(decodedCountryId)}`}
                className="inline-flex items-center gap-2 rounded-[10px] border border-[#cbd8ee] bg-white px-[15px] py-[11px] text-sm font-bold text-dx-blue hover:bg-[#f5f8ff]"
              >
                ← Temporadas
              </Link>
              <Link
                href={`/operacion/formula-1/pais/${encodeURIComponent(decodedCountryId)}/temporada/${yearLabel}/nueva`}
                className="inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
              >
                + Nueva competición
              </Link>
            </>
          }
        />
      </PageHeader>
      {Number.isFinite(year) ? (
        <CompetitionsListPanel
          countryId={decodedCountryId}
          countryName={countryName}
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
