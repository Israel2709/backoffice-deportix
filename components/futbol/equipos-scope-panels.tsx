"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Field, TextInput } from "@/components/capture/field";
import { MasterSelectList } from "@/components/futbol/master-select-list";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/ui/hero";
import { Note } from "@/components/ui/note";
import { PageHeader } from "@/components/ui/page";
import {
  createOrganization,
  listAdminCountries,
  listAdminLeagues,
  listAdminOrganizations,
} from "@/lib/api/admin-soccer";
import {
  equiposHref,
  findOrganization,
  leagueNamesMeta,
  leaguesForCountry,
  organizationsForCountry,
  resolveCountry,
} from "@/lib/api/soccer-structure";

function useSoccerCatalog() {
  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });
  const leaguesQuery = useQuery({
    queryKey: ["admin", "soccer", "leagues"],
    queryFn: listAdminLeagues,
  });

  return {
    countries: countriesQuery.data?.data ?? [],
    leagues: leaguesQuery.data?.data ?? [],
    countriesLoading: countriesQuery.isLoading,
    leaguesLoading: leaguesQuery.isLoading,
    isLoading: countriesQuery.isLoading || leaguesQuery.isLoading,
    error:
      (countriesQuery.error as Error | null)?.message ??
      (leaguesQuery.error as Error | null)?.message ??
      null,
  };
}

export function useCountryOrganizations(countryId: string) {
  const catalog = useSoccerCatalog();
  const country = resolveCountry(
    catalog.countries,
    catalog.leagues,
    countryId,
  );
  const orgsQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations", country?.name ?? countryId],
    queryFn: () =>
      listAdminOrganizations(country?.name ?? decodeURIComponent(countryId)),
    enabled: Boolean(country?.name || countryId),
  });
  const organizations = country
    ? organizationsForCountry(
        country,
        catalog.leagues,
        orgsQuery.data?.data ?? [],
      )
    : [];

  return {
    ...catalog,
    country,
    organizations,
    orgsLoading: orgsQuery.isLoading,
    isLoading: catalog.isLoading || orgsQuery.isLoading,
    error:
      catalog.error ??
      (orgsQuery.error as Error | null)?.message ??
      null,
  };
}

export function EquiposCountryPanel() {
  const { countries, leagues, countriesLoading, leaguesLoading, error } =
    useSoccerCatalog();
  const rows = [...countries].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );

  return (
    <>
      <MasterSelectList
        items={rows.map((country) => ({
          id: country.id,
          href: equiposHref(country.id),
          title: country.name,
          meta:
            leaguesLoading && leagues.length === 0
              ? "Cargando ligas…"
              : leagueNamesMeta(leaguesForCountry(leagues, country)),
          imageUrl: country.flag,
          fallback: country.code ?? country.name,
        }))}
        searchPlaceholder="Buscar país…"
        emptyLabel="No hay países. Créalos en Estructura deportiva."
        isLoading={countriesLoading}
        error={error}
      />
      <Note>
        Elige un país, después su organización deportiva y una liga. Los equipos
        se muestran solo para esa liga.{" "}
        <Link href="/datos-maestros/futbol/estructura" className="underline">
          Ir a estructura
        </Link>
      </Note>
    </>
  );
}

export function EquiposOrganizationScreen({ countryId }: { countryId: string }) {
  const queryClient = useQueryClient();
  const { country, organizations, isLoading, error, countriesLoading } =
    useCountryOrganizations(countryId);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const countryName = country?.name ?? "País";

  const createMutation = useMutation({
    mutationFn: () => {
      if (!country) {
        throw new Error("País no encontrado.");
      }
      return createOrganization({
        name,
        countryName: country.name,
        logo,
      }).then((res) => res.data);
    },
    onSuccess: () => {
      toast.success("Organización creada");
      setCreating(false);
      setName("");
      setLogo("");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "organizations"],
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <PageHeader
        crumbs={
          <Breadcrumbs
            items={[
              { label: "Datos Maestros", href: "/datos-maestros" },
              { label: "Fútbol", href: "/datos-maestros/futbol" },
              { label: "Equipos", href: equiposHref() },
              { label: countryName },
            ]}
          />
        }
      >
        <Hero
          eyebrow={`Fútbol · ${countryName}`}
          title="Organización deportiva"
          description="Selecciona la organización del país para ver sus ligas."
          actions={
            <Button
              disabled={!country || countriesLoading}
              onClick={() => setCreating(true)}
            >
              + Nueva organización
            </Button>
          }
        />
      </PageHeader>

      {creating ? (
        <div className="mb-5 rounded-2xl border border-dx-line bg-dx-card p-5">
          <h3 className="text-lg font-semibold">Nueva organización</h3>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre">
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Federación Mexicana de Fútbol"
              />
            </Field>
            <Field label="Logo (URL)">
              <TextInput
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setCreating(false);
                setName("");
                setLogo("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={createMutation.isPending || !name.trim() || !country}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      ) : null}

      <MasterSelectList
        items={organizations.map((org) => ({
          id: org.id,
          href: equiposHref(country?.id ?? countryId, org.id),
          title: org.name,
          meta: leagueNamesMeta(org.leagues),
          imageUrl: org.logo,
          fallback: org.name,
        }))}
        searchPlaceholder="Buscar organización…"
        emptyLabel={
          country
            ? `No hay organizaciones para ${country.name}. Crea una con + Nueva organización.`
            : "País no encontrado."
        }
        isLoading={isLoading && organizations.length === 0}
        error={error}
      />
      <Note>
        Crea la organización deportiva de este país y luego elige una para ver
        sus ligas.
      </Note>
    </>
  );
}

export function EquiposLeaguePanel({
  countryId,
  orgId,
}: {
  countryId: string;
  orgId: string;
}) {
  const { country, organizations, isLoading, error } =
    useCountryOrganizations(countryId);
  const organization = findOrganization(organizations, orgId);

  return (
    <>
      <MasterSelectList
        items={(organization?.leagues ?? []).map((league) => ({
          id: league.id,
          href: equiposHref(
            country?.id ?? countryId,
            organization?.id ?? orgId,
            league.id,
          ),
          title: league.name,
          meta: [league.type, league.country_name].filter(Boolean).join(" · "),
          imageUrl: league.logo,
          fallback: league.name,
        }))}
        searchPlaceholder="Buscar liga…"
        emptyLabel={
          organization
            ? "Esta organización no tiene ligas."
            : "Organización no encontrada para este país."
        }
        isLoading={isLoading}
        error={error}
      />
      <Note>
        Al elegir una liga se cargan únicamente sus equipos.
      </Note>
    </>
  );
}
