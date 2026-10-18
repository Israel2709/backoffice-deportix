"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CountryCard,
  CountryCardsGrid,
} from "@/components/ui/country-card";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";
import { listNavOrganizations } from "@/lib/api/admin-soccer";
import {
  isDefaultOrganizationId,
  soccerOrgHref,
} from "@/lib/api/soccer-structure";

export function OrganizationsListPanel() {
  const orgsQuery = useQuery({
    queryKey: ["admin", "soccer", "nav-orgs"],
    queryFn: () => listNavOrganizations(),
  });

  if (orgsQuery.isLoading) {
    return <LoadingBlock compact label="Cargando organizaciones…" />;
  }

  if (orgsQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(orgsQuery.error as Error).message}
      </div>
    );
  }

  const rows = orgsQuery.data?.data ?? [];

  if (rows.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-dx-line bg-dx-card px-6 py-12 text-center">
          <p className="text-[16px] font-semibold text-dx-ink">
            No hay organizaciones deportivas
          </p>
          <p className="mt-2 text-[14px] text-dx-muted">
            Crea organizaciones en Datos maestros · Fútbol · Organizaciones.
            También verás el bucket «Sin organización deportiva» para
            competiciones huérfanas.
          </p>
        </div>
        <Note className="mt-5">
          Flujo: Organización → Liga → Temporada → Detalle.
        </Note>
      </>
    );
  }

  return (
    <>
      <CountryCardsGrid className="!grid-cols-2 sm:!grid-cols-3 md:!grid-cols-4 lg:!grid-cols-5">
        {rows.map((org) => (
          <CountryCard
            key={org.id}
            href={soccerOrgHref(org.id)}
            name={org.name}
            code={
              isDefaultOrganizationId(org.id)
                ? org.leagues.length > 0
                  ? `${org.leagues.length} sin asignar`
                  : "Huérfanas"
                : (org.country_name ?? org.country_id)
            }
            imageUrl={org.logo}
            mediaLabel={
              isDefaultOrganizationId(org.id)
                ? String(org.leagues.length || "—")
                : org.name.slice(0, 2).toUpperCase()
            }
          />
        ))}
      </CountryCardsGrid>
      <Note className="mt-5">
        «Sin organización deportiva» agrupa competiciones sin org asignada para
        que puedas asociarlas. El resto muestra el país de cada organización.
      </Note>
    </>
  );
}
