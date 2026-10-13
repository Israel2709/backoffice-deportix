"use client";

import { use } from "react";
import { SeasonResultsPanel } from "@/components/f1/season-results-panel";

export default function F1SeasonResultadosPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = use(params);
  return <SeasonResultsPanel seasonId={seasonId} />;
}
