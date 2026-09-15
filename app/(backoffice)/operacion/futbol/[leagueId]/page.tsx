"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { getAdminLeague } from "@/lib/api/admin-soccer";
import { SeasonsListPanel } from "@/components/futbol/seasons-list-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function OperacionFutbolLeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = use(params);
  const leagueQuery = useQuery({
    queryKey: ["admin", "soccer", "leagues", leagueId],
    queryFn: () => getAdminLeague(leagueId),
  });

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Fútbol", href: "/operacion/futbol" },
              { label: leagueQuery.data?.data.name ?? "Competición" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title={leagueQuery.data?.data.name ?? "Competición"}
          description="Temporadas vigentes y próximas. El histórico queda bajo consulta."
        />
      </PageHeader>
      <SeasonsListPanel leagueId={leagueId} />
    </>
  );
}
