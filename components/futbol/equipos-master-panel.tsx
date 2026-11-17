"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FilteredSelect } from "@/components/capture/filtered-select";
import { Field } from "@/components/capture/field";
import { EditableDataTable } from "@/components/data/editable-data-table";
import { TeamLogoModal } from "@/components/futbol/team-logo-modal";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader } from "@/components/ui/page";
import { LoadingBlock } from "@/components/ui/spinner";
import {
  deleteTeam,
  listAdminCountries,
  listAdminOrganizations,
  listLeaguesForCountry,
  listSoccerTeams,
  updateTeam,
  type SoccerTeamWithLeague,
} from "@/lib/api/admin-soccer";
import {
  equiposNuevoHref,
  findCountry,
  leagueBelongsToCountry,
} from "@/lib/api/soccer-structure";

const COUNTRY_PARAM = "pais";
const ORG_PARAM = "org";
const LEAGUE_PARAM = "liga";

type TeamsSearch = {
  countryName: string;
  organizationId: string;
  leagueId: string;
};

function searchKey(search: TeamsSearch): string {
  return [
    search.countryName,
    search.organizationId || "",
    search.leagueId || "",
  ].join("|");
}

function normalizeTeamName(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("es");
}

function sameLeagueId(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? "").trim() === (b ?? "").trim() && Boolean((a ?? "").trim());
}

