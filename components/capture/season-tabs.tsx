"use client";

import { CaptureTabs } from "@/components/capture/capture-tabs";

export function SeasonTabs({
  leagueId,
  seasonId,
}: {
  leagueId: string;
  seasonId: string;
}) {
  const base = `/operacion/futbol/${leagueId}/${seasonId}`;
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
