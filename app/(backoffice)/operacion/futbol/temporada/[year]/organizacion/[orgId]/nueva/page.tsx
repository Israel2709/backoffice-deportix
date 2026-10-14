"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreateCompetitionPanel } from "@/components/futbol/create-competition-panel";
import { getAdminOrganization } from "@/lib/api/admin-soccer";
import { soccerOrgCompetitionsHref } from "@/lib/api/soccer-structure";
import { Hero } from "@/components/ui/hero";
import { PageHeader } from "@/components/ui/page";

export default function NuevaCompeticionFutbolOrgPage({
  params,
}: {
  params: Promise<{ year: string; orgId: string }>;
}) {
  const { year: yearParam, orgId: orgIdParam } = use(params);
  const year = Number(yearParam);
  const yearLabel = Number.isFinite(year) ? String(year) : yearParam;
  const orgId = decodeURIComponent(orgIdParam);

  const orgQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations", orgId],
    queryFn: () => getAdminOrganization(orgId),
  });

  const orgName = orgQuery.data?.data.name ?? "Organización";
  const compsHref = soccerOrgCompetitionsHref(yearLabel, orgId);

  return (
    <>
      <PageHeader
        items={[
          { label: "Operación Deportiva", href: "/operacion" },
          { label: "Fútbol", href: "/operacion/futbol" },
          {
            label: yearLabel,
            href: `/operacion/futbol/temporada/${encodeURIComponent(yearLabel)}`,
          },
          { label: orgName, href: compsHref },
          { label: "Nueva competición" },
        ]}
        backLabel="Competiciones"
      >
        <Hero
          eyebrow="Operación · Fútbol"
          title="Nueva competición"
          description={`Se creará bajo ${orgName} para la temporada ${yearLabel}. El país se toma de la organización.`}
        />
      </PageHeader>

      {Number.isFinite(year) ? (
        <CreateCompetitionPanel year={year} orgId={orgId} />
      ) : (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          Temporada inválida: {yearParam}
        </div>
      )}
    </>
  );
}
