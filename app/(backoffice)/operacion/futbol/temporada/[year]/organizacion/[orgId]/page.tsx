"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CompetitionsListPanel } from "@/components/futbol/competitions-list-panel";
import {
  SOCCER_COMPETITION_RECENT_MAX,
  soccerCompetitionRecentKey,
  soccerOrgRecentKey,
} from "@/components/futbol/recent-keys";
import { getAdminOrganization } from "@/lib/api/admin-soccer";
import { soccerOrgCompetitionsHref } from "@/lib/api/soccer-structure";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";
import { RecentlyVisited } from "@/components/ui/recently-visited";
import {
  useRecentVisits,
  useRecordRecentVisit,
} from "@/hooks/use-recent-visits";

export default function OperacionFutbolOrgCompetitionsPage({
  params,
}: {
  params: Promise<{ year: string; orgId: string }>;
}) {
  const { year: yearParam, orgId: orgIdParam } = use(params);
  const year = Number(yearParam);
  const yearLabel = Number.isFinite(year) ? String(year) : yearParam;
  const orgId = decodeURIComponent(orgIdParam);
  const compsHref = soccerOrgCompetitionsHref(yearLabel, orgId);
  const competitionRecentKey = soccerCompetitionRecentKey(yearLabel, orgId);

  const orgQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations", orgId],
    queryFn: () => getAdminOrganization(orgId),
  });

  const orgName = orgQuery.data?.data.name ?? "Organización";
  const countryLabel =
    orgQuery.data?.data.country_name?.trim() ||
    orgQuery.data?.data.country_id?.trim() ||
    null;

  const recentOrgItem = useMemo(() => {
    if (!Number.isFinite(year) || !orgId) return null;
    return {
      id: orgId,
      label: orgName,
      href: compsHref,
    };
  }, [year, orgId, orgName, compsHref]);

  useRecordRecentVisit(soccerOrgRecentKey(yearLabel), recentOrgItem);

  const { items: recentCompetitions } = useRecentVisits(
    competitionRecentKey,
    SOCCER_COMPETITION_RECENT_MAX,
  );

  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fútbol", href: "/operacion/futbol" },
          {
            label: yearLabel,
            href: `/operacion/futbol/temporada/${encodeURIComponent(yearLabel)}`,
          },
          { label: orgName },
        ]}
        backLabel="Organizaciones"
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title="Competiciones"
          description={
            countryLabel
              ? `${orgName} · ${countryLabel} · temporada ${yearLabel}`
              : `Competiciones de ${orgName} en la temporada ${yearLabel}.`
          }
          actions={
            Number.isFinite(year) ? (
              <Link
                href={`${compsHref}/nueva`}
                className="inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
              >
                + Nueva competición
              </Link>
            ) : null
          }
        />
      </PageHeader>
      {recentCompetitions.length > 0 ? (
        <div className="mb-4">
          <RecentlyVisited items={recentCompetitions} className="flex" />
        </div>
      ) : null}
      {Number.isFinite(year) ? (
        <CompetitionsListPanel year={year} orgId={orgId} />
      ) : (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          Temporada inválida: {yearParam}
        </div>
      )}
    </>
  );
}
