"use client";

import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAdminSeason,
  listParticipants,
  listRounds,
  listSeasonMatches,
  updateSeason,
} from "@/lib/api/admin-soccer";
import {
  SEASON_STATUS_LABEL,
  seasonLabel,
  type SeasonStatus,
} from "@/lib/api/soccer-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
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
    queryKey: ["admin", "soccer", "season", seasonId],
    queryFn: () => getAdminSeason(seasonId),
  });
  const participantsQuery = useQuery({
    queryKey: ["admin", "soccer", "participants", seasonId],
    queryFn: () => listParticipants(seasonId),
  });
  const roundsQuery = useQuery({
    queryKey: ["admin", "soccer", "rounds", seasonId],
    queryFn: () => listRounds(seasonId),
  });
  const matchesQuery = useQuery({
    queryKey: ["admin", "soccer", "matches", seasonId],
    queryFn: () => listSeasonMatches(seasonId),
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
      updateSeason(seasonId, {
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
        queryKey: ["admin", "soccer", "season", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const season = seasonQuery.data?.data;
  const matches = matchesQuery.data?.data ?? [];
  const finished = matches.filter(
    (m) => m.bo_status === "finished" || m.status === "FT",
  ).length;
  const withoutSchedule = matches.filter((m) => !m.fixture_date).length;

  if (seasonQuery.isLoading) {
    return <LoadingBlock compact label="Cargando…" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[21px] font-semibold">
            {season ? seasonLabel(season) : "Temporada"}
          </h2>
          <p className="text-sm text-dx-muted">Datos generales de la edición</p>
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
          { label: "Jornadas", value: roundsQuery.data?.data.length ?? "—" },
          { label: "Partidos", value: matches.length || "—" },
          { label: "Finalizados", value: finished },
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
                  setForm({
                    ...form,
                    status: e.target.value as SeasonStatus,
                  })
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
          {withoutSchedule > 0 ? (
            <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
              ⚠️ {withoutSchedule} partidos sin horario
            </div>
          ) : null}
          {(participantsQuery.data?.data.length ?? 0) > 0 ? (
            <div className="rounded-xl border border-[#c8eadc] bg-[#edf9f4] px-3.5 py-3 text-[13px] text-[#17684d]">
              ✓ Hay participantes asociados
            </div>
          ) : (
            <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
              ⚠️ Sin participantes — agrégalos en la pestaña correspondiente
            </div>
          )}
          {!dirty ? (
            <Button
              variant="secondary"
              onClick={() =>
                void queryClient.invalidateQueries({
                  queryKey: ["admin", "soccer", "season", seasonId],
                })
              }
            >
              Actualizar indicadores
            </Button>
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
