"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAdminF1Season,
  listF1Participants,
  listDriverRankings,
  listSeasonRaces,
  updateF1Season,
} from "@/lib/api/admin-f1";
import {
  SEASON_STATUS_LABEL,
  seasonLabel,
  type SeasonStatus,
} from "@/lib/api/f1-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { KpiGrid } from "@/components/ui/kpi-grid";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { StickyActions } from "@/components/capture/sticky-actions";

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function SeasonGeneralPanel({ seasonId }: { seasonId: string }) {
  const queryClient = useQueryClient();
  const seasonQuery = useQuery({
    queryKey: ["admin", "f1", "season", seasonId],
    queryFn: () => getAdminF1Season(seasonId),
  });
  const participantsQuery = useQuery({
    queryKey: ["admin", "f1", "participants", seasonId],
    queryFn: () => listF1Participants(seasonId),
  });
  const racesQuery = useQuery({
    queryKey: ["admin", "f1", "races", seasonId],
    queryFn: () => listSeasonRaces(seasonId),
  });
  const rankingsQuery = useQuery({
    queryKey: ["admin", "f1", "driver-rankings", seasonId],
    queryFn: () => listDriverRankings(seasonId),
  });

  const [form, setForm] = useState({
    name: "",
    status: "upcoming" as SeasonStatus,
    start_date: "",
    end_date: "",
  });
  const [baseline, setBaseline] = useState("");

  useEffect(() => {
    const season = seasonQuery.data?.data;
    if (!season) return;
    const next = {
      name: season.name ?? "",
      status: (season.status ?? "upcoming") as SeasonStatus,
      start_date: toDateInput(season.start_date),
      end_date: toDateInput(season.end_date),
    };
    setForm(next);
    setBaseline(JSON.stringify(next));
  }, [seasonQuery.data]);

  const dirty = JSON.stringify(form) !== baseline;
  useDirtyGuard(dirty);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateF1Season(seasonId, {
        name: form.name.trim() || null,
        status: form.status,
        start_date: form.start_date
          ? new Date(form.start_date).toISOString()
          : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      }),
    onSuccess: () => {
      toast.success("Temporada actualizada");
      setBaseline(JSON.stringify(form));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "season", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const season = seasonQuery.data?.data;
  const races = racesQuery.data?.data ?? [];

  if (seasonQuery.isLoading) {
    return <p className="text-sm text-dx-muted">Cargando…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[21px] font-semibold">
            {season ? seasonLabel(season) : "Temporada"}
          </h2>
          <p className="text-sm text-dx-muted">Datos generales de la temporada</p>
        </div>
        {season ? (
          <StatusBadge
            tone={
              season.status === "current"
                ? "green"
                : season.status === "upcoming"
                  ? "amber"
                  : "gray"
            }
          >
            {SEASON_STATUS_LABEL[season.status ?? "upcoming"]}
          </StatusBadge>
        ) : null}
      </div>

      <KpiGrid
        items={[
          {
            label: "Participantes",
            value: participantsQuery.data?.data.length ?? "—",
          },
          { label: "Carreras", value: races.length || "—" },
          {
            label: "Ranking pilotos",
            value: rankingsQuery.data?.data.length ?? "—",
          },
          { label: "Año", value: season?.year ?? "—" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-dx-line bg-dx-card p-5">
          <h3 className="font-semibold">Datos generales</h3>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre">
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Estado">
              <TextSelect
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as SeasonStatus })
                }
              >
                <option value="upcoming">Próxima</option>
                <option value="current">Vigente</option>
                <option value="finished">Finalizada</option>
                <option value="cancelled">Cancelada</option>
              </TextSelect>
            </Field>
            <Field label="Fecha inicio">
              <TextInput
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </Field>
            <Field label="Fecha fin">
              <TextInput
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <div className="space-y-2">
          {(participantsQuery.data?.data.length ?? 0) > 0 ? (
            <div className="rounded-xl border border-[#c8eadc] bg-[#edf9f4] px-3.5 py-3 text-[13px] text-[#17684d]">
              ✓ Hay participantes asociados
            </div>
          ) : (
            <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
              ⚠️ Sin participantes — agrégalos en la pestaña correspondiente
            </div>
          )}
          {races.length === 0 ? (
            <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
              ⚠️ Sin carreras en el calendario
            </div>
          ) : null}
        </div>
      </div>

      <StickyActions
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel="Guardar general"
        onDiscard={() => setForm(JSON.parse(baseline) as typeof form)}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}
