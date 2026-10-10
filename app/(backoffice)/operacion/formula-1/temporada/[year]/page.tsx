"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { CompetitionsListPanel } from "@/components/f1/competitions-list-panel";
import { F1_SEASON_RECENT_KEY } from "@/components/f1/recent-keys";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page";
import { Hero } from "@/components/ui/hero";
import { useRecordRecentVisit } from "@/hooks/use-recent-visits";

export default function OperacionF1SeasonPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = use(params);
  const year = Number(yearParam);
  const yearLabel = Number.isFinite(year) ? String(year) : yearParam;
  const seasonHref = `/operacion/formula-1/temporada/${yearLabel}`;

  const recentItem = useMemo(() => {
    if (!Number.isFinite(year)) return null;
    return {
      id: String(year),
      label: String(year),
      href: `/operacion/formula-1/temporada/${year}`,
    };
  }, [year]);

  useRecordRecentVisit(F1_SEASON_RECENT_KEY, recentItem);

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Fórmula 1", href: "/operacion/formula-1" },
              { label: yearLabel },
            ]}
          />
        }
      >
        <Hero
          eyebrow="Operación · Fórmula 1"
          title="Competiciones"
          description={`Grand Prix de la temporada ${yearLabel}. Selecciona uno para operar calendario, participantes y clasificaciones.`}
          actions={
            <>
              <Link
                href="/operacion/formula-1"
                className="inline-flex items-center gap-2 rounded-[10px] border border-[#cbd8ee] bg-white px-[15px] py-[11px] text-sm font-bold text-dx-blue hover:bg-[#f5f8ff]"
              >
                ← Temporadas
              </Link>
              {Number.isFinite(year) ? (
                <Link
                  href={`${seasonHref}/nueva`}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
                >
                  + Nueva competición
                </Link>
              ) : null}
            </>
          }
        />
      </PageHeader>
      {Number.isFinite(year) ? (
        <CompetitionsListPanel year={year} />
      ) : (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          Temporada inválida: {yearParam}
        </div>
      )}
    </>
  );
}
