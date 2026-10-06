"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreateCompetitionPanel } from "@/components/f1/create-competition-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { listAdminCountries } from "@/lib/api/admin-soccer";
import { findCountry } from "@/lib/api/soccer-structure";

export default function NuevaCompeticionF1CountryPage({
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
              { label: "Nueva competición" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Nueva competición"
          description={`Define la competición para ${countryName}. Después podrás crear y operar sus temporadas.`}
        />
      </PageHeader>

      <CreateCompetitionPanel countryId={decodedCountryId} />
    </>
  );
}
