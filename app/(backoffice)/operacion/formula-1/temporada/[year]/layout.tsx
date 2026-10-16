"use client";

import { use, useMemo } from "react";
import { usePathname } from "next/navigation";
import { F1YearTabs } from "@/components/capture/f1-year-tabs";
import { F1_SEASON_RECENT_KEY } from "@/components/f1/recent-keys";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";
import { useRecordRecentVisit } from "@/hooks/use-recent-visits";

export default function F1YearLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = use(params);
  const year = Number(yearParam);
  const yearLabel = Number.isFinite(year) ? String(year) : yearParam;
  const pathname = usePathname();

  const isHub =
    Number.isFinite(year) &&
    !pathname.includes("/nueva") &&
    !pathname.includes("/editar") &&
    !pathname.includes("/pais/");

  const recentItem = useMemo(() => {
    if (!Number.isFinite(year)) return null;
    return {
      id: String(year),
      label: String(year),
      href: `/operacion/formula-1/temporada/${year}`,
    };
  }, [year]);

  useRecordRecentVisit(F1_SEASON_RECENT_KEY, recentItem);

  if (!isHub) {
    return <>{children}</>;
  }

  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fórmula 1", href: "/operacion/formula-1" },
          { label: yearLabel },
        ]}
        backLabel="Temporadas"
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title={`Temporada ${yearLabel}`}
          description="Competiciones del calendario y clasificaciones de campeonato (pilotos y equipos)."
        />
      </PageHeader>

      <F1YearTabs year={yearLabel} />
      {children}
    </>
  );
}
