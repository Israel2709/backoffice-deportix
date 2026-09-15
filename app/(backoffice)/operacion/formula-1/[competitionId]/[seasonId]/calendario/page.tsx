"use client";

import { use } from "react";
import { SeasonCalendarPanel } from "@/components/f1/season-calendar-panel";

export default function F1SeasonCalendarioPage({
  params,
}: {
  params: Promise<{ competitionId: string; seasonId: string }>;
}) {
  const { competitionId, seasonId } = use(params);
  return (
    <SeasonCalendarPanel
      competitionId={competitionId}
      seasonId={seasonId}
    />
  );
}
