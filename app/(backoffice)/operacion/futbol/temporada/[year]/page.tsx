"use client";

import { use, useMemo } from "react";
import { OrganizationsListPanel } from "@/components/futbol/organizations-list-panel";
import {
  SOCCER_ORG_RECENT_MAX,
  SOCCER_SEASON_RECENT_KEY,
  soccerOrgRecentKey,
} from "@/components/futbol/recent-keys";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";
import { RecentlyVisited } from "@/components/ui/recently-visited";
import {
  useRecentVisits,
  useRecordRecentVisit,
} from "@/hooks/use-recent-visits";

export default function OperacionFutbolSeasonPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = use(params);
  const year = Number(yearParam);
  const yearLabel = Number.isFinite(year) ? String(year) : yearParam;
  const orgRecentKey = soccerOrgRecentKey(yearLabel);

  const recentItem = useMemo(() => {
    if (!Number.isFinite(year)) return null;
    return {
      id: String(year),
      label: String(year),
      href: `/operacion/futbol/temporada/${year}`,
    };
  }, [year]);

  useRecordRecentVisit(SOCCER_SEASON_RECENT_KEY, recentItem);

  const { items: recentOrgs } = useRecentVisits(
    orgRecentKey,
    SOCCER_ORG_RECENT_MAX,
  );

  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fútbol", href: "/operacion/futbol" },
          { label: yearLabel },
        ]}
        backLabel="Temporadas"
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title="Organizaciones deportivas"
          description={`Organizaciones con actividad en la temporada ${yearLabel}. Selecciona una para ver sus competiciones.`}
        />
      </PageHeader>
      {recentOrgs.length > 0 ? (
        <div className="mb-4">
          <RecentlyVisited items={recentOrgs} className="flex" />
        </div>
      ) : null}
      {Number.isFinite(year) ? (
        <OrganizationsListPanel year={year} />
      ) : (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          Temporada inválida: {yearParam}
        </div>
      )}
    </>
  );
}
