"use client";

import { use } from "react";
import { SeasonStructurePanel } from "@/components/nfl/season-structure-panel";

export default function NflSeasonEstructuraPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = use(params);
  return <SeasonStructurePanel seasonId={seasonId} />;
}
