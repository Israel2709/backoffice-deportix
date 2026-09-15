"use client";

import { use } from "react";
import { SeasonRankingsPanel } from "@/components/f1/season-rankings-panel";

export default function F1SeasonClasificacionesPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = use(params);
  return <SeasonRankingsPanel seasonId={seasonId} />;
}
