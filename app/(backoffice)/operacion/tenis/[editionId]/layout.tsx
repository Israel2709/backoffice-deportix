"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { getAdminEdition } from "@/lib/api/admin-tennis";
import {
  EDITION_STATUS_LABEL,
  editionLabel,
  PUBLISH_STATUS_LABEL,
} from "@/lib/api/tennis-types";
import { TennisEditionTabs } from "@/components/capture/tennis-edition-tabs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page";

export default function TennisEditionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ editionId: string }>;
}) {
  const { editionId } = use(params);
  const editionQuery = useQuery({
    queryKey: ["admin", "tennis", "edition", editionId],
    queryFn: () => getAdminEdition(editionId),
  });

  const edition = editionQuery.data?.data;

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Operación Deportiva", href: "/operacion" },
              { label: "Tenis", href: "/operacion/tenis" },
              { label: edition ? editionLabel(edition) : "Edición" },
            ]}
          />
        }
      >
        <section className="mb-5 rounded-[18px] border border-dx-line bg-dx-card px-7 py-[26px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-extrabold tracking-[0.06em] text-dx-blue uppercase">
                Tenis
              </div>
              <h1 className="mt-2 mb-2 text-[30px] font-semibold text-dx-ink">
                {edition ? editionLabel(edition) : "Edición"}
              </h1>
              <p className="text-[15px] text-dx-muted">
                Captura consolidada de la edición del torneo.
              </p>
            </div>
            {edition ? (
              <div className="flex gap-2">
                <StatusBadge
                  tone={
                    edition.status === "current"
                      ? "green"
                      : edition.status === "upcoming"
                        ? "amber"
                        : "gray"
                  }
                >
                  {EDITION_STATUS_LABEL[edition.status]}
                </StatusBadge>
                <StatusBadge tone="gray">
                  {PUBLISH_STATUS_LABEL[edition.publish_status]}
                </StatusBadge>
              </div>
            ) : null}
          </div>
        </section>
      </PageHeader>

      <TennisEditionTabs editionId={editionId} />
      {children}
    </>
  );
}
