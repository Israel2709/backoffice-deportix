"use client";

import { useQuery } from "@tanstack/react-query";
import { use, useMemo } from "react";
import { getAdminCompetition, getAdminF1Season } from "@/lib/api/admin-f1";
import {
  SEASON_STATUS_LABEL,
  parseSeasonId,
  seasonLabel,
} from "@/lib/api/f1-types";
import {
  F1_COMPETITION_RECENT_MAX,
  f1CompetitionRecentKey,
} from "@/components/f1/recent-keys";
import { F1SeasonTabs } from "@/components/capture/f1-season-tabs";
import { Hero } from "@/components/ui/hero";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page";
import { useRecordRecentVisit } from "@/hooks/use-recent-visits";

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
  let yearLabel = "Temporada";
  try {
    yearLabel = String(parseSeasonId(seasonId).year);
  } catch {
    yearLabel = "Temporada";
  }
  const seasonText = season ? seasonLabel(season) : yearLabel;
  const competitionsHref = `/operacion/formula-1/temporada/${encodeURIComponent(yearLabel)}`;

  const recentCompetition = useMemo(() => {
    if (!competitionQuery.data?.data?.name) return null;
    if (!Number.isFinite(Number(yearLabel))) return null;
    return {
      id: competitionId,
      label: competitionQuery.data.data.name,
      href: `/operacion/formula-1/${competitionId}/${encodeURIComponent(seasonId)}`,
    };
  }, [competitionId, competitionQuery.data?.data?.name, seasonId, yearLabel]);

  useRecordRecentVisit(
    f1CompetitionRecentKey(yearLabel),
    recentCompetition,
    F1_COMPETITION_RECENT_MAX,
  );

  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fórmula 1", href: "/operacion/formula-1" },
          { label: yearLabel, href: competitionsHref },
          { label: competitionName },
        ]}
        backLabel="Competiciones"
      >
        <Hero
          eyebrow="Fórmula 1"
          title={`${competitionName} - ${seasonText}`}
          description="Captura consolidada de la temporada F1."
          actions={
            season ? (
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
            ) : null
          }
        />
      </PageHeader>

      <F1SeasonTabs competitionId={competitionId} seasonId={seasonId} />
      {children}
    </>
  );
}
