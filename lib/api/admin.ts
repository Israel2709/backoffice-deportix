import { proxyRequest } from "./proxy-client";
import type {
  ApiHealth,
  IngestionJob,
  SyncLog,
  SyncSport,
} from "./types";

export function getHealth(): Promise<ApiHealth> {
  return proxyRequest("admin/health");
}

export function startSync(
  sport: SyncSport,
  resume: boolean,
): Promise<{ message: string; job: IngestionJob | null }> {
  return proxyRequest("admin/sync", {
    method: "POST",
    body: JSON.stringify({ sport, resume }),
  });
}

export function getJob(
  jobId: string,
): Promise<{ job: IngestionJob; project: string }> {
  return proxyRequest(`admin/sync/jobs/${jobId}`);
}

export function listJobs(
  limit = 10,
): Promise<{ jobs: IngestionJob[]; project: string }> {
  return proxyRequest(`admin/sync/jobs?limit=${limit}`);
}

export function listSyncLogs(
  sport?: string,
  limit = 50,
): Promise<{ logs: SyncLog[] }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (sport) params.set("sport", sport);
  return proxyRequest(`admin/sync/logs?${params.toString()}`);
}
