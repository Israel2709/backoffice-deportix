"use client";

import { use } from "react";
import { EquiposLeaguePanel, useCountryOrganizations } from "@/components/futbol/equipos-scope-panels";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { equiposHref, findOrganization } from "@/lib/api/soccer-structure";

export default function FutbolEquiposOrgPage({
  params,
}: {
  params: Promise<{ countryId: string; orgId: string }>;
}) {
  const { countryId, orgId } = use(params);
  const { country, organizations } = useCountryOrganizations(countryId);
  const organization = findOrganization(organizations, orgId);
  const countryName = country?.name ?? "País";
  const orgName = organization?.name ?? "Organización";

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Fútbol", href: "/datos-maestros/futbol" },
              { label: "Equipos", href: equiposHref() },
              {
                label: countryName,
                href: equiposHref(country?.id ?? countryId),
              },
              { label: orgName },
            ]}
          />
        }
      >
        <Hero
          eyebrow={`Fútbol · ${countryName}`}
          title="Ligas"
          description="Selecciona una liga para ver y administrar sus equipos."
        />
      </PageHeader>
      <EquiposLeaguePanel countryId={countryId} orgId={orgId} />
    </>
  );
}
