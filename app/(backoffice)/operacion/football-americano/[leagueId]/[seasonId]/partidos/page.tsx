"use client";

import { use } from "react";
import { SeasonGamesPanel } from "@/components/nfl/season-games-panel";

export default function NflSeasonPartidosPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = use(params);
  return <SeasonGamesPanel seasonId={seasonId} />;
}
