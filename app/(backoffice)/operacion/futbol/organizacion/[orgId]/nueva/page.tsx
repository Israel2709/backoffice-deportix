"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreateCompetitionPanel } from "@/components/futbol/create-competition-panel";
import { getAdminOrganization } from "@/lib/api/admin-soccer";
import { soccerOrgHref } from "@/lib/api/soccer-structure";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function NuevaLigaFutbolOrgPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId: orgIdParam } = use(params);
  const orgId = decodeURIComponent(orgIdParam);

  const orgQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations", orgId],
    queryFn: () => getAdminOrganization(orgId),
  });

  const orgName = orgQuery.data?.data.name ?? "Organización";
  const orgHref = soccerOrgHref(orgId);

  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fútbol", href: "/operacion/futbol" },
          { label: orgName, href: orgHref },
          { label: "Nueva liga" },
        ]}
        backLabel="Ligas"
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title="Nueva liga"
          description={`Se creará bajo ${orgName}. El país se toma de la organización.`}
        />
      </PageHeader>

      <CreateCompetitionPanel orgId={orgId} />
    </>
  );
}
