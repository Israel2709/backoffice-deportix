"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getHealth,
  getJob,
  listJobs,
  listSyncLogs,
  startSync,
} from "@/lib/api/admin";
import { getStats } from "@/lib/api/public";
import type { IngestionJob, SyncSport } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { KpiGrid } from "@/components/ui/kpi-grid";
import { Note } from "@/components/ui/note";
import { StatusBadge } from "@/components/ui/status-badge";

const SYNC_SPORTS: { id: SyncSport; label: string }[] = [
  { id: "soccer", label: "Fútbol" },
  { id: "nfl", label: "NFL" },
  { id: "f1", label: "Fórmula 1" },
  { id: "all", label: "Todos" },
];

function jobTone(status: IngestionJob["status"]) {
  if (status === "completed") return "green" as const;
  if (status === "failed") return "red" as const;
  if (status === "running") return "amber" as const;
  return "gray" as const;
}

export function HomeDashboard() {
  const queryClient = useQueryClient();
  const [resume, setResume] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const healthQuery = useQuery({
    queryKey: ["admin", "health"],
    queryFn: getHealth,
  });

  const statsQuery = useQuery({
    queryKey: ["api", "stats"],
    queryFn: getStats,
  });

  const jobsQuery = useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: () => listJobs(10),
    refetchInterval: activeJobId ? 4000 : false,
  });

  const logsQuery = useQuery({
    queryKey: ["admin", "logs"],
    queryFn: () => listSyncLogs(undefined, 20),
  });

  const activeJobQuery = useQuery({
    queryKey: ["admin", "job", activeJobId],
    queryFn: () => getJob(activeJobId!),
    enabled: Boolean(activeJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.job.status;
      if (status === "completed" || status === "failed") return false;
      return 2000;
    },
  });

  useEffect(() => {
    const job = activeJobQuery.data?.job;
    if (!job) return;
    if (job.status === "completed" || job.status === "failed") {
      void queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "logs"] });
      void queryClient.invalidateQueries({ queryKey: ["api", "stats"] });
      if (job.status === "completed") {
        toast.success(`Sync ${job.sport} completado`);
      } else {
        toast.error(job.error || `Sync ${job.sport} falló`);
      }
      setActiveJobId(null);
    }
  }, [activeJobQuery.data, queryClient]);

  const syncMutation = useMutation({
    mutationFn: (sport: SyncSport) => startSync(sport, resume),
    onSuccess: (result) => {
      toast.message(result.message || "Sync iniciado");
      if (result.job?.id) {
        setActiveJobId(result.job.id);
      } else {
        void queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const stats = statsQuery.data;
  const activeJob = activeJobQuery.data?.job;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-dx-line bg-dx-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[21px] font-semibold">Estado de la API</h2>
            <p className="mt-2 text-sm text-dx-muted">
              {healthQuery.isLoading
                ? "Conectando…"
                : healthQuery.isError
                  ? "No se pudo conectar a deportix-api. Verifica que corra en :3001."
                  : (
                      <>
                        Proyecto{" "}
                        <strong className="text-dx-ink">
                          {healthQuery.data?.project}
                        </strong>{" "}
                        · env {healthQuery.data?.firebaseEnv} · status{" "}
                        {healthQuery.data?.status}
                      </>
                    )}
            </p>
          </div>
          <StatusBadge
            tone={
              healthQuery.data?.status === "ok" ||
              healthQuery.data?.status === "healthy"
                ? "green"
                : healthQuery.isError
                  ? "red"
                  : "gray"
            }
          >
            {healthQuery.isError
              ? "Offline"
              : healthQuery.isLoading
                ? "…"
                : "Online"}
          </StatusBadge>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-dx-ink">
          <input
            type="checkbox"
            checked={resume}
            onChange={(event) => setResume(event.target.checked)}
            className="size-4 accent-dx-blue"
          />
          Reanudar sync desde checkpoint
        </label>
      </div>

      <KpiGrid
        items={[
          { label: "Ligas", value: stats?.leagues ?? "—" },
          { label: "Equipos fútbol", value: stats?.soccer_teams ?? "—" },
          { label: "Equipos NFL", value: stats?.nfl_teams ?? "—" },
          { label: "Pilotos F1", value: stats?.f1_drivers ?? "—" },
        ]}
      />

      <section>
        <h2 className="mb-3 text-[21px] font-semibold">Sincronización</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {SYNC_SPORTS.map((sport) => (
            <div
              key={sport.id}
              className="rounded-2xl border border-dx-line bg-dx-card p-5"
            >
              <h3 className="text-lg font-semibold">{sport.label}</h3>
              <p className="mt-2 mb-4 text-sm text-dx-muted">
                Dispara la ingesta desde API-Sports hacia Firestore.
              </p>
              <Button
                disabled={syncMutation.isPending || Boolean(activeJobId)}
                onClick={() => syncMutation.mutate(sport.id)}
              >
                {syncMutation.isPending && syncMutation.variables === sport.id
                  ? "Iniciando…"
                  : "Sincronizar"}
              </Button>
            </div>
          ))}
        </div>
        {activeJob ? (
          <div className="mt-4 rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
            Job activo <strong>{activeJob.sport}</strong> · {activeJob.status} ·{" "}
            {activeJob.progress.step} ({activeJob.progress.current}/
            {activeJob.progress.total})
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-[14px] border border-dx-line bg-white">
          <div className="border-b border-dx-line bg-[#f8fafc] px-3.5 py-3 text-xs font-extrabold tracking-wide text-[#667085] uppercase">
            Jobs recientes
          </div>
          <div className="max-h-80 overflow-auto">
            {(jobsQuery.data?.jobs ?? []).length === 0 ? (
              <p className="p-4 text-sm text-dx-muted">Sin jobs aún.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs tracking-wide text-[#667085] uppercase">
                    <th className="px-3.5 py-3">Sport</th>
                    <th className="px-3.5 py-3">Estado</th>
                    <th className="px-3.5 py-3">Inicio</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsQuery.data?.jobs.map((job) => (
                    <tr key={job.id} className="border-t border-dx-line">
                      <td className="px-3.5 py-3 font-semibold">{job.sport}</td>
                      <td className="px-3.5 py-3">
                        <StatusBadge tone={jobTone(job.status)}>
                          {job.status}
                        </StatusBadge>
                      </td>
                      <td className="px-3.5 py-3 text-dx-muted">
                        {new Date(job.started_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[14px] border border-dx-line bg-white">
          <div className="border-b border-dx-line bg-[#f8fafc] px-3.5 py-3 text-xs font-extrabold tracking-wide text-[#667085] uppercase">
            Logs de sync
          </div>
          <div className="max-h-80 overflow-auto">
            {(logsQuery.data?.logs ?? []).length === 0 ? (
              <p className="p-4 text-sm text-dx-muted">Sin logs aún.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs tracking-wide text-[#667085] uppercase">
                    <th className="px-3.5 py-3">Sport</th>
                    <th className="px-3.5 py-3">Endpoint</th>
                    <th className="px-3.5 py-3">Proc.</th>
                  </tr>
                </thead>
                <tbody>
                  {logsQuery.data?.logs.map((log) => (
                    <tr key={log.id} className="border-t border-dx-line">
                      <td className="px-3.5 py-3 font-semibold">{log.sport}</td>
                      <td className="px-3.5 py-3 text-dx-muted">
                        {log.endpoint}
                      </td>
                      <td className="px-3.5 py-3">
                        {log.processed} / +{log.inserted} / ~{log.updated}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <Note>
        La API key de admin vive solo en el servidor del backoffice (BFF). El
        navegador llama a <code>/api/proxy/*</code>, nunca a la key directamente.
      </Note>
    </div>
  );
}
