"use client";

import { useEffect, useMemo } from "react";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getAdminLeague, listAdminSeasons } from "@/lib/api/admin-soccer";
import { soccerPartidosHref } from "@/lib/api/soccer-structure";
import { SeasonsListPanel } from "@/components/futbol/seasons-list-panel";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { LoadingBlock } from "@/components/ui/spinner";

export default function OperacionFutbolLeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = use(params);
  const router = useRouter();

  const leagueQuery = useQuery({
    queryKey: ["admin", "soccer", "leagues", leagueId],
    queryFn: () => getAdminLeague(leagueId),
  });
  const seasonsQuery = useQuery({
    queryKey: ["admin", "soccer", "seasons", leagueId],
    queryFn: () => listAdminSeasons(leagueId),
  });

  const redirectHref = useMemo(() => {
    const seasons = seasonsQuery.data?.data ?? [];
    if (seasons.length === 0) return null;
    const preferred =
      seasons.find((s) => s.status === "current") ??
      seasons.find((s) => s.status === "upcoming") ??
      [...seasons].sort((a, b) => b.year - a.year)[0];
    if (!preferred) return null;
    return soccerPartidosHref(leagueId, preferred.year);
  }, [leagueId, seasonsQuery.data?.data]);

  useEffect(() => {
    if (redirectHref) router.replace(redirectHref);
  }, [redirectHref, router]);

  const leagueName = leagueQuery.data?.data.name ?? "Competición";

  if (seasonsQuery.isLoading || leagueQuery.isLoading || redirectHref) {
    return <LoadingBlock label="Redirigiendo a la temporada…" />;
  }

  // No seasons yet — keep list/create panel so operators can add the first year.
  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fútbol", href: "/operacion/futbol" },
          { label: leagueName },
        ]}
        backLabel="Temporadas"
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title={leagueName}
          description="Esta competición aún no tiene temporadas. Crea la primera para operar partidos."
        />
      </PageHeader>
      <SeasonsListPanel leagueId={leagueId} />
    </>
  );
}
