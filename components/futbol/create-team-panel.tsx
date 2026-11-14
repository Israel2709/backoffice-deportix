"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FilteredMultiSelect } from "@/components/capture/filtered-multi-select";
import { FilteredSelect } from "@/components/capture/filtered-select";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { LogoUrlOrFileField } from "@/components/capture/logo-url-or-file-field";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader } from "@/components/ui/page";
import { LoadingBlock } from "@/components/ui/spinner";
import {
  createTeamForLeagues,
  listAdminCountries,
  listAdminOrganizations,
  listLeaguesForCountry,
} from "@/lib/api/admin-soccer";
import {
  equiposHref,
  equiposNuevoHref,
  findCountry,
  isDefaultOrganizationId,
  leagueBelongsToCountry,
} from "@/lib/api/soccer-structure";

export function CreateTeamPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initialCountryParam = searchParams.get("pais")?.trim() ?? "";
  const initialOrgId = searchParams.get("org")?.trim() ?? "";
  const initialLeagueIds = useMemo(
    () =>
      (searchParams.get("liga") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    [searchParams],
  );

  const [name, setName] = useState("");
  const [nameShort, setNameShort] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [nameAlt, setNameAlt] = useState("");
  const [countryId, setCountryId] = useState(initialCountryParam);
  const [organizationId, setOrganizationId] = useState(
    initialOrgId && !isDefaultOrganizationId(initialOrgId) ? initialOrgId : "",
  );
  const [leagueIds, setLeagueIds] = useState<string[]>(initialLeagueIds);
  const [logo, setLogo] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });

  const countries = useMemo(() => {
    const rows = countriesQuery.data?.data ?? [];
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [countriesQuery.data]);

  const country = useMemo(
    () => (countryId ? findCountry(countries, countryId) : undefined),
    [countries, countryId],
  );
  const countryName = country?.name ?? "";

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
    const fromCountry = organizations.filter((org) => orgIds.has(org.id));
    const pool =
      fromCountry.length > 0
        ? fromCountry
        : organizations.filter((org) => {
            const orgCountry =
              org.country_name?.trim() || org.country_id?.trim() || "";
            return (
              !countryName ||
              orgCountry.toLocaleLowerCase("es") ===
                countryName.toLocaleLowerCase("es")
            );
          });
    return [...pool]
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((org) => ({
        value: org.id,
        label: org.abbreviation
          ? `${org.name} (${org.abbreviation})`
          : org.name,
      }));
  }, [organizations, countryLeagues, countryName]);

  const leagueOptions = useMemo(() => {
    const leagues = organizationId
      ? countryLeagues.filter(
          (league) => league.organization_id === organizationId,
        )
      : countryLeagues;
    return [...leagues]
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((league) => ({
        value: league.id,
        label: league.name,
      }));
  }, [countryLeagues, organizationId]);

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

  const organization = organizations.find((org) => org.id === organizationId);
  const selectedLeagueNames = leagueIds
    .map((id) => leagueOptions.find((opt) => opt.value === id)?.label ?? id)
    .filter(Boolean);

  const crumbItems = [
    { label: "Datos Maestros", href: "/datos-maestros" },
    { label: "Fútbol", href: "/datos-maestros/futbol" },
    ...(country
      ? [{ label: country.name, href: equiposHref(country.id) }]
      : []),
    ...(organization
      ? [
          {
            label: organization.name,
            href: equiposHref(country?.id ?? countryId, organization.id),
          },
        ]
      : []),
    ...(leagueIds.length === 1 && selectedLeagueNames[0]
      ? [
          {
            label: selectedLeagueNames[0],
            href: organization
              ? equiposHref(
                  country?.id ?? countryId,
                  organization.id,
                  leagueIds[0],
                )
              : equiposHref(),
          },
        ]
      : []),
    { label: "Nuevo equipo" },
  ];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("El nombre oficial es obligatorio.");
      if (!nameShort.trim()) throw new Error("El nombre corto es obligatorio.");
      if (!abbreviation.trim()) throw new Error("La abreviatura es obligatoria.");
      if (!country) throw new Error("Selecciona un país.");

      return createTeamForLeagues({
        name: trimmedName,
        name_short: nameShort.trim(),
        abbreviation: abbreviation.trim(),
        name_alt: nameAlt.trim() || null,
        country_id: country.id,
        country_name: country.name,
        logo: logo.trim() || null,
        status,
        league_ids: leagueIds,
      });
    },
    onSuccess: (result) => {
      const count = result.data.length;
      toast.success(
        count > 1
          ? `Equipo creado en ${count} ligas`
          : "Equipo creado",
      );
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "teams"],
      });
      if (country && organizationId && leagueIds.length === 1) {
        router.push(equiposHref(country.id, organizationId, leagueIds[0]));
        return;
      }
      if (country) {
        router.push(
          `${equiposHref()}?pais=${encodeURIComponent(country.id)}${
            organizationId
              ? `&org=${encodeURIComponent(organizationId)}`
              : ""
          }${
            leagueIds.length === 1
              ? `&liga=${encodeURIComponent(leagueIds[0])}`
              : ""
          }`,
        );
        return;
      }
      router.push(equiposHref());
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function onCountryChange(nextId: string) {
    setCountryId(nextId);
    setOrganizationId("");
    setLeagueIds([]);
  }

  function onOrganizationChange(nextId: string) {
    setOrganizationId(nextId);
    if (!nextId) return;
    setLeagueIds((prev) =>
      prev.filter((id) => {
        const league = countryLeagues.find((item) => item.id === id);
        return league?.organization_id === nextId;
      }),
    );
  }

  const cancelHref = country
    ? organizationId && leagueIds.length === 1
      ? equiposHref(country.id, organizationId, leagueIds[0])
      : organizationId
        ? equiposHref(country.id, organizationId)
        : `${equiposHref()}?pais=${encodeURIComponent(country.id)}`
    : equiposHref();

  return (
    <>
      <PageHeader items={crumbItems} backLabel="Volver">
        <Hero
          eyebrow="Datos Maestros · Fútbol"
          title="Nuevo equipo"
          description="El equipo se crea una sola vez en el catálogo. Luego se asocia a temporadas desde Operación Deportiva."
        />
      </PageHeader>

      {countriesQuery.isLoading ? (
        <LoadingBlock compact label="Cargando…" />
      ) : (
        <div className="rounded-2xl border border-dx-line bg-dx-card p-5">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre oficial">
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Club América"
              />
            </Field>
            <Field label="Nombre corto">
              <TextInput
                value={nameShort}
                onChange={(e) => setNameShort(e.target.value)}
                placeholder="América"
              />
            </Field>
            <Field label="Abreviatura">
              <TextInput
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
                placeholder="AME"
              />
            </Field>
            <Field label="Nombre alternativo">
              <TextInput
                value={nameAlt}
                onChange={(e) => setNameAlt(e.target.value)}
                placeholder="Opcional"
              />
            </Field>
            <Field label="País">
              <FilteredSelect
                value={country?.id ?? ""}
                options={countryOptions}
                placeholder="Selecciona un país"
                searchPlaceholder="Buscar país…"
                emptyLabel="Ningún país coincide."
                onChange={onCountryChange}
              />
            </Field>
            <Field label="Estado">
              <TextSelect
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "active" | "inactive")
                }
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </TextSelect>
            </Field>
            <Field label="Organización deportiva (opcional)">
              <FilteredSelect
                value={organizationId}
                options={[
                  { value: "", label: "Sin organización" },
                  ...orgOptions,
                ]}
                placeholder="Sin organización"
                searchPlaceholder="Buscar organización…"
                emptyLabel="Sin organizaciones para este país."
                disabled={!country || orgsQuery.isLoading}
                onChange={onOrganizationChange}
              />
            </Field>
            <Field label="Ligas / torneos (opcional)">
              <FilteredMultiSelect
                values={leagueIds}
                options={leagueOptions}
                onChange={setLeagueIds}
                placeholder={
                  !country
                    ? "Selecciona un país primero"
                    : "Sin ligas asignadas"
                }
                searchPlaceholder="Buscar liga…"
                emptyLabel="Sin ligas para este filtro."
                confirmLabel="Listo"
                disabled={!country || leaguesQuery.isLoading}
              />
            </Field>
            <LogoUrlOrFileField
              label="Logo"
              value={logo}
              folder="logos/soccer/teams"
              onChange={setLogo}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push(cancelHref)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                saveMutation.isPending ||
                !name.trim() ||
                !nameShort.trim() ||
                !abbreviation.trim() ||
                !country
              }
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Guardando…" : "Crear equipo"}
            </Button>
          </div>
        </div>
      )}

      <Note className="mt-5">
        Organización y ligas son opcionales. Si eliges varias ligas, el mismo
        equipo se registra en cada una con los mismos datos maestros.{" "}
        <a
          href={equiposNuevoHref()}
          className="font-semibold text-dx-blue underline"
          onClick={(e) => {
            e.preventDefault();
            router.push(equiposNuevoHref());
          }}
        >
          Limpiar contexto
        </a>
        .
      </Note>
    </>
  );
}
