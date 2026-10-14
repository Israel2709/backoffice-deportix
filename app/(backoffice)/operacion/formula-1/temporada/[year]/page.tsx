"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { CompetitionsListPanel } from "@/components/f1/competitions-list-panel";
import {
  F1_COMPETITION_RECENT_MAX,
  F1_SEASON_RECENT_KEY,
  f1CompetitionRecentKey,
} from "@/components/f1/recent-keys";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";
import { RecentlyVisited } from "@/components/ui/recently-visited";
import {
  useRecentVisits,
  useRecordRecentVisit,
} from "@/hooks/use-recent-visits";

export default function OperacionF1SeasonPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = use(params);
  const year = Number(yearParam);
  const yearLabel = Number.isFinite(year) ? String(year) : yearParam;
  const seasonHref = `/operacion/formula-1/temporada/${yearLabel}`;
  const competitionRecentKey = f1CompetitionRecentKey(yearLabel);

  const recentItem = useMemo(() => {
    if (!Number.isFinite(year)) return null;
    return {
      id: String(year),
      label: String(year),
      href: `/operacion/formula-1/temporada/${year}`,
    };
  }, [year]);

  useRecordRecentVisit(F1_SEASON_RECENT_KEY, recentItem);

  const { items: recentCompetitions } = useRecentVisits(
    competitionRecentKey,
    F1_COMPETITION_RECENT_MAX,
  );

  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fórmula 1", href: "/operacion/formula-1" },
          { label: yearLabel },
        ]}
        backLabel="Temporadas"
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Competiciones"
          description={`Grand Prix de la temporada ${yearLabel}. Selecciona uno para operar calendario, participantes y clasificaciones.`}
          actions={
            Number.isFinite(year) ? (
              <Link
                href={`${seasonHref}/nueva`}
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
          <RecentlyVisited
            items={recentCompetitions}
            className="flex"
          />
        </div>
      ) : null}
      {Number.isFinite(year) ? (
        <CompetitionsListPanel year={year} />
      ) : (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          Temporada inválida: {yearParam}
        </div>
      )}
    </>
  );
}
