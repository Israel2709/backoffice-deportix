"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCountryOrganizations } from "@/components/futbol/equipos-scope-panels";
import { TeamsMasterPanel } from "@/components/futbol/teams-master-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { getAdminLeague } from "@/lib/api/admin-soccer";
import { equiposHref, findOrganization } from "@/lib/api/soccer-structure";

export default function FutbolEquiposLeaguePage({
  params,
}: {
  params: Promise<{ countryId: string; orgId: string; leagueId: string }>;
}) {
  const { countryId, orgId, leagueId } = use(params);
  const { country, organizations } = useCountryOrganizations(countryId);
  const leagueQuery = useQuery({
    queryKey: ["admin", "soccer", "leagues", leagueId],
    queryFn: () => getAdminLeague(leagueId),
  });

  const organization = findOrganization(organizations, orgId);
  const countryName = country?.name ?? "País";
  const orgName = organization?.name ?? "Organización";
  const leagueName = leagueQuery.data?.data.name ?? "Liga";

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
              {
                label: orgName,
                href: equiposHref(country?.id ?? countryId, orgId),
              },
              { label: leagueName },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Datos Maestros · Fútbol"
          title={leagueName}
          description="El equipo se crea una sola vez y después se asocia a temporadas desde Operación Deportiva."
        />
      </PageHeader>
      <TeamsMasterPanel
        leagueId={leagueId}
        countryId={country?.id}
        countryName={country?.name}
      />
    </>
  );
}
