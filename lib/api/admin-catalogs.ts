/**
 * Shared sport catalogs used by Datos maestros · Catálogos.
 * Soccer today: league types (`/v1/league-types`). Countries stay outside this hub.
 */

import { v1Request } from "./bff-client";

export type CatalogLeagueType = {
  code: string;
  label: string;
};

type List<T> = Promise<{ data: T[] }>;
type One<T> = Promise<{ data: T }>;

export async function listLeagueTypes(): List<CatalogLeagueType> {
  const data = await v1Request<CatalogLeagueType[] | CatalogLeagueType>(
    "v1/league-types?pageSize=100",
  );
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return { data: rows };
}

export async function createLeagueType(body: {
  code: string;
  label: string;
}): One<CatalogLeagueType> {
  const data = await v1Request<CatalogLeagueType>("v1/league-types", {
    method: "POST",
    body: JSON.stringify({
      code: body.code.trim(),
      label: body.label.trim(),
    }),
  });
  return { data };
}

export async function updateLeagueType(
  code: string,
  body: { label: string },
): One<CatalogLeagueType> {
  const data = await v1Request<CatalogLeagueType>(
    `v1/league-types?code=${encodeURIComponent(code)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ label: body.label.trim() }),
    },
  );
  return { data };
}

export async function deleteLeagueType(code: string): Promise<void> {
  await v1Request(`v1/league-types?code=${encodeURIComponent(code)}`, {
    method: "DELETE",
  });
}
