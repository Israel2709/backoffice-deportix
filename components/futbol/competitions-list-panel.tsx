"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { EditableDataTable } from "@/components/data/editable-data-table";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";
import {
  deleteLeague,
  listAdminOrganizations,
  listLeaguesForOrganization,
  updateLeague,
} from "@/lib/api/admin-soccer";
import {
  isDefaultOrganizationId,
  soccerOrgHref,
} from "@/lib/api/soccer-structure";
import type { SoccerLeague } from "@/lib/api/soccer-types";

export function CompetitionsListPanel({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const isUnassigned = isDefaultOrganizationId(orgId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    ids: string[];
    label: string;
  } | null>(null);

  const leaguesQuery = useQuery({
    queryKey: ["admin", "soccer", "nav-leagues", orgId],
    queryFn: () => listLeaguesForOrganization(orgId),
  });
  const orgsQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations"],
    queryFn: () => listAdminOrganizations(),
    enabled: isUnassigned,
  });

  const nuevaHref = `${soccerOrgHref(orgId)}/nueva`;
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

  function invalidateLeagues() {
    void queryClient.invalidateQueries({
      queryKey: ["admin", "soccer", "nav-leagues"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["admin", "soccer", "nav-orgs"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["admin", "soccer", "leagues"],
    });
  }

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
      invalidateLeagues();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        setDeletingId(id);
        await deleteLeague(id);
      }
    },
    onSuccess: (_data, ids) => {
      toast.success(
        ids.length === 1
          ? "Liga eliminada"
          : `${ids.length} ligas eliminadas`,
      );
      setPendingDelete(null);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      invalidateLeagues();
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setDeletingId(null),
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
              ? "No hay competiciones sin organización"
              : "No hay ligas en esta organización"}
          </p>
          <p className="mt-2 text-[14px] text-dx-muted">
            {isUnassigned
              ? "Todas las competiciones ya tienen organización asignada."
              : "Crea la primera liga para esta organización."}
          </p>
          {!isUnassigned ? (
            <Link
              href={nuevaHref}
              className="mt-5 inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold !text-white hover:bg-dx-blue2"
            >
              + Crear liga
            </Link>
          ) : null}
        </div>
        <Note className="mt-5">
          Flujo: Organización → Liga → Temporada → Detalle.
        </Note>
      </>
    );
  }

  return (
    <>
      {isUnassigned && selectedIds.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#f1dfa9] bg-[#fff9e8] px-4 py-3">
          <p className="text-[13px] text-[#7d5a00]">
            {selectedIds.length} seleccionado
            {selectedIds.length === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={deleteMutation.isPending}
              onClick={() => setSelectedIds([])}
            >
              Limpiar selección
            </Button>
            <Button
              disabled={deleteMutation.isPending}
              className="bg-dx-red text-white hover:bg-[#c81e1e]"
              onClick={() => {
                setPendingDelete({
                  ids: selectedIds,
                  label:
                    selectedIds.length === 1
                      ? (rows.find((item) => item.id === selectedIds[0])
                          ?.name ?? "esta liga")
                      : `${selectedIds.length} ligas`,
                });
              }}
            >
              Eliminar seleccionados
            </Button>
          </div>
        </div>
      ) : null}

      <EditableDataTable
        columns={columns}
        rows={rows}
        getValues={getValues}
        rowHref={(row) => `/operacion/futbol/${encodeURIComponent(row.id)}`}
        showOpenAction
        selectable={isUnassigned}
        selectedIds={isUnassigned ? selectedIds : undefined}
        onSelectionChange={isUnassigned ? setSelectedIds : undefined}
        saving={saveMutation.isPending}
        deletingId={isUnassigned ? deletingId : null}
        onSave={
          isUnassigned
            ? (changes) => saveMutation.mutateAsync(changes)
            : undefined
        }
        onDelete={
          isUnassigned
            ? (id) => {
                const league = rows.find((item) => item.id === id);
                setPendingDelete({
                  ids: [id],
                  label: league?.name ?? "esta liga",
                });
              }
            : undefined
        }
        emptyLabel="No hay ligas."
      />

      {isUnassigned ? (
        <ConfirmModal
          open={Boolean(pendingDelete)}
          title={
            pendingDelete && pendingDelete.ids.length > 1
              ? "Eliminar ligas"
              : "Eliminar liga"
          }
          description={
            pendingDelete
              ? pendingDelete.ids.length === 1
                ? `¿Eliminar «${pendingDelete.label}»? Se borrará de la base de datos y no se puede deshacer.`
                : `¿Eliminar ${pendingDelete.label}? Se borrarán de la base de datos y no se puede deshacer.`
              : undefined
          }
          confirmLabel="Eliminar"
          confirmingLabel="Eliminando…"
          confirming={deleteMutation.isPending}
          onCancel={() => {
            if (!deleteMutation.isPending) setPendingDelete(null);
          }}
          onConfirm={() => {
            if (pendingDelete) deleteMutation.mutate(pendingDelete.ids);
          }}
        />
      ) : null}

      <Note className="mt-5">
        {isUnassigned
          ? "Asigna una organización a cada competición huérfana y guarda. El país se toma de la organización. También puedes eliminar ligas de forma individual o en lote."
          : "Selecciona una liga para ver y operar sus temporadas."}
      </Note>
    </>
  );
}
