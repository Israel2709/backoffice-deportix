"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TextInput } from "@/components/capture/field";
import {
  CountryCard,
  CountryCardsGrid,
} from "@/components/ui/country-card";
import { RecentlyVisited } from "@/components/ui/recently-visited";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";
import { useRecentVisits } from "@/hooks/use-recent-visits";
import { listAdminCountries } from "@/lib/api/admin-soccer";
import { F1_COUNTRY_RECENT_KEY } from "@/components/f1/recent-keys";

export function CountriesListPanel() {
  const [search, setSearch] = useState("");
  const { items: recentCountries } = useRecentVisits(F1_COUNTRY_RECENT_KEY);
  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });

  const rows = useMemo(() => {
    const sorted = [...(countriesQuery.data?.data ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((country) => {
      const hay = [country.name, country.code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [countriesQuery.data?.data, search]);

  if (countriesQuery.isLoading) {
    return <LoadingBlock compact label="Cargando países…" />;
  }

  if (countriesQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(countriesQuery.error as Error).message}
      </div>
    );
  }

  const total = countriesQuery.data?.data.length ?? 0;
  const showFilterBar = total > 0;

  return (
    <>
      {showFilterBar ? (
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <TextInput
            placeholder="Buscar país…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md shrink-0"
          />
          <RecentlyVisited items={recentCountries} />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-dx-muted">
          {search.trim()
            ? "Ningún país coincide con la búsqueda."
            : "No hay países. Créalos en Datos Maestros · Fútbol · Estructura."}
        </p>
      ) : (
        <CountryCardsGrid>
          {rows.map((country) => (
            <CountryCard
              key={country.id}
              href={`/operacion/formula-1/pais/${encodeURIComponent(country.id)}`}
              name={country.name}
              code={country.code}
              imageUrl={country.flag}
            />
          ))}
        </CountryCardsGrid>
      )}

      <Note className="mt-5">
        Elige un país para ver y operar sus competiciones de Fórmula 1. Los
        países se administran en{" "}
        <Link href="/datos-maestros/futbol/estructura" className="underline">
          Datos Maestros · Estructura
        </Link>
        .
      </Note>
    </>
  );
}
