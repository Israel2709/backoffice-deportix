"use client";

import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAdminEdition,
  listEditionMatches,
  listEditionParticipants,
  updateEdition,
} from "@/lib/api/admin-tennis";
import {
  EDITION_STATUS_LABEL,
  editionLabel,
  PUBLISH_STATUS_LABEL,
  type TennisEditionStatus,
  type TennisPublishStatus,
} from "@/lib/api/tennis-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { KpiGrid } from "@/components/ui/kpi-grid";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { StickyActions } from "@/components/capture/sticky-actions";

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function EditionGeneralPanel({ editionId }: { editionId: string }) {
  const queryClient = useQueryClient();
  const editionQuery = useQuery({
    queryKey: ["admin", "tennis", "edition", editionId],
    queryFn: () => getAdminEdition(editionId),
  });
  const participantsQuery = useQuery({
    queryKey: ["admin", "tennis", "participants", editionId],
    queryFn: () => listEditionParticipants(editionId),
  });
  const matchesQuery = useQuery({
    queryKey: ["admin", "tennis", "matches", editionId],
    queryFn: () => listEditionMatches(editionId),
  });

  const [form, setForm] = useState({
    tournament_name: "",
    year: new Date().getFullYear(),
    gender: "ATP" as "ATP" | "WTA" | "mixed",
    status: "upcoming" as TennisEditionStatus,
    publish_status: "draft" as TennisPublishStatus,
    start_date: "",
    end_date: "",
  });
  const [baseline, setBaseline] = useState("");

  useEffect(() => {
    const edition = editionQuery.data?.data;
    if (!edition) return;
    const next = {
      tournament_name: edition.tournament_name,
      year: edition.year,
      gender: edition.gender,
      status: edition.status,
      publish_status: edition.publish_status,
      start_date: toDateInput(edition.start_date),
      end_date: toDateInput(edition.end_date),
    };
    setForm(next);
    setBaseline(JSON.stringify(next));
  }, [editionQuery.data]);

  const dirty = JSON.stringify(form) !== baseline;
  useDirtyGuard(dirty);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateEdition(editionId, {
        tournament_name: form.tournament_name.trim(),
        year: Number(form.year),
        gender: form.gender,
        status: form.status,
        publish_status: form.publish_status,
        start_date: form.start_date
          ? new Date(form.start_date).toISOString()
          : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      }),
    onSuccess: () => {
      toast.success("Edición actualizada");
      setBaseline(JSON.stringify(form));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "tennis", "edition", editionId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const edition = editionQuery.data?.data;
  const matches = matchesQuery.data?.data ?? [];
  const finished = matches.filter((m) => m.status === "finished").length;

  if (editionQuery.isLoading) {
    return <LoadingBlock compact label="Cargando…" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[21px] font-semibold">
            {edition ? editionLabel(edition) : "Edición"}
          </h2>
          <p className="text-sm text-dx-muted">Datos generales del torneo</p>
        </div>
        {edition ? (
          <div className="flex gap-2">
            <StatusBadge
              tone={
                edition.status === "current"
                  ? "green"
                  : edition.status === "upcoming"
                    ? "amber"
                    : "gray"
              }
            >
              {EDITION_STATUS_LABEL[edition.status]}
            </StatusBadge>
            <StatusBadge tone="gray">
              {PUBLISH_STATUS_LABEL[edition.publish_status]}
            </StatusBadge>
          </div>
        ) : null}
      </div>

      <KpiGrid
        items={[
          {
            label: "Participantes",
            value: participantsQuery.data?.data.length ?? "—",
          },
          { label: "Partidos", value: matches.length || "—" },
          { label: "Finalizados", value: finished },
          { label: "Año", value: edition?.year ?? "—" },
        ]}
      />

      <div className="rounded-2xl border border-dx-line bg-dx-card p-5">
        <h3 className="font-semibold">Datos generales</h3>
        <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <Field label="Torneo">
            <TextInput
              value={form.tournament_name}
              onChange={(e) =>
                setForm({ ...form, tournament_name: e.target.value })
              }
            />
          </Field>
          <Field label="Año">
            <TextInput
              type="number"
              value={form.year}
              onChange={(e) =>
                setForm({ ...form, year: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Género">
            <TextSelect
              value={form.gender}
              onChange={(e) =>
                setForm({
                  ...form,
                  gender: e.target.value as "ATP" | "WTA" | "mixed",
                })
              }
            >
              <option value="ATP">ATP</option>
              <option value="WTA">WTA</option>
              <option value="mixed">Mixed</option>
            </TextSelect>
          </Field>
          <Field label="Estado">
            <TextSelect
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as TennisEditionStatus,
                })
              }
            >
              <option value="upcoming">Próxima</option>
              <option value="current">Vigente</option>
              <option value="finished">Finalizada</option>
              <option value="cancelled">Cancelada</option>
            </TextSelect>
          </Field>
          <Field label="Publicación">
            <TextSelect
              value={form.publish_status}
              onChange={(e) =>
                setForm({
                  ...form,
                  publish_status: e.target.value as TennisPublishStatus,
                })
              }
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicada</option>
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
