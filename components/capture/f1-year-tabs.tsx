"use client";

import { CaptureTabs } from "@/components/capture/capture-tabs";

/** Same tab shell as `F1SeasonTabs` / competition detail (`CaptureTabs`). */
export function F1YearTabs({ year }: { year: string }) {
  const base = `/operacion/formula-1/temporada/${year}`;
  return (
    <CaptureTabs
      items={[
        { href: base, label: "Competiciones", exact: true },
        {
          href: `${base}/clasificacion-pilotos`,
          label: "Pilotos",
          exact: true,
        },
        {
          href: `${base}/clasificacion-equipos`,
          label: "Equipos",
          exact: true,
        },
      ]}
    />
  );
}
