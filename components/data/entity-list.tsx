"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getCountries,
  getF1Circuits,
  getF1Drivers,
  getF1Races,
  getF1Teams,
  getLeagues,
  getNflTeams,
  getSoccerTeams,
} from "@/lib/api/public";
import type { NamedEntity } from "@/lib/api/types";
import { ListRow } from "@/components/ui/page";
import { StatusBadge } from "@/components/ui/status-badge";

type EntitySource =
  | "countries"
  | "leagues-soccer"
  | "leagues-nfl"
  | "soccer-teams"
  | "nfl-teams"
  | "f1-circuits"
  | "f1-teams"
  | "f1-drivers"
  | "f1-races";

const SOURCES: Record<
  EntitySource,
  {
    queryKey: unknown[];
    queryFn: () => Promise<{ data: NamedEntity[] }>;
    emptyLabel: string;
    getTitle: (item: NamedEntity) => string;
    getMeta?: (item: NamedEntity) => string | undefined;
    rowHref?: string;
  }
> = {
  countries: {
    queryKey: ["api", "countries"],
    queryFn: getCountries,
    emptyLabel: "No hay países en la API.",
    getTitle: (item) => String(item.name ?? "Sin nombre"),
    getMeta: (item) =>
      typeof item.code === "string" ? item.code : undefined,
  },
  "leagues-soccer": {
    queryKey: ["api", "leagues", "soccer"],
    queryFn: () => getLeagues("soccer"),
    emptyLabel: "No hay ligas de fútbol en la API.",
    getTitle: (item) => String(item.name ?? "Sin nombre"),
    getMeta: (item) =>
      [item.country_name, item.slug].filter(Boolean).join(" · ") || undefined,
  },
  "leagues-nfl": {
    queryKey: ["api", "leagues", "nfl"],
    queryFn: () => getLeagues("nfl"),
    emptyLabel: "No hay ligas NFL en la API.",
    getTitle: (item) => String(item.name ?? "Sin nombre"),
  },
  "soccer-teams": {
    queryKey: ["api", "soccer", "teams"],
    queryFn: getSoccerTeams,
    emptyLabel: "No hay equipos de fútbol en la API.",
    getTitle: (item) => String(item.name ?? "Sin nombre"),
    getMeta: (item) =>
      [item.country_name, item.code].filter(Boolean).join(" · ") || undefined,
  },
  "nfl-teams": {
    queryKey: ["api", "nfl", "teams"],
    queryFn: getNflTeams,
    emptyLabel: "No hay equipos NFL en la API.",
    getTitle: (item) => String(item.name ?? "Sin nombre"),
    getMeta: (item) =>
      [item.city, item.code].filter(Boolean).join(" · ") || undefined,
  },
  "f1-circuits": {
    queryKey: ["api", "f1", "circuits"],
    queryFn: getF1Circuits,
    emptyLabel: "No hay circuitos en la API.",
    getTitle: (item) => String(item.name ?? "Sin nombre"),
    getMeta: (item) =>
      typeof item.country_name === "string"
        ? item.country_name
        : typeof item.country === "string"
          ? item.country
          : undefined,
  },
  "f1-teams": {
    queryKey: ["api", "f1", "teams"],
    queryFn: getF1Teams,
    emptyLabel: "No hay equipos F1 en la API.",
    getTitle: (item) => String(item.name ?? "Sin nombre"),
  },
  "f1-drivers": {
    queryKey: ["api", "f1", "drivers"],
    queryFn: getF1Drivers,
    emptyLabel: "No hay pilotos en la API.",
    getTitle: (item) => String(item.name ?? "Sin nombre"),
    getMeta: (item) => {
      const number =
        typeof item.number === "number" || typeof item.number === "string"
          ? `#${item.number}`
          : undefined;
      const country =
        typeof item.country_name === "string" ? item.country_name : undefined;
      return [number, country].filter(Boolean).join(" · ") || undefined;
    },
  },
  "f1-races": {
    queryKey: ["api", "f1", "races"],
    queryFn: getF1Races,
    emptyLabel: "No hay carreras F1 en la API.",
    getTitle: (item) =>
      String(item.name ?? item.competition_name ?? "Sin nombre"),
    getMeta: (item) => {
      const date =
        typeof item.date === "string"
          ? item.date
          : typeof item.start_date === "string"
            ? item.start_date
            : undefined;
      const status =
        typeof item.status === "string" ? item.status : undefined;
      return [date, status].filter(Boolean).join(" · ") || undefined;
    },
  },
};

export function EntityList({
  source,
  rowHref,
  emptyLabel,
}: {
  source: EntitySource;
  rowHref?: string;
  emptyLabel?: string;
}) {
  const config = SOURCES[source];
  const query = useQuery({
    queryKey: config.queryKey,
    queryFn: config.queryFn,
  });

  if (query.isLoading) {
    return <p className="text-sm text-dx-muted">Cargando…</p>;
  }

  if (query.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(query.error as Error).message}
      </div>
    );
  }

  const items = query.data?.data ?? [];
  if (items.length === 0) {
    return (
      <p className="text-sm text-dx-muted">
        {emptyLabel ?? config.emptyLabel}
      </p>
    );
  }

  const href = rowHref ?? config.rowHref;

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, index) => (
        <ListRow
          key={String(item.id ?? config.getTitle(item) ?? index)}
          href={href}
          title={config.getTitle(item)}
          meta={config.getMeta?.(item)}
          trailing={
            typeof item.active === "boolean" ? (
              <StatusBadge tone={item.active ? "green" : "gray"}>
                {item.active ? "Activo" : "Inactivo"}
              </StatusBadge>
            ) : undefined
          }
        />
      ))}
    </div>
  );
}
