"use client";

import { use } from "react";
import { SeasonStructurePanel } from "@/components/futbol/season-structure-panel";

export default function SeasonEstructuraPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = use(params);
  return <SeasonStructurePanel seasonId={seasonId} />;
}
