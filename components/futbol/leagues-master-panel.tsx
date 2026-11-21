"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FilteredSelect } from "@/components/capture/filtered-select";
import { Field } from "@/components/capture/field";
import { EditableDataTable } from "@/components/data/editable-data-table";
import { CreateLeagueModal } from "@/components/futbol/create-league-modal";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader } from "@/components/ui/page";
import { LoadingBlock } from "@/components/ui/spinner";
import { listLeagueTypes } from "@/lib/api/admin-catalogs";
import {
  deleteLeague,
  listAdminCountries,
  listAdminOrganizations,
  listLeaguesForCountry,
  updateLeague,
} from "@/lib/api/admin-soccer";
import {
  findCountry,
  leagueBelongsToCountry,
} from "@/lib/api/soccer-structure";
import type { SoccerLeague } from "@/lib/api/soccer-types";

const COUNTRY_PARAM = "pais";

function normalizeLeagueTypeCode(
  raw: string | null | undefined,
  codes: string[],
): string {
  const normalized = (raw ?? "").trim().toLowerCase();
  if (!normalized) return codes[0] ?? "league";
  const match = codes.find((code) => code.toLowerCase() === normalized);
  return match ?? normalized;
}

export function LeaguesMasterPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const selectedParam = searchParams.get(COUNTRY_PARAM)?.trim() ?? "";

  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });

  const countries = useMemo(() => {
    const rows = countriesQuery.data?.data ?? [];
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [countriesQuery.data]);

  const country = useMemo(
    () => (selectedParam ? findCountry(countries, selectedParam) : undefined),
    [countries, selectedParam],
  );

  const countryName = country?.name ?? "";

  const countryOptions = useMemo(
    () =>
      countries.map((item) => {
        const code = item.code?.trim() || null;
        const alreadyHasCode =
          Boolean(code) && item.name.includes(`(${code})`);
        return {
          value: item.id,
          label:
            code && !alreadyHasCode ? `${item.name} (${code})` : item.name,
          meta: code ?? undefined,
        };
      }),
    [countries],
  );

  function setCountryId(nextId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextId.trim()) params.set(COUNTRY_PARAM, nextId);
    else params.delete(COUNTRY_PARAM);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const leaguesQuery = useQuery({
    queryKey: ["admin", "soccer", "leagues", "country", countryName],
    queryFn: () => listLeaguesForCountry(countryName),
    enabled: Boolean(countryName),
  });

  const orgsQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations"],
    queryFn: () => listAdminOrganizations(),
  });

  const leagueTypesQuery = useQuery({
    queryKey: ["admin", "soccer", "catalog", "league-types"],
    queryFn: listLeagueTypes,
  });

  const organizations = orgsQuery.data?.data ?? [];
  const leagueTypes = leagueTypesQuery.data?.data ?? [];
  const leagueTypeCodes = useMemo(
    () => leagueTypes.map((item) => item.code),
    [leagueTypes],
  );

  const orgOptions = useMemo(
    () =>
      [...organizations]
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((org) => {
          const countryLabel =
            org.country_name?.trim() || org.country_id?.trim() || "";
          const base = org.abbreviation
            ? `${org.name} (${org.abbreviation})`
            : org.name;
          return {
            value: org.id,
            label: countryLabel ? `${base} · ${countryLabel}` : base,
            meta: countryLabel || undefined,
          };
        }),
    [organizations],
  );

  const orgNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const org of organizations) {
      const countryLabel =
        org.country_name?.trim() || org.country_id?.trim() || "";
      map.set(
        org.id,
        countryLabel ? `${org.name} · ${countryLabel}` : org.name,
      );
    }
    return map;
  }, [organizations]);

  const rows = useMemo(() => {
    const leagues = leaguesQuery.data?.data ?? [];
    if (!country) return leagues;
    return leagues.filter((league) => leagueBelongsToCountry(league, country));
  }, [leaguesQuery.data, country]);

  const typeOptions = useMemo(
    () =>
      leagueTypes.map((item) => ({
        value: item.code,
        label: item.label,
      })),
    [leagueTypes],
  );

  const typeLabelByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of leagueTypes) {
      map.set(item.code, item.label);
    }
    return map;
  }, [leagueTypes]);

  const columns = useMemo(
    () => [
      { id: "name", header: "Nombre", placeholder: "Liga MX" },
      {
        id: "type",
        header: "Tipo",
        editAs: "select" as const,
        placeholder: "Tipo…",
        className: "w-[160px]",
        options: typeOptions,
        format: (value: string) => typeLabelByCode.get(value) ?? value,
      },
      {
        id: "organization_id",
        header: "Organización",
        editAs: "select" as const,
        placeholder: "Organización…",
        options: [{ value: "", label: "— Sin asignar —" }, ...orgOptions],
        format: (value: string) =>
          value ? (orgNameById.get(value) ?? value) : "— Sin asignar —",
      },
      {
        id: "logo",
        header: "Logo (URL)",
        placeholder: "https://…",
      },
    ],
    [orgOptions, orgNameById, typeOptions, typeLabelByCode],
  );

  const getValues = useCallback(
    (row: SoccerLeague) => ({
      name: row.name ?? "",
      type: normalizeLeagueTypeCode(row.type, leagueTypeCodes),
      organization_id: row.organization_id ?? "",
      logo: row.logo ?? "",
    }),
    [leagueTypeCodes],
  );

  const saveMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      for (const change of changes) {
        const name = change.values.name?.trim() ?? "";
        if (!name) throw new Error("El nombre de la liga es obligatorio.");

        const organizationId = change.values.organization_id?.trim() || null;
        const org = organizationId
          ? organizations.find((item) => item.id === organizationId)
          : null;
        const current = rows.find((row) => row.id === change.id);

        await updateLeague(change.id, {
          name,
          type: normalizeLeagueTypeCode(
            change.values.type,
            leagueTypeCodes,
          ),
          logo: change.values.logo?.trim() || null,
          organization_id: organizationId,
          // Prefer the selected org's country so moving orgs across countries works.
          // If unassigned, keep the league country (or the country being browsed).
          country_id:
            org?.country_id?.trim() ||
            org?.country_name?.trim() ||
            current?.country_id?.trim() ||
            current?.country_name?.trim() ||
            country?.name ||
            countryName,
        });
      }
    },
    onSuccess: (_data, changes) => {
      toast.success(
        changes.length === 1
          ? "Liga actualizada"
          : `${changes.length} ligas actualizadas`,
      );
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "leagues"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "nav-leagues"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "nav-orgs"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "organizations"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      await deleteLeague(id);
    },
    onSuccess: () => {
      toast.success("Liga eliminada");
      setPendingDelete(null);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "leagues"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "nav-leagues"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "nav-orgs"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setDeletingId(null),
  });

  const crumbItems = [
    { label: "Datos Maestros", href: "/datos-maestros" },
    { label: "Fútbol", href: "/datos-maestros/futbol" },
    ...(country ? [{ label: country.name }] : []),
    { label: "Ligas / torneos" },
  ];

  return (
    <>
      <PageHeader items={crumbItems} backLabel="Fútbol">
        <Hero
          eyebrow="Datos Maestros · Fútbol"
          title="Ligas / torneos"
          description="Selecciona un país para ver y editar sus ligas o torneos."
          actions={
            country ? (
              <Button onClick={() => setCreateOpen(true)}>+ Nueva liga</Button>
            ) : null
          }
        />
      </PageHeader>

      <div className="mb-5 max-w-md">
        <Field label="País">
          {countriesQuery.isLoading ? (
            <LoadingBlock compact label="Cargando países…" />
          ) : (
            <FilteredSelect
              value={country?.id ?? ""}
              options={countryOptions}
              placeholder="Selecciona un país"
              searchPlaceholder="Buscar por nombre o código…"
              emptyLabel="Ningún país coincide con la búsqueda."
              onChange={setCountryId}
            />
          )}
        </Field>
      </div>

      {!country ? (
        <div className="rounded-2xl border border-dashed border-dx-line bg-dx-card px-6 py-12 text-center shadow-[0_4px_14px_rgba(19,53,105,0.06)]">
          <p className="text-[16px] font-semibold text-dx-ink">
            Selecciona un país
          </p>
          <p className="mt-2 text-[14px] text-dx-muted">
            Elige un país en el selector para ver sus ligas o torneos.
          </p>
        </div>
      ) : leaguesQuery.isLoading ? (
        <LoadingBlock compact label="Cargando ligas…" />
      ) : leaguesQuery.isError ? (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          {(leaguesQuery.error as Error).message}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dx-line bg-dx-card px-6 py-12 text-center shadow-[0_4px_14px_rgba(19,53,105,0.06)]">
          <p className="text-[16px] font-semibold text-dx-ink">
            No hay ligas en {country.name}
          </p>
          <p className="mt-2 text-[14px] text-dx-muted">
            Crea la primera liga o torneo para este país.
          </p>
          <Button className="mt-5" onClick={() => setCreateOpen(true)}>
            + Nueva liga
          </Button>
        </div>
      ) : (
        <EditableDataTable
          columns={columns}
          rows={rows}
          getValues={getValues}
          saving={saveMutation.isPending}
          deletingId={deletingId}
          onSave={(changes) => saveMutation.mutateAsync(changes)}
          onDelete={(id) => {
            const league = rows.find((item) => item.id === id);
            setPendingDelete({
              id,
              label: league?.name ?? "esta liga",
            });
          }}
          emptyLabel="No hay ligas."
          filterPlaceholder="Filtrar ligas…"
        />
      )}

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Eliminar liga"
        description={
          pendingDelete
            ? `¿Eliminar «${pendingDelete.label}»? Se borrará de la base de datos y no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        confirmingLabel="Eliminando…"
        confirming={deleteMutation.isPending}
        onCancel={() => {
          if (!deleteMutation.isPending) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
      />

      {country ? (
        <CreateLeagueModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          countryName={country.name}
          countryCode={country.code}
        />
      ) : null}

      <Note className="mt-5">
        {country
          ? `Editando ligas de ${country.name}${country.code ? ` (${country.code})` : ""}. Puedes crear, editar o eliminar ligas; al asignar organización el país se alinea con el de esa organización.`
          : "Primero selecciona un país para cargar la tabla."}
      </Note>
    </>
  );
}
