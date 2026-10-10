/**
 * Firestore document for an F1 competition that belongs to a season.
 * The BFF list summary (`id`, `name`, `logo`) stays in `f1-types`.
 *
 * `createdAt` and `updatedAt` are Firestore timestamps written with
 * `serverTimestamp()` on the API. This client only sees ISO-8601 strings.
 * `startDate` and `endDate` are stored as Firestore timestamps and travel as `YYYY-MM-DD`.
 */

/** ISO-8601 instant, or `YYYY-MM-DD` for calendar dates. */
export type Timestamp = string;

export type F1ChampionshipType =
  | "world-championship"
  | "national-championship"
  | "regional-championship"
  | "series";

export type F1CompetitionStatus =
  | "scheduled"
  | "active"
  | "completed"
  | "cancelled";

export interface F1Competition {
  id: string;
  slug: string;

  name: string;
  shortName?: string;
  officialName?: string;

  seasonId: string;

  championshipType: F1ChampionshipType;
  status: F1CompetitionStatus;

  startDate?: Timestamp;
  endDate?: Timestamp;

  /** Always active for drivers and constructors. */
  classifications: {
    drivers: boolean;
    constructors: boolean;
  };

  /** Sprint is always enabled. */
  sprint: {
    enabled: boolean;
  };

  pointsSystemId?: string;

  branding?: {
    logoUrl?: string;
  };

  website?: string;

  externalIds?: Record<string, string>;

  active: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Flat participation row for a competition season.
 * Persisted via `/formula-1/entries` (driverId + constructor teamId).
 * Not edited on the competition form — managed in Participantes.
 */
export interface F1Entry {
  id: string;
  competitionId: string;
  season: number;
  driverId: string;
  /** Constructor for this participation. */
  teamId: string;
  number?: number | null;
  role?: "race-driver" | "reserve-driver";
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const F1_CHAMPIONSHIP_TYPE_LABEL: Record<F1ChampionshipType, string> = {
  "world-championship": "Campeonato mundial",
  "national-championship": "Campeonato nacional",
  "regional-championship": "Campeonato regional",
  series: "Serie",
};

export const F1_COMPETITION_STATUS_LABEL: Record<F1CompetitionStatus, string> = {
  scheduled: "Programada",
  active: "Activa",
  completed: "Finalizada",
  cancelled: "Cancelada",
};

export type F1CompetitionFormValues = {
  name: string;
  shortName: string;
  officialName: string;
  slug: string;
  /** Master-data country id (or location label until resolved). */
  countryId: string;
  championshipType: F1ChampionshipType;
  status: F1CompetitionStatus;
  startDate: string;
  endDate: string;
  pointsSystemId: string;
  branding: {
    logoUrl: string;
  };
  website: string;
  active: boolean;
};

export function emptyCompetitionForm(): F1CompetitionFormValues {
  return {
    name: "",
    shortName: "",
    officialName: "",
    slug: "",
    countryId: "",
    championshipType: "world-championship",
    status: "scheduled",
    startDate: "",
    endDate: "",
    pointsSystemId: "",
    branding: {
      logoUrl: "",
    },
    website: "",
    active: true,
  };
}

export function slugifyCompetitionName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Slug from name plus a short stable suffix (usually the competition id).
 * Same id → same suffix, so renames stay unique without rotating the token.
 */
export function uniqueCompetitionSlug(
  value: string,
  suffixSource: string = crypto.randomUUID(),
): string {
  const base = slugifyCompetitionName(value) || "competition";
  const suffix = suffixSource.replace(/-/g, "").slice(0, 8);
  return `${base}-${suffix}`;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateCompetitionForm(
  values: F1CompetitionFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) errors.name = "El nombre es obligatorio.";
  if (!values.countryId.trim()) errors.countryId = "El país es obligatorio.";

  if (values.startDate && values.endDate && values.startDate > values.endDate) {
    errors.endDate = "La fecha de fin debe ser igual o posterior a la de inicio.";
  }

  if (values.website.trim() && !isHttpUrl(values.website.trim())) {
    errors.website = "Ingresa una URL válida (http o https).";
  }

  return errors;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Body sent to the API. Timestamps, id and externalIds stay on the server. */
export type F1CompetitionWriteBody = {
  name: string;
  slug: string;
  shortName: string | null;
  officialName: string | null;
  championshipType: F1ChampionshipType;
  status: F1CompetitionStatus;
  startDate: string | null;
  endDate: string | null;
  classifications: F1Competition["classifications"];
  sprint: { enabled: true };
  pointsSystemId: string | null;
  branding: {
    logoUrl: string | null;
  };
  website: string | null;
  active: boolean;
  seasonId?: string;
  location?: { country?: string | null; city?: string | null } | null;
};

export function toCompetitionWriteBody(
  values: F1CompetitionFormValues,
  options:
    | {
        mode: "create";
        seasonId: string;
        countryName?: string;
        countryId?: string;
      }
    | {
        mode: "update";
        countryName?: string;
        countryId?: string;
      },
): F1CompetitionWriteBody {
  const body: F1CompetitionWriteBody = {
    name: values.name.trim(),
    slug: values.slug.trim(),
    shortName: emptyToNull(values.shortName),
    officialName: emptyToNull(values.officialName),
    championshipType: values.championshipType,
    status: values.status,
    startDate: values.startDate || null,
    endDate: values.endDate || null,
    classifications: {
      drivers: true,
      constructors: true,
    },
    sprint: { enabled: true },
    pointsSystemId: emptyToNull(values.pointsSystemId),
    branding: {
      logoUrl: emptyToNull(values.branding.logoUrl),
    },
    website: emptyToNull(values.website),
    active: values.active,
  };

  if (options.mode === "create") {
    body.seasonId = options.seasonId;
  }

  const countryLabel =
    options.countryName?.trim() ||
    options.countryId?.trim() ||
    values.countryId.trim() ||
    "";
  if (countryLabel) {
    body.location = { country: countryLabel, city: null };
  }

  return body;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asDateInput(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  return value.slice(0, 10);
}

const CHAMPIONSHIP_TYPES = new Set<F1ChampionshipType>([
  "world-championship",
  "national-championship",
  "regional-championship",
  "series",
]);

const STATUSES = new Set<F1CompetitionStatus>([
  "scheduled",
  "active",
  "completed",
  "cancelled",
]);

function locationCountryLabel(raw: unknown): string {
  if (typeof raw === "string") return raw.trim();
  const location = asRecord(raw);
  return asString(location?.country).trim();
}

export function competitionToForm(raw: unknown): F1CompetitionFormValues {
  const doc = asRecord(raw);
  const base = emptyCompetitionForm();
  if (!doc) return base;

  const branding = asRecord(doc.branding);
  const championshipType = asString(doc.championshipType);
  const status = asString(doc.status);

  return {
    name: asString(doc.name),
    shortName: asString(doc.shortName),
    officialName: asString(doc.officialName),
    slug: asString(doc.slug),
    countryId: locationCountryLabel(doc.location),
    championshipType: CHAMPIONSHIP_TYPES.has(championshipType as F1ChampionshipType)
      ? (championshipType as F1ChampionshipType)
      : base.championshipType,
    status: STATUSES.has(status as F1CompetitionStatus)
      ? (status as F1CompetitionStatus)
      : base.status,
    startDate: asDateInput(doc.startDate),
    endDate: asDateInput(doc.endDate),
    pointsSystemId: asString(doc.pointsSystemId),
    branding: {
      logoUrl: asString(branding?.logoUrl),
    },
    website: asString(doc.website),
    active: typeof doc.active === "boolean" ? doc.active : true,
  };
}
