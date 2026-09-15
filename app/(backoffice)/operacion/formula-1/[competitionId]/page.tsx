"use client";

import { use } from "react";
import { SeasonsListPanel } from "@/components/f1/seasons-list-panel";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader } from "@/components/ui/page";

export default function F1CompetitionSeasonsPage({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  const { competitionId } = use(params);

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Fórmula 1", href: "/operacion/formula-1" },
              { label: "Temporadas" },
            ]}
          />
        }
      >
        <div />
      </PageHeader>
      <SeasonsListPanel competitionId={competitionId} />
    </>
  );
}
