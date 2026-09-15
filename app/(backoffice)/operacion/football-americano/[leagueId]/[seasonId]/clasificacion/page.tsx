"use client";

import { use } from "react";
import { SeasonStandingsPanel } from "@/components/nfl/season-standings-panel";

export default function NflSeasonClasificacionPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = use(params);
  return <SeasonStandingsPanel seasonId={seasonId} />;
}
