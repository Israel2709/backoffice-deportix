"use client";

import { use } from "react";
import { SeasonParticipantsPanel } from "@/components/nfl/season-participants-panel";

export default function NflSeasonParticipantesPage({
  params,
}: {
  params: Promise<{ leagueId: string; seasonId: string }>;
}) {
  const { leagueId, seasonId } = use(params);
  return (
    <SeasonParticipantsPanel seasonId={seasonId} leagueId={leagueId} />
  );
}
