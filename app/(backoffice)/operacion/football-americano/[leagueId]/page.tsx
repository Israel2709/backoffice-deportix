"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { getAdminLeague } from "@/lib/api/admin-nfl";
import { SeasonsListPanel } from "@/components/nfl/seasons-list-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function OperacionNflLeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = use(params);
  const leagueQuery = useQuery({
    queryKey: ["admin", "nfl", "leagues", leagueId],
    queryFn: () => getAdminLeague(leagueId),
  });

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              {
                label: "Football Americano",
                href: "/operacion/football-americano",
              },
              { label: leagueQuery.data?.data.name ?? "Competición" },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · NFL"
          title={leagueQuery.data?.data.name ?? "Competición"}
          description="Temporadas vigentes y próximas. El histórico queda bajo consulta."
        />
      </PageHeader>
      <SeasonsListPanel leagueId={leagueId} />
    </>
  );
}
