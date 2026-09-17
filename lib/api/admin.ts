import { v1Request } from "./bff-client";
import type {
  ApiHealth,
  IngestionJob,
  SyncLog,
  SyncSport,
} from "./types";

type V1Health = {
  status?: string;
  apiVersion?: string;
  dataSourceConfigured?: boolean;
  storageConfigured?: boolean;
  timestamp?: string;
};

/** Prefer `v1/health`; map into the BO ApiHealth shape. */
export async function getHealth(): Promise<ApiHealth> {
  try {
    const data = await v1Request<V1Health>("v1/health");
    return {
      status: data?.status ?? "ok",
      project: "deportix-api",
      firebaseEnv: data?.dataSourceConfigured
        ? "configured"
        : "not-configured",
    };
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Health check failed");
  }
}

/** MVP has no sync-admin surface. */
export async function startSync(
  sport: SyncSport,
  _resume: boolean,
): Promise<{ message: string; job: IngestionJob | null }> {
  return {
    message: `Sync "${sport}" no está disponible en la API MVP (sin admin de ingesta).`,
    job: null,
  };
}

export async function getJob(
  _jobId: string,
): Promise<{ job: IngestionJob; project: string }> {
  throw new Error("Sync jobs no están disponibles en la API MVP.");
}

export async function listJobs(
  _limit = 10,
): Promise<{ jobs: IngestionJob[]; project: string }> {
  return { jobs: [], project: "deportix-api" };
}

export async function listSyncLogs(
  _sport?: string,
  _limit = 50,
): Promise<{ logs: SyncLog[] }> {
  return { logs: [] };
}
