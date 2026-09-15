"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { getAdminCompetition, getAdminF1Season } from "@/lib/api/admin-f1";
import {
  SEASON_STATUS_LABEL,
  seasonLabel,
} from "@/lib/api/f1-types";
import { F1SeasonTabs } from "@/components/capture/f1-season-tabs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page";

export default function F1SeasonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ competitionId: string; seasonId: string }>;
}) {
  const { competitionId, seasonId } = use(params);
  const competitionQuery = useQuery({
    queryKey: ["admin", "f1", "competitions", competitionId],
    queryFn: () => getAdminCompetition(competitionId),
  });
  const seasonQuery = useQuery({
    queryKey: ["admin", "f1", "season", seasonId],
    queryFn: () => getAdminF1Season(seasonId),
  });

  const competitionName = competitionQuery.data?.data.name ?? "Competición";
  const season = seasonQuery.data?.data;

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Fórmula 1", href: "/operacion/formula-1" },
              {
                label: competitionName,
                href: `/operacion/formula-1/${competitionId}`,
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
                {competitionName}
              </div>
              <h1 className="mt-2 mb-2 text-[30px] font-semibold text-dx-ink">
                {season ? seasonLabel(season) : "Temporada"}
              </h1>
              <p className="text-[15px] text-dx-muted">
                Captura consolidada de la temporada F1.
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

      <F1SeasonTabs competitionId={competitionId} seasonId={seasonId} />
      {children}
    </>
  );
}
