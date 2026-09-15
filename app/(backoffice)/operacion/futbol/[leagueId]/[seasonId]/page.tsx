"use client";

import { use } from "react";
import { SeasonGeneralPanel } from "@/components/futbol/season-general-panel";

export default function SeasonGeneralPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = use(params);
  return <SeasonGeneralPanel seasonId={seasonId} />;
}
