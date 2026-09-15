"use client";

import { use } from "react";
import { SeasonParticipantsPanel } from "@/components/futbol/season-participants-panel";

export default function SeasonParticipantesPage({
  params,
}: {
  params: Promise<{ leagueId: string; seasonId: string }>;
}) {
  const { leagueId, seasonId } = use(params);
  return (
    <SeasonParticipantsPanel seasonId={seasonId} leagueId={leagueId} />
  );
}
