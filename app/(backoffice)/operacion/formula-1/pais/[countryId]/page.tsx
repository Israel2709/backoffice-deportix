"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CompetitionsListPanel } from "@/components/f1/competitions-list-panel";
import { F1_COUNTRY_RECENT_KEY } from "@/components/f1/recent-keys";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";
import { useRecordRecentVisit } from "@/hooks/use-recent-visits";
import { listAdminCountries } from "@/lib/api/admin-soccer";
import { findCountry } from "@/lib/api/soccer-structure";

export default function OperacionF1CountryPage({
  params,
}: {
  params: Promise<{ countryId: string }>;
}) {
  const { countryId } = use(params);
  const decodedCountryId = decodeURIComponent(countryId);

  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });

  const country = findCountry(
    countriesQuery.data?.data ?? [],
    decodedCountryId,
  );
  const countryName = country?.name ?? decodedCountryId;

  const recentItem = useMemo(() => {
    if (!country) return null;
    return {
      id: country.id,
      label: country.name,
      href: `/operacion/formula-1/pais/${encodeURIComponent(country.id)}`,
    };
  }, [country]);

  useRecordRecentVisit(F1_COUNTRY_RECENT_KEY, recentItem);

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Fórmula 1", href: "/operacion/formula-1" },
              { label: countryName },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Competiciones"
          description={`Selecciona una competición de ${countryName} para operar temporadas: Participantes → Calendario → Clasificaciones.`}
          actions={
            <>
              <Link
                href="/operacion/formula-1"
                className="inline-flex items-center gap-2 rounded-[10px] border border-[#cbd8ee] bg-white px-[15px] py-[11px] text-sm font-bold text-dx-blue hover:bg-[#f5f8ff]"
              >
                ← Países
              </Link>
              <Link
                href={`/operacion/formula-1/pais/${encodeURIComponent(decodedCountryId)}/nueva`}
                className="inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
              >
                + Nueva competición
              </Link>
            </>
          }
        />
      </PageHeader>
      <CompetitionsListPanel
        countryId={decodedCountryId}
        countryName={countryName}
      />
    </>
  );
}
