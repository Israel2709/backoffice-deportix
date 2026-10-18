"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import {
  getAdminLeague,
  getAdminOrganization,
  getAdminSeason,
} from "@/lib/api/admin-soccer";
import {
  SEASON_STATUS_LABEL,
  parseSeasonId,
  seasonLabel,
} from "@/lib/api/soccer-types";
import {
  DEFAULT_ORGANIZATION_ID,
  soccerOrgHref,
  soccerSeasonHref,
} from "@/lib/api/soccer-structure";
import {
  SOCCER_LEAGUE_RECENT_MAX,
  soccerLeagueRecentKey,
} from "@/components/futbol/recent-keys";
import { SeasonTabs } from "@/components/capture/season-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page";
import { useRecordRecentVisit } from "@/hooks/use-recent-visits";

export default function SeasonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ leagueId: string; seasonId: string }>;
}) {
  const { leagueId, seasonId } = use(params);
  const leagueQuery = useQuery({
    queryKey: ["admin", "soccer", "leagues", leagueId],
    queryFn: () => getAdminLeague(leagueId),
  });
  const seasonQuery = useQuery({
    queryKey: ["admin", "soccer", "season", seasonId],
    queryFn: () => getAdminSeason(seasonId),
  });

  const league = leagueQuery.data?.data;
  const leagueName = league?.name ?? "Liga";
  const season = seasonQuery.data?.data;

  const year = useMemo(() => {
    try {
      return parseSeasonId(decodeURIComponent(seasonId)).year;
    } catch {
      return season?.year ?? null;
    }
  }, [seasonId, season?.year]);

  const orgId = league?.organization_id?.trim() || DEFAULT_ORGANIZATION_ID;

  const orgQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations", orgId],
    queryFn: () => getAdminOrganization(orgId),
    enabled: Boolean(orgId),
  });

  const orgName =
    orgQuery.data?.data.name ??
    league?.organization_name ??
    (orgId === DEFAULT_ORGANIZATION_ID ? "Sin organización" : "Organización");

  const yearLabel = year != null ? String(year) : "Temporada";
  const leagueHref = `/operacion/futbol/${encodeURIComponent(leagueId)}`;

  const recentItem = useMemo(() => {
    if (year == null || !leagueId) return null;
    return {
      id: leagueId,
      label: leagueName,
      href: soccerSeasonHref(leagueId, year),
    };
  }, [year, leagueId, leagueName]);

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
          { label: leagueName, href: leagueHref },
          { label: yearLabel },
        ]}
        backLabel="Temporadas"
      >
        <section className="mb-5 rounded-[18px] border border-dx-line bg-dx-card px-7 py-[26px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-extrabold tracking-[0.06em] text-dx-blue uppercase">
                {leagueName}
              </div>
              <h1 className="mt-2 mb-2 text-[30px] font-semibold text-dx-ink">
                {season ? seasonLabel(season) : "Temporada"}
              </h1>
              <p className="text-[15px] text-dx-muted">
                Captura consolidada de la edición operativa.
              </p>
            </div>
            {season ? (
              <StatusBadge
                tone={
                  season.status === "current"
                    ? "green"
                    : season.status === "upcoming"
                      ? "amber"
                      : "gray"
                }
              >
                {SEASON_STATUS_LABEL[season.status ?? "upcoming"]}
              </StatusBadge>
            ) : null}
          </div>
        </section>
      </PageHeader>

      <SeasonTabs leagueId={leagueId} seasonId={seasonId} />
      {children}
    </>
  );
}
