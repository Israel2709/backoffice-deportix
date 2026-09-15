"use client";

import { use } from "react";
import { SeasonMatchesPanel } from "@/components/futbol/season-matches-panel";

export default function SeasonPartidosPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = use(params);
  return <SeasonMatchesPanel seasonId={seasonId} />;
}
