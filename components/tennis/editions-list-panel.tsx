"use client";

import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  createEdition,
  deleteEdition,
  listAdminEditions,
  updateEdition,
} from "@/lib/api/admin-tennis";
import {
  EDITION_STATUS_LABEL,
  editionLabel,
  PUBLISH_STATUS_LABEL,
  type TennisEditionStatus,
  type TennisPublishStatus,
} from "@/lib/api/tennis-types";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Field,
  NumberInput,
  TextInput,
  TextSelect,
} from "@/components/capture/field";
import { PublishStatusRadio } from "@/components/tennis/publish-status-radio";

function statusTone(status: TennisEditionStatus) {
  if (status === "current") return "green" as const;
  if (status === "upcoming") return "amber" as const;
  if (status === "cancelled") return "red" as const;
  return "gray" as const;
}

function publishTone(status: TennisPublishStatus) {
  return status === "published" ? ("green" as const) : ("gray" as const);
}

export function EditionsListPanel() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [form, setForm] = useState<{
    tournament_name: string;
    year: number | null;
    gender: "ATP" | "WTA";
    status: TennisEditionStatus;
    publish_status: TennisPublishStatus;
    participants_count: number | null;
    start_date: string;
    end_date: string;
  }>({
    tournament_name: "",
    year: new Date().getFullYear(),
    gender: "ATP",
    status: "upcoming",
    publish_status: "published",
    participants_count: 128,
    start_date: "",
    end_date: "",
  });

  const editionsQuery = useQuery({
    queryKey: ["admin", "tennis", "editions"],
    queryFn: listAdminEditions,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (form.year == null) throw new Error("Indica el año del torneo.");
      return createEdition({
        tournament_name: form.tournament_name.trim(),
        year: form.year,
        gender: form.gender,
        status: form.status,
        publish_status: form.publish_status,
        participants_count: form.participants_count,
        start_date: form.start_date
          ? new Date(form.start_date).toISOString()
          : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      });
    },
    onSuccess: () => {
      toast.success("Edición creada");
      setShowForm(false);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "tennis", "editions"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const publishMutation = useMutation({
    mutationFn: ({
      id,
      publish_status,
    }: {
      id: string;
      publish_status: TennisPublishStatus;
    }) => updateEdition(id, { publish_status }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.publish_status === "published"
          ? "Torneo publicado"
          : "Torneo en borrador",
      );
      void queryClient.invalidateQueries({
        queryKey: ["admin", "tennis", "editions"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEdition(id),
    onSuccess: () => {
      toast.success("Torneo eliminado");
      setPendingDelete(null);
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
              <div
                key={edition.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px]"
              >
                <Link
                  href={`/operacion/tenis/${edition.id}`}
                  className="min-w-0 flex-1 hover:opacity-90"
                >
                  <div className="font-bold">{editionLabel(edition)}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(edition.status)}>
                      {EDITION_STATUS_LABEL[edition.status]}
                    </StatusBadge>
                    <StatusBadge tone={publishTone(edition.publish_status)}>
                      {PUBLISH_STATUS_LABEL[edition.publish_status]}
                    </StatusBadge>
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  <PublishStatusRadio
                    compact
                    name={`publish-${edition.id}`}
                    disabled={
                      publishMutation.isPending &&
                      publishMutation.variables?.id === edition.id
                    }
                    value={edition.publish_status}
                    onChange={(publish_status) =>
                      publishMutation.mutate({
                        id: edition.id,
                        publish_status,
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    title="Eliminar torneo"
                    aria-label={`Eliminar ${editionLabel(edition)}`}
                    disabled={deleteMutation.isPending}
                    className="h-9 w-9 justify-center px-0 py-0 text-dx-red hover:bg-[#fef3f2]"
                    onClick={() =>
                      setPendingDelete({
                        id: edition.id,
                        label: editionLabel(edition),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Link
                    href={`/operacion/tenis/${edition.id}`}
                    className="text-2xl text-[#8090a8] hover:text-dx-ink"
                    aria-label={`Abrir ${editionLabel(edition)}`}
                  >
                    →
                  </Link>
                </div>
              </div>
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
                  <div
                    key={edition.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-dx-line py-2 last:border-0"
                  >
                    <Link
                      href={`/operacion/tenis/${edition.id}`}
                      className="text-sm text-dx-blue underline"
                    >
                      {editionLabel(edition)} ·{" "}
                      {EDITION_STATUS_LABEL[edition.status]} ·{" "}
                      {PUBLISH_STATUS_LABEL[edition.publish_status]}
                    </Link>
                    <div className="flex items-center gap-2">
                      <PublishStatusRadio
                        compact
                        name={`publish-${edition.id}`}
                        disabled={
                          publishMutation.isPending &&
                          publishMutation.variables?.id === edition.id
                        }
                        value={edition.publish_status}
                        onChange={(publish_status) =>
                          publishMutation.mutate({
                            id: edition.id,
                            publish_status,
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        title="Eliminar torneo"
                        aria-label={`Eliminar ${editionLabel(edition)}`}
                        disabled={deleteMutation.isPending}
                        className="h-9 w-9 justify-center px-0 py-0 text-dx-red hover:bg-[#fef3f2]"
                        onClick={() =>
                          setPendingDelete({
                            id: edition.id,
                            label: editionLabel(edition),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </>
      )}

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Eliminar torneo"
        description={
          pendingDelete
            ? `¿Eliminar «${pendingDelete.label}» de la base de datos? Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        confirmingLabel="Eliminando…"
        confirming={deleteMutation.isPending}
        onCancel={() => {
          if (!deleteMutation.isPending) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
      />

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
              <NumberInput
                value={form.year}
                onChange={(year) => setForm({ ...form, year })}
              />
            </Field>
            <Field label="Género">
              <TextSelect
                value={form.gender}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gender: e.target.value as "ATP" | "WTA",
                  })
                }
              >
                <option value="ATP">ATP (varonil)</option>
                <option value="WTA">WTA (femenil)</option>
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
              <PublishStatusRadio
                value={form.publish_status}
                onChange={(publish_status) =>
                  setForm({ ...form, publish_status })
                }
              />
            </Field>
            <Field label="Cantidad de participantes">
              <NumberInput
                min={2}
                max={256}
                value={form.participants_count}
                onChange={(participants_count) =>
                  setForm({ ...form, participants_count })
                }
              />
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
