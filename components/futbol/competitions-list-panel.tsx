"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { EditableDataTable } from "@/components/data/editable-data-table";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";
import {
  listAdminOrganizations,
  listLeaguesForOrgSeasonYear,
  updateLeague,
} from "@/lib/api/admin-soccer";
import {
  isDefaultOrganizationId,
  soccerOrgCompetitionsHref,
  soccerPartidosHref,
} from "@/lib/api/soccer-structure";
import type { SoccerLeague } from "@/lib/api/soccer-types";

export function CompetitionsListPanel({
  year,
  orgId,
}: {
  year: number;
  orgId: string;
}) {
  const queryClient = useQueryClient();
  const isUnassigned = isDefaultOrganizationId(orgId);

  const leaguesQuery = useQuery({
    queryKey: ["admin", "soccer", "nav-leagues", year, orgId],
    queryFn: () => listLeaguesForOrgSeasonYear(orgId, year),
  });
  const orgsQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations"],
    queryFn: () => listAdminOrganizations(),
    enabled: isUnassigned,
  });

  const nuevaHref = `${soccerOrgCompetitionsHref(year, orgId)}/nueva`;
  const organizations = orgsQuery.data?.data ?? [];

  const orgOptions = useMemo(
    () =>
      organizations.map((org) => ({
        value: org.id,
        label: org.country_name || org.country_id
          ? `${org.name} · ${org.country_name ?? org.country_id}`
          : org.name,
      })),
    [organizations],
  );

  const orgNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const org of organizations) {
      map.set(org.id, org.name);
    }
    return map;
  }, [organizations]);

  const columns = useMemo(() => {
    const base = [
      { id: "name", header: "Nombre", editable: !isUnassigned },
      {
        id: "name_alt",
        header: "Nombre alt.",
        placeholder: "—",
        editable: !isUnassigned,
      },
      { id: "type", header: "Tipo", className: "w-[140px]", editable: false },
      {
        id: "country",
        header: "País",
        placeholder: "—",
        editable: false,
      },
    ];
    if (!isUnassigned) return base;
    return [
      ...base,
      {
        id: "organization_id",
        header: "Asignar organización",
        editAs: "select" as const,
        placeholder: "Organización…",
        options: orgOptions,
        format: (value: string) =>
          value ? (orgNameById.get(value) ?? value) : "— Sin asignar —",
      },
    ];
  }, [isUnassigned, orgOptions, orgNameById]);

  const getValues = useCallback(
    (row: SoccerLeague) => ({
      name: row.name ?? "",
      name_alt: row.name_alt ?? "",
      type: row.type ?? "",
      country: row.country_name ?? row.country_id ?? "",
      organization_id: row.organization_id ?? "",
    }),
    [],
  );

  const saveMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      for (const change of changes) {
        const organizationId = change.values.organization_id?.trim() || null;
        if (!organizationId) {
          throw new Error("Selecciona una organización para cada fila editada.");
        }
        const org = organizations.find((item) => item.id === organizationId);
        const countryId =
          org?.country_id?.trim() || org?.country_name?.trim() || null;
        if (!countryId) {
          throw new Error(
            `La organización «${org?.name ?? organizationId}» no tiene país.`,
          );
        }
        await updateLeague(change.id, {
          organization_id: organizationId,
          country_id: countryId,
        });
      }
    },
    onSuccess: (_data, changes) => {
      toast.success(
        changes.length === 1
          ? "Organización asignada"
          : `${changes.length} competiciones actualizadas`,
      );
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "nav-leagues"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "nav-orgs"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "leagues"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (leaguesQuery.isLoading || (isUnassigned && orgsQuery.isLoading)) {
    return <LoadingBlock compact label="Cargando…" />;
  }

  if (leaguesQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(leaguesQuery.error as Error).message}
      </div>
    );
  }

  const rows = leaguesQuery.data?.data ?? [];

  if (rows.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-dx-line bg-dx-card px-6 py-12 text-center shadow-[0_4px_14px_rgba(19,53,105,0.06)]">
          <p className="text-[16px] font-semibold text-dx-ink">
            {isUnassigned
              ? `No hay competiciones sin organización en ${year}`
              : `No hay competiciones en ${year}`}
          </p>
          <p className="mt-2 text-[14px] text-dx-muted">
            {isUnassigned
              ? "Todas las competiciones de esta temporada ya tienen organización."
              : "Crea la primera competición para esta organización y temporada."}
          </p>
          {!isUnassigned ? (
            <Link
              href={nuevaHref}
              className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
            >
              + Crear competición
            </Link>
          ) : null}
        </div>
        <Note className="mt-5">
          Flujo: Temporada → Organización → Competición → Partidos.
        </Note>
      </>
    );
  }

  return (
    <>
      <EditableDataTable
        columns={columns}
        rows={rows}
        getValues={getValues}
        rowHref={(row) => soccerPartidosHref(row.id, year)}
        showOpenAction
        saving={saveMutation.isPending}
        onSave={
          isUnassigned
            ? (changes) => saveMutation.mutateAsync(changes)
            : undefined
        }
        emptyLabel="No hay competiciones."
      />
      <Note className="mt-5">
        {isUnassigned
          ? "Asigna una organización a cada competición huérfana y guarda. El país se toma de la organización."
          : "Flujo: Temporada → Organización → Competición → Partidos."}
      </Note>
    </>
  );
}
