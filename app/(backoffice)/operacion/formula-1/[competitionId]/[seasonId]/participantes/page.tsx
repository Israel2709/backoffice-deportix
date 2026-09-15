"use client";

import { use } from "react";
import { SeasonParticipantsPanel } from "@/components/f1/season-participants-panel";

export default function F1SeasonParticipantesPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = use(params);
  return <SeasonParticipantsPanel seasonId={seasonId} />;
}
