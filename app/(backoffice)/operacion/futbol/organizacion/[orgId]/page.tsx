"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CompetitionsListPanel } from "@/components/futbol/competitions-list-panel";
import {
  SOCCER_LEAGUE_RECENT_MAX,
  SOCCER_ORG_RECENT_KEY,
  soccerLeagueRecentKey,
} from "@/components/futbol/recent-keys";
import { getAdminOrganization } from "@/lib/api/admin-soccer";
import {
  isDefaultOrganizationId,
  soccerOrgHref,
} from "@/lib/api/soccer-structure";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";
import { RecentlyVisited } from "@/components/ui/recently-visited";
import {
  useRecentVisits,
  useRecordRecentVisit,
} from "@/hooks/use-recent-visits";

export default function OperacionFutbolOrgLeaguesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId: orgIdParam } = use(params);
  const orgId = decodeURIComponent(orgIdParam);
  const orgHref = soccerOrgHref(orgId);
  const leagueRecentKey = soccerLeagueRecentKey(orgId);

  const orgQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations", orgId],
    queryFn: () => getAdminOrganization(orgId),
  });

  const isUnassigned = isDefaultOrganizationId(orgId);
  const orgName = orgQuery.data?.data.name ?? "Organización";
  const countryLabel =
    orgQuery.data?.data.country_name?.trim() ||
    orgQuery.data?.data.country_id?.trim() ||
    null;

  const recentOrgItem = useMemo(() => {
    if (!orgId) return null;
    return {
      id: orgId,
      label: orgName,
      href: orgHref,
    };
  }, [orgId, orgName, orgHref]);

  useRecordRecentVisit(SOCCER_ORG_RECENT_KEY, recentOrgItem);

  const { items: recentLeagues } = useRecentVisits(
    leagueRecentKey,
    SOCCER_LEAGUE_RECENT_MAX,
  );

  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fútbol", href: "/operacion/futbol" },
          { label: orgName },
        ]}
        backLabel="Organizaciones"
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title={isUnassigned ? "Sin organización deportiva" : "Ligas"}
          description={
            isUnassigned
              ? "Competiciones sin organización. Asígnales una para sacarlas de este bucket."
              : countryLabel
                ? `${orgName} · ${countryLabel}. Selecciona una liga para ver sus temporadas.`
                : `Ligas de ${orgName}. Selecciona una para ver sus temporadas.`
          }
          actions={
            !isUnassigned ? (
              <Link
                href={`${orgHref}/nueva`}
                className="inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
              >
                + Nueva liga
              </Link>
            ) : null
          }
        />
      </PageHeader>
      {recentLeagues.length > 0 ? (
        <div className="mb-4">
          <RecentlyVisited items={recentLeagues} className="flex" />
        </div>
      ) : null}
      <CompetitionsListPanel orgId={orgId} />
    </>
  );
}
