"use client";

import { use } from "react";
import { SeasonGeneralPanel } from "@/components/nfl/season-general-panel";

export default function NflSeasonGeneralPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = use(params);
  return <SeasonGeneralPanel seasonId={seasonId} />;
}
