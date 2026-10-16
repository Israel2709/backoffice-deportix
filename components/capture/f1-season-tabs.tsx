"use client";

import { CaptureTabs } from "@/components/capture/capture-tabs";
import { normalizeSeasonIdParam } from "@/lib/api/f1-types";

export function F1SeasonTabs({
  competitionId,
  seasonId,
}: {
  competitionId: string;
  seasonId: string;
}) {
  // Raw `competitionId:year` — Next <Link> encodes once. Do not pre-encode.
  let safeSeasonId = seasonId;
  try {
    safeSeasonId = normalizeSeasonIdParam(seasonId);
  } catch {
    // Keep route param as-is; parseSeasonId surfaces the error in panels.
  }
  const base = `/operacion/formula-1/${competitionId}/${safeSeasonId}`;
  return (
    <CaptureTabs
      items={[
        { href: base, label: "General", exact: true },
        { href: `${base}/participantes`, label: "Participantes" },
        { href: `${base}/calendario`, label: "Calendario" },
        { href: `${base}/resultados`, label: "Resultados" },
      ]}
    />
  );
}