export function EquiposMasterPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const selectedCountryParam = searchParams.get(COUNTRY_PARAM)?.trim() ?? "";
  const selectedOrgId = searchParams.get(ORG_PARAM)?.trim() ?? "";
  const selectedLeagueId = searchParams.get(LEAGUE_PARAM)?.trim() ?? "";

  const [appliedSearch, setAppliedSearch] = useState<TeamsSearch | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [logoTeam, setLogoTeam] = useState<SoccerTeamWithLeague | null>(null);

  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });

  const countries = useMemo(() => {
    const rows = countriesQuery.data?.data ?? [];
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [countriesQuery.data]);

  const country = useMemo(
    () =>
      selectedCountryParam
        ? findCountry(countries, selectedCountryParam)
        : undefined,
    [countries, selectedCountryParam],
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

  function patchParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value?.trim()) params.set(key, value.trim());
      else params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function setCountryId(nextId: string) {
    setAppliedSearch(null);
    patchParams({
      [COUNTRY_PARAM]: nextId || null,
      [ORG_PARAM]: null,
      [LEAGUE_PARAM]: null,
    });
  }

  function setOrgId(nextId: string) {
    setAppliedSearch(null);
    patchParams({
      [ORG_PARAM]: nextId || null,
      [LEAGUE_PARAM]: null,
    });
  }

  function setLeagueId(nextId: string) {
    setAppliedSearch(null);
    patchParams({ [LEAGUE_PARAM]: nextId || null });
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

  const countryLeagues = useMemo(() => {
    const leagues = leaguesQuery.data?.data ?? [];
    if (!country) return leagues;
    return leagues.filter((league) => leagueBelongsToCountry(league, country));
  }, [leaguesQuery.data, country]);

  const organizations = orgsQuery.data?.data ?? [];

  const orgOptions = useMemo(() => {
    const orgIds = new Set(
      countryLeagues
        .map((league) => league.organization_id?.trim())
        .filter((id): id is string => Boolean(id)),
    );
    return organizations
      .filter((org) => orgIds.has(org.id))
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((org) => ({
        value: org.id,
        label: org.abbreviation
          ? `${org.name} (${org.abbreviation})`
          : org.name,
      }));
  }, [organizations, countryLeagues]);

  const leagueOptions = useMemo(() => {
    const leagues = selectedOrgId
      ? countryLeagues.filter(
          (league) => league.organization_id === selectedOrgId,
        )
      : countryLeagues;
    return [...leagues]
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((league) => ({
        value: league.id,
        label: league.name,
      }));
  }, [countryLeagues, selectedOrgId]);

  const countryLeagueEditOptions = useMemo(
    () =>
      [...countryLeagues]
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((league) => ({
          value: league.id,
          label: league.name,
        })),
    [countryLeagues],
  );

  const leagueNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const league of countryLeagues) {
      map.set(league.id, league.name);
    }
    return map;
  }, [countryLeagues]);

  const draftSearch = useMemo<TeamsSearch | null>(() => {
    if (!countryName) return null;
    return {
      countryName,
      organizationId: selectedOrgId,
      leagueId: selectedLeagueId,
    };
  }, [countryName, selectedOrgId, selectedLeagueId]);

  const draftDirty =
    Boolean(draftSearch) &&
    (!appliedSearch || searchKey(draftSearch!) !== searchKey(appliedSearch));

  function runSearch() {
    if (!draftSearch) {
      toast.error("Selecciona un país antes de buscar.");
      return;
    }
    setAppliedSearch(draftSearch);
  }

  const teamsQuery = useQuery({
    queryKey: [
      "admin",
      "soccer",
      "teams",
      "search",
      appliedSearch ? searchKey(appliedSearch) : null,
    ],
    queryFn: () =>
      listSoccerTeams({
        countryName: appliedSearch!.countryName,
        organizationId: appliedSearch!.organizationId || null,
        leagueId: appliedSearch!.leagueId || null,
      }),
    enabled: Boolean(appliedSearch?.countryName),
  });

  const rows = teamsQuery.data?.data ?? [];

  const createHref = useMemo(
    () =>
      equiposNuevoHref({
        countryId: country?.id,
        orgId: selectedOrgId || null,
        leagueIds: selectedLeagueId ? [selectedLeagueId] : [],
      }),
    [country?.id, selectedOrgId, selectedLeagueId],
  );

  const orgLabel = useMemo(() => {
    if (!selectedOrgId) return null;
    return orgOptions.find((opt) => opt.value === selectedOrgId)?.label ?? null;
  }, [orgOptions, selectedOrgId]);

  const leagueLabel = useMemo(() => {
    if (!selectedLeagueId) return null;
    return (
      leagueOptions.find((opt) => opt.value === selectedLeagueId)?.label ?? null
    );
  }, [leagueOptions, selectedLeagueId]);

  const columns = useMemo(
    () => [
      {
        id: "crest",
        header: "Logo",
        editable: false,
        filterable: false,
        sortable: false,
        className: "w-[88px]",
        format: (value: string, row: SoccerTeamWithLeague) => (
          <button
            type="button"
            title="Cambiar logo"
            aria-label={`Cambiar logo de ${row.team.name || "equipo"}`}
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-[8px] border border-transparent hover:border-dx-line hover:bg-[#f5f8ff] focus:border-dx-blue focus:outline-none"
            onClick={(event) => {
              event.stopPropagation();
              setLogoTeam(row);
            }}
          >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt=""
                className="h-8 w-8 object-contain"
              />
            ) : (
              <span className="text-[11px] font-semibold text-dx-muted">
                +
              </span>
            )}
          </button>
        ),
      },
      {
        id: "name",
        header: "Nombre",
        placeholder: "Nombre del equipo",
        sortable: true,
      },
      {
        id: "code",
        header: "Código",
        placeholder: "ABC",
        className: "w-[120px]",
      },
      {
        id: "league_id",
        header: "Liga",
        editAs: "select" as const,
        placeholder: "Liga…",
        options: countryLeagueEditOptions,
        format: (value: string) =>
          value ? (leagueNameById.get(value) ?? value) : "—",
      },
    ],
    [countryLeagueEditOptions, leagueNameById],
  );

  const getValues = useCallback(
    (row: SoccerTeamWithLeague) => ({
      crest: row.team.logo ?? "",
      name: row.team.name ?? "",
      code: row.team.code ?? "",
      league_id: row.league_id ?? "",
      logo: row.team.logo ?? "",
    }),
    [],
  );

  function assertTeamCanMoveToLeague(
    current: SoccerTeamWithLeague,
    targetLeagueId: string,
    allRows: SoccerTeamWithLeague[],
  ) {
    const targetName =
      leagueNameById.get(targetLeagueId) ?? targetLeagueId;

    if (sameLeagueId(current.league_id, targetLeagueId)) {
      throw new Error(
        `El equipo ya se encuentra en la liga «${targetName}».`,
      );
    }

    const currentName = normalizeTeamName(current.team.name);
    const currentExternal = String(current.team.id ?? "").trim();
    const clash = allRows.find((row) => {
      if (row.id === current.id) return false;
      if (!sameLeagueId(row.league_id, targetLeagueId)) return false;
      if (currentName && normalizeTeamName(row.team.name) === currentName) {
        return true;
      }
      const otherExternal = String(row.team.id ?? "").trim();
      return Boolean(
        currentExternal && otherExternal && currentExternal === otherExternal,
      );
    });

    if (clash) {
      throw new Error(
        `El equipo ya se encuentra en la liga «${targetName}».`,
      );
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      for (const change of changes) {
        const name = change.values.name?.trim() ?? "";
        if (!name) throw new Error("El nombre del equipo es obligatorio.");
        const current = rows.find((row) => row.id === change.id);
        if (!current) throw new Error("Equipo no encontrado en la tabla.");

        const nextLeagueId = change.values.league_id?.trim() || "";
        if (!nextLeagueId) {
          throw new Error("La liga es obligatoria.");
        }

        if (!sameLeagueId(current.league_id, nextLeagueId)) {
          assertTeamCanMoveToLeague(current, nextLeagueId, rows);

          // Confirm against the target league on the API (covers rows outside the current filter).
          const targetRoster = await listSoccerTeams({ leagueId: nextLeagueId });
          assertTeamCanMoveToLeague(current, nextLeagueId, [
            ...rows,
            ...targetRoster.data,
          ]);
        }

        await updateTeam(change.id, {
          name,
          abbreviation: change.values.code?.trim() || "",
          name_short: change.values.code?.trim() || "",
          logo:
            change.values.logo?.trim() ||
            current.team.logo?.trim() ||
            null,
          country_name:
            current.team.country?.trim() ||
            appliedSearch?.countryName ||
            countryName,
          league_id: nextLeagueId,
        });
      }
    },
    onSuccess: (_data, changes) => {
      toast.success(
        changes.length === 1
          ? "Equipo actualizado"
          : `${changes.length} equipos actualizados`,
      );
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "teams"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id);
      await deleteTeam(id);
    },
    onSuccess: () => {
      toast.success("Equipo eliminado de la liga");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "teams"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setDeletingId(null),
  });

  const crumbItems = [
    { label: "Datos Maestros", href: "/datos-maestros" },
    { label: "Fútbol", href: "/datos-maestros/futbol" },
    ...(country ? [{ label: country.name }] : []),
    ...(orgLabel ? [{ label: orgLabel }] : []),
    ...(leagueLabel ? [{ label: leagueLabel }] : []),
    { label: "Equipos" },
  ];

  const filtersEnabled = Boolean(country);
  const hasApplied = Boolean(appliedSearch);

  return (
    <>
      <PageHeader items={crumbItems} backLabel="Fútbol">
        <Hero
          eyebrow="Datos Maestros · Fútbol"
          title="Equipos"
          description="Elige país y, si quieres, organización o liga; luego pulsa Buscar para cargar la tabla."
          actions={
            <Link
              href={createHref}
              className="inline-flex items-center gap-2 rounded-[10px] bg-dx-blue px-[15px] py-[11px] text-sm font-bold text-white hover:bg-dx-blue2"
            >
              + Nuevo equipo
            </Link>
          }
        />
      </PageHeader>

      <div className="mb-5 grid grid-cols-1 gap-3.5 md:grid-cols-[1fr_1fr_1fr_auto]">
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
        <Field label="Organización">
          <FilteredSelect
            value={selectedOrgId}
            options={[
              { value: "", label: "Todas las organizaciones" },
              ...orgOptions,
            ]}
            placeholder="Todas las organizaciones"
            searchPlaceholder="Buscar organización…"
            emptyLabel="Sin organizaciones en este país."
            disabled={!filtersEnabled || orgsQuery.isLoading}
            onChange={setOrgId}
          />
        </Field>
        <Field label="Liga">
          <FilteredSelect
            value={selectedLeagueId}
            options={[
              { value: "", label: "Todas las ligas" },
              ...leagueOptions,
            ]}
            placeholder="Todas las ligas"
            searchPlaceholder="Buscar liga…"
            emptyLabel="Sin ligas para este filtro."
            disabled={!filtersEnabled || leaguesQuery.isLoading}
            onChange={setLeagueId}
          />
        </Field>
        <div className="flex items-end">
          <Button
            className="w-full md:w-auto"
            disabled={!draftSearch || (!draftDirty && hasApplied)}
            onClick={runSearch}
          >
            Buscar
          </Button>
        </div>
      </div>

      {!hasApplied ? (
        <div className="rounded-2xl border border-dashed border-dx-line bg-dx-card px-6 py-12 text-center shadow-[0_4px_14px_rgba(19,53,105,0.06)]">
          <p className="text-[16px] font-semibold text-dx-ink">
            {country ? "Listo para buscar" : "Selecciona un país"}
          </p>
          <p className="mt-2 text-[14px] text-dx-muted">
            {country
              ? "Ajusta organización o liga si lo necesitas y pulsa Buscar para cargar los equipos."
              : "Elige un país (y opcionalmente organización o liga) y pulsa Buscar."}
          </p>
        </div>
      ) : teamsQuery.isLoading ? (
        <LoadingBlock compact label="Cargando equipos…" />
      ) : teamsQuery.isError ? (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          {(teamsQuery.error as Error).message}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-dx-line bg-dx-card px-6 py-12 text-center shadow-[0_4px_14px_rgba(19,53,105,0.06)]">
          <p className="text-[16px] font-semibold text-dx-ink">
            No hay equipos con este filtro
          </p>
          <p className="mt-2 text-[14px] text-dx-muted">
            Prueba otra organización o liga y vuelve a buscar, o crea equipos
            asociados a las ligas de {appliedSearch?.countryName}.
          </p>
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
            const row = rows.find((item) => item.id === id);
            const label = row?.team.name?.trim() || "este equipo";
            const leagueLabel =
              (row?.league_id && leagueNameById.get(row.league_id)) ||
              row?.league_name ||
              "la liga";
            if (
              !confirm(
                `¿Eliminar «${label}» de ${leagueLabel}? Se quitará del catálogo de esa liga.`,
              )
            ) {
              return;
            }
            deleteMutation.mutate(id);
          }}
          emptyLabel="No hay equipos."
          filterPlaceholder="Filtrar equipos…"
        />
      )}

      <Note className="mt-5">
        {hasApplied
          ? `${rows.length} equipo${rows.length === 1 ? "" : "s"} con el filtro aplicado. Puedes cambiar la liga a cualquier competición del país; si el equipo ya está ahí, verás un aviso. Pulsa el logo para subirlo o cambiarlo.`
          : "La tabla no carga sola: define los criterios y pulsa Buscar."}
      </Note>

      <TeamLogoModal
        open={Boolean(logoTeam)}
        onClose={() => setLogoTeam(null)}
        teamId={logoTeam?.id ?? ""}
        teamName={logoTeam?.team.name?.trim() || "Equipo"}
        currentLogo={logoTeam?.team.logo ?? null}
        leagueId={logoTeam?.league_id ?? ""}
        countryName={
          logoTeam?.team.country?.trim() ||
          appliedSearch?.countryName ||
          countryName
        }
      />
    </>
  );
}
