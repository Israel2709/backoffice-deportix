"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { getRace } from "@/lib/api/admin-f1";
import { RaceResultsPanel } from "@/components/f1/race-results-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page";

export default function F1RaceResultsPage({
  params,
}: {
  params: Promise<{ competitionId: string; seasonId: string; raceId: string }>;
}) {
  const { competitionId, seasonId, raceId } = use(params);
  const raceQuery = useQuery({
    queryKey: ["admin", "f1", "race", raceId],
    queryFn: () => getRace(raceId),
  });

  const raceName =
    raceQuery.data?.data.name?.trim() ||
    raceQuery.data?.data.race_date?.slice(0, 10) ||
    "Carrera";

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Fórmula 1", href: "/operacion/formula-1" },
              {
                label: "Temporada",
                href: `/operacion/formula-1/${competitionId}/${seasonId}/calendario`,
              },
              { label: raceName },
            ]}
          />
        }
      >
        <div />
      </PageHeader>
      <RaceResultsPanel raceId={raceId} seasonId={seasonId} />
    </>
  );
}
