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

  rounds: number;

  classifications: {
    drivers: boolean;
    constructors: boolean;
  };

  sprint: {
    enabled: boolean;
    rounds?: number;
  };

  grid: {
    maxTeams?: number;
    driversPerTeam?: number;
  };

  pointsSystemId?: string;

  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };

  website?: string;
  description?: string;

  externalIds?: Record<string, string>;

  active: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Participants live in the `entries` subcollection of a competition.
 * They are not edited on the competition form.
 */
export interface F1Entry {
  id: string;

  teamId: string;

  drivers: {
    driverId: string;
    number: number;
    role: "race-driver" | "reserve-driver";
  }[];

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
  championshipType: F1ChampionshipType;
  status: F1CompetitionStatus;
  startDate: string;
  endDate: string;
  rounds: number;
  classifications: {
    drivers: boolean;
    constructors: boolean;
  };
  sprint: {
    enabled: boolean;
    rounds: number;
  };
  grid: {
    maxTeams: number;
    driversPerTeam: number;
  };
  pointsSystemId: string;
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
  };
  website: string;
  description: string;
  active: boolean;
};

export function emptyCompetitionForm(): F1CompetitionFormValues {
  return {
    name: "",
    shortName: "",
    officialName: "",
    slug: "",
    championshipType: "world-championship",
    status: "scheduled",
    startDate: "",
    endDate: "",
    rounds: 0,
    classifications: {
      drivers: true,
      constructors: true,
    },
    sprint: {
      enabled: false,
      rounds: 0,
    },
    grid: {
      maxTeams: 0,
      driversPerTeam: 2,
    },
    pointsSystemId: "",
    branding: {
      logoUrl: "",
      primaryColor: "",
      secondaryColor: "",
    },
    website: "",
    description: "",
    active: true,
  };
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function slugifyCompetitionName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function optionalPositiveInt(value: number, label: string, errors: Record<string, string>, key: string) {
  if (value === 0) return;
  if (!Number.isInteger(value) || value < 1) {
    errors[key] = `${label} debe ser un entero mayor o igual a 1.`;
  }
}

export function validateCompetitionForm(
  values: F1CompetitionFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) errors.name = "El nombre es obligatorio.";
  if (!values.slug.trim()) errors.slug = "El slug es obligatorio.";

  if (!Number.isInteger(values.rounds) || values.rounds < 1) {
    errors.rounds = "El número de rondas debe ser al menos 1.";
  }

  if (values.startDate && values.endDate && values.startDate > values.endDate) {
    errors.endDate = "La fecha de fin debe ser igual o posterior a la de inicio.";
  }

  if (values.sprint.enabled) {
    if (!Number.isInteger(values.sprint.rounds) || values.sprint.rounds < 1) {
      errors["sprint.rounds"] = "Indica cuántas rondas sprint hay.";
    } else if (values.sprint.rounds > values.rounds) {
      errors["sprint.rounds"] =
        "Las rondas sprint no pueden superar las rondas de la competición.";
    }
  }

  optionalPositiveInt(
    values.grid.maxTeams,
    "El máximo de equipos",
    errors,
    "grid.maxTeams",
  );
  optionalPositiveInt(
    values.grid.driversPerTeam,
    "Los pilotos por equipo",
    errors,
    "grid.driversPerTeam",
  );

  if (values.website.trim() && !isHttpUrl(values.website.trim())) {
    errors.website = "Ingresa una URL válida (http o https).";
  }

  if (
    values.branding.primaryColor.trim() &&
    !HEX_COLOR.test(values.branding.primaryColor.trim())
  ) {
    errors["branding.primaryColor"] = "Usa el formato hexadecimal #RRGGBB.";
  }
  if (
    values.branding.secondaryColor.trim() &&
    !HEX_COLOR.test(values.branding.secondaryColor.trim())
  ) {
    errors["branding.secondaryColor"] = "Usa el formato hexadecimal #RRGGBB.";
  }

  return errors;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function positiveOrNull(value: number): number | null {
  return Number.isInteger(value) && value >= 1 ? value : null;
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
  rounds: number;
  classifications: F1Competition["classifications"];
  sprint: { enabled: boolean; rounds?: number | null };
  grid: { maxTeams: number | null; driversPerTeam: number | null };
  pointsSystemId: string | null;
  branding: {
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
  };
  website: string | null;
  description: string | null;
  active: boolean;
  seasonId?: string;
};

export function toCompetitionWriteBody(
  values: F1CompetitionFormValues,
  options: { mode: "create"; seasonId: string } | { mode: "update" },
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
    rounds: values.rounds,
    classifications: {
      drivers: values.classifications.drivers,
      constructors: values.classifications.constructors,
    },
    sprint: values.sprint.enabled
      ? { enabled: true, rounds: values.sprint.rounds }
      : { enabled: false, rounds: null },
    grid: {
      maxTeams: positiveOrNull(values.grid.maxTeams),
      driversPerTeam: positiveOrNull(values.grid.driversPerTeam),
    },
    pointsSystemId: emptyToNull(values.pointsSystemId),
    branding: {
      logoUrl: emptyToNull(values.branding.logoUrl),
      primaryColor: emptyToNull(values.branding.primaryColor),
      secondaryColor: emptyToNull(values.branding.secondaryColor),
    },
    website: emptyToNull(values.website),
    description: emptyToNull(values.description),
    active: values.active,
  };

  if (options.mode === "create") body.seasonId = options.seasonId;
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

function asInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
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

export function competitionToForm(raw: unknown): F1CompetitionFormValues {
  const doc = asRecord(raw);
  const base = emptyCompetitionForm();
  if (!doc) return base;

  const classifications = asRecord(doc.classifications);
  const sprint = asRecord(doc.sprint);
  const grid = asRecord(doc.grid);
  const branding = asRecord(doc.branding);
  const championshipType = asString(doc.championshipType);
  const status = asString(doc.status);

  return {
    name: asString(doc.name),
    shortName: asString(doc.shortName),
    officialName: asString(doc.officialName),
    slug: asString(doc.slug),
    championshipType: CHAMPIONSHIP_TYPES.has(championshipType as F1ChampionshipType)
      ? (championshipType as F1ChampionshipType)
      : base.championshipType,
    status: STATUSES.has(status as F1CompetitionStatus)
      ? (status as F1CompetitionStatus)
      : base.status,
    startDate: asDateInput(doc.startDate),
    endDate: asDateInput(doc.endDate),
    rounds: asInt(doc.rounds, 0),
    classifications: {
      drivers:
        typeof classifications?.drivers === "boolean"
          ? classifications.drivers
          : true,
      constructors:
        typeof classifications?.constructors === "boolean"
          ? classifications.constructors
          : true,
    },
    sprint: {
      enabled: sprint?.enabled === true,
      rounds: asInt(sprint?.rounds, 0),
    },
    grid: {
      maxTeams: asInt(grid?.maxTeams, 0),
      driversPerTeam: asInt(grid?.driversPerTeam, 2),
    },
    pointsSystemId: asString(doc.pointsSystemId),
    branding: {
      logoUrl: asString(branding?.logoUrl),
      primaryColor: asString(branding?.primaryColor),
      secondaryColor: asString(branding?.secondaryColor),
    },
    website: asString(doc.website),
    description: asString(doc.description),
    active: typeof doc.active === "boolean" ? doc.active : true,
  };
}
