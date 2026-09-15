"use client";

import { use } from "react";
import { SeasonStandingsPanel } from "@/components/futbol/season-standings-panel";

export default function SeasonClasificacionPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = use(params);
  return <SeasonStandingsPanel seasonId={seasonId} />;
}
