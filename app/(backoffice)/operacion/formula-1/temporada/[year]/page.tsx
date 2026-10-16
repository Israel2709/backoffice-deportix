"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { CompetitionsListPanel } from "@/components/f1/competitions-list-panel";
import {
  F1_COMPETITION_RECENT_MAX,
  f1CompetitionRecentKey,
} from "@/components/f1/recent-keys";
import { Button } from "@/components/ui/button";
import { RecentlyVisited } from "@/components/ui/recently-visited";
import { useRecentVisits } from "@/hooks/use-recent-visits";

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

  const { items: recentCompetitions } = useRecentVisits(
    competitionRecentKey,
    F1_COMPETITION_RECENT_MAX,
  );

  const header = useMemo(
    () => (
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Competiciones</h2>
          <p className="text-sm text-dx-muted">
            Grand Prix de la temporada {yearLabel}
          </p>
        </div>
        {Number.isFinite(year) ? (
          <Link href={`${seasonHref}/nueva`}>
            <Button>+ Nueva competición</Button>
          </Link>
        ) : null}
      </div>
    ),
    [seasonHref, year, yearLabel],
  );

  if (!Number.isFinite(year)) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        Temporada inválida: {yearParam}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      {recentCompetitions.length > 0 ? (
        <RecentlyVisited items={recentCompetitions} className="flex" />
      ) : null}
      <CompetitionsListPanel year={year} />
    </div>
  );
}
