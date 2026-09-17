"use client";

import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { createEdition, listAdminEditions } from "@/lib/api/admin-tennis";
import {
  EDITION_STATUS_LABEL,
  editionLabel,
  PUBLISH_STATUS_LABEL,
  type TennisEditionStatus,
  type TennisPublishStatus,
} from "@/lib/api/tennis-types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field, TextInput, TextSelect } from "@/components/capture/field";

function statusTone(status: TennisEditionStatus) {
  if (status === "current") return "green" as const;
  if (status === "upcoming") return "amber" as const;
  if (status === "cancelled") return "red" as const;
  return "gray" as const;
}

export function EditionsListPanel() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    tournament_name: "",
    year: new Date().getFullYear(),
    gender: "ATP" as "ATP" | "WTA" | "mixed",
    status: "upcoming" as TennisEditionStatus,
    publish_status: "draft" as TennisPublishStatus,
    start_date: "",
    end_date: "",
  });

  const editionsQuery = useQuery({
    queryKey: ["admin", "tennis", "editions"],
    queryFn: listAdminEditions,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createEdition({
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
      toast.success("Edición creada");
      setShowForm(false);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "tennis", "editions"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const editions = editionsQuery.data?.data ?? [];
  const active = editions.filter(
    (e) => e.status === "current" || e.status === "upcoming",
  );
  const historic = editions.filter(
    (e) => e.status === "finished" || e.status === "cancelled",
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Ediciones</h2>
          <p className="text-sm text-dx-muted">
            Torneos vigentes y próximos primero
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nueva edición</Button>
      </div>

      {editionsQuery.isLoading ? (
        <LoadingBlock compact label="Cargando…" />
      ) : editionsQuery.isError ? (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          {(editionsQuery.error as Error).message}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {active.map((edition) => (
              <Link
                key={edition.id}
                href={`/operacion/tenis/${edition.id}`}
                className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px] hover:border-[#becae0]"
              >
                <div>
                  <div className="font-bold">{editionLabel(edition)}</div>
                  <div className="mt-1 text-[13px] text-dx-muted">
                    {PUBLISH_STATUS_LABEL[edition.publish_status]}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge tone={statusTone(edition.status)}>
                    {EDITION_STATUS_LABEL[edition.status]}
                  </StatusBadge>
                  <span className="text-2xl text-[#8090a8]">→</span>
                </div>
              </Link>
            ))}
            {active.length === 0 ? (
              <p className="text-sm text-dx-muted">
                No hay ediciones vigentes/próximas.
              </p>
            ) : null}
          </div>

          {historic.length > 0 ? (
            <details className="rounded-xl border border-dx-line bg-white p-4">
              <summary className="cursor-pointer font-semibold">
                Consultar ediciones anteriores ({historic.length})
              </summary>
              <div className="mt-3 flex flex-col gap-2">
                {historic.map((edition) => (
                  <Link
                    key={edition.id}
                    href={`/operacion/tenis/${edition.id}`}
                    className="text-sm text-dx-blue underline"
                  >
                    {editionLabel(edition)} ·{" "}
                    {EDITION_STATUS_LABEL[edition.status]}
                  </Link>
                ))}
              </div>
            </details>
          ) : null}
        </>
      )}

      {showForm ? (
        <div className="rounded-2xl border border-dx-line bg-dx-card p-5">
          <h3 className="text-lg font-semibold">Nueva edición</h3>
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
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                createMutation.isPending || !form.tournament_name.trim()
              }
              onClick={() => createMutation.mutate()}
            >
              Crear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
