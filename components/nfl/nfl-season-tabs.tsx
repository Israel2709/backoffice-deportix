"use client";

import { CaptureTabs } from "@/components/capture/capture-tabs";

export function NflSeasonTabs({
  leagueId,
  seasonId,
}: {
  leagueId: string;
  seasonId: string;
}) {
  const base = `/operacion/football-americano/${leagueId}/${seasonId}`;
  return (
    <CaptureTabs
      items={[
        { href: base, label: "General", exact: true },
        { href: `${base}/participantes`, label: "Participantes" },
        { href: `${base}/estructura`, label: "Estructura" },
        { href: `${base}/partidos`, label: "Partidos" },
        { href: `${base}/clasificacion`, label: "Clasificación" },
      ]}
    />
  );
}
