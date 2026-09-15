"use client";

import { CaptureTabs } from "@/components/capture/capture-tabs";

export function TennisEditionTabs({ editionId }: { editionId: string }) {
  const base = `/operacion/tenis/${editionId}`;
  return (
    <CaptureTabs
      items={[
        { href: base, label: "General", exact: true },
        { href: `${base}/participantes`, label: "Participantes" },
        { href: `${base}/partidos`, label: "Partidos" },
      ]}
    />
  );
}
