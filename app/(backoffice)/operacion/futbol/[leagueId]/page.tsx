"use client";

import { use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminLeague, getAdminOrganization } from "@/lib/api/admin-soccer";
import {
  DEFAULT_ORGANIZATION_ID,
  soccerOrgHref,
} from "@/lib/api/soccer-structure";
import {
  SOCCER_LEAGUE_RECENT_MAX,
  soccerLeagueRecentKey,
} from "@/components/futbol/recent-keys";
import { SeasonsListPanel } from "@/components/futbol/seasons-list-panel";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { useRecordRecentVisit } from "@/hooks/use-recent-visits";

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

  const league = leagueQuery.data?.data;
  const leagueName = league?.name ?? "Liga";
  const orgId = league?.organization_id?.trim() || DEFAULT_ORGANIZATION_ID;

  const orgQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations", orgId],
    queryFn: () => getAdminOrganization(orgId),
    enabled: Boolean(orgId),
  });

  const orgName =
    orgQuery.data?.data.name ??
    league?.organization_name ??
    (orgId === DEFAULT_ORGANIZATION_ID
      ? "Sin organización"
      : "Organización");

  const recentItem = useMemo(() => {
    if (!leagueId) return null;
    return {
      id: leagueId,
      label: leagueName,
      href: `/operacion/futbol/${encodeURIComponent(leagueId)}`,
    };
  }, [leagueId, leagueName]);

  useRecordRecentVisit(
    soccerLeagueRecentKey(orgId),
    recentItem,
    SOCCER_LEAGUE_RECENT_MAX,
  );

  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fútbol", href: "/operacion/futbol" },
          { label: orgName, href: soccerOrgHref(orgId) },
          { label: leagueName },
        ]}
        backLabel="Ligas"
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title={leagueName}
          description="Selecciona una temporada para ver el detalle de la competición: General, Participantes, Estructura, Partidos y Clasificación."
        />
      </PageHeader>
      <SeasonsListPanel leagueId={leagueId} />
    </>
  );
}
