"use client";

import { CaptureTabs } from "@/components/capture/capture-tabs";

export function F1SeasonTabs({
  competitionId,
  seasonId,
}: {
  competitionId: string;
  seasonId: string;
}) {
  const base = `/operacion/formula-1/${competitionId}/${seasonId}`;
  return (
    <CaptureTabs
      items={[
        { href: base, label: "General", exact: true },
        { href: `${base}/participantes`, label: "Participantes" },
        { href: `${base}/calendario`, label: "Calendario" },
        { href: `${base}/clasificaciones`, label: "Clasificaciones" },
      ]}
    />
  );
}
