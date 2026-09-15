"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { getAdminLeague, getAdminSeason } from "@/lib/api/admin-nfl";
import {
  SEASON_STATUS_LABEL,
  seasonLabel,
} from "@/lib/api/nfl-types";
import { NflSeasonTabs } from "@/components/nfl/nfl-season-tabs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page";

export default function NflSeasonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ leagueId: string; seasonId: string }>;
}) {
  const { leagueId, seasonId } = use(params);
  const leagueQuery = useQuery({
    queryKey: ["admin", "nfl", "leagues", leagueId],
    queryFn: () => getAdminLeague(leagueId),
  });
  const seasonQuery = useQuery({
    queryKey: ["admin", "nfl", "season", seasonId],
    queryFn: () => getAdminSeason(seasonId),
  });

  const leagueName = leagueQuery.data?.data.name ?? "Competición";
  const season = seasonQuery.data?.data;

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
              {
                label: leagueName,
                href: `/operacion/football-americano/${leagueId}`,
              },
              { label: season ? seasonLabel(season) : "Temporada" },
            ]}
          />
        }
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

      <NflSeasonTabs leagueId={leagueId} seasonId={seasonId} />
      {children}
    </>
  );
}
