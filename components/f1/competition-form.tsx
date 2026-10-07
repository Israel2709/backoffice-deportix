"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Field,
  TextArea,
  TextInput,
  TextSelect,
} from "@/components/capture/field";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { LoadingBlock, Spinner } from "@/components/ui/spinner";
import {
  createF1CompetitionDocument,
  getF1CompetitionDocument,
  updateF1CompetitionDocument,
} from "@/lib/api/admin-f1";
import {
  F1_CHAMPIONSHIP_TYPE_LABEL,
  F1_COMPETITION_STATUS_LABEL,
  competitionToForm,
  emptyCompetitionForm,
  slugifyCompetitionName,
  toCompetitionWriteBody,
  validateCompetitionForm,
  type F1ChampionshipType,
  type F1CompetitionFormValues,
  type F1CompetitionStatus,
} from "@/lib/api/f1-competition";
import { linkCompetitionToCountry } from "@/lib/f1-competition-countries";
import { cn } from "@/lib/utils";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3.5">
      <h2 className="text-[15px] font-semibold text-dx-ink">{title}</h2>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-[10px] border border-[#d7dee9] bg-white px-3 py-3">
      <span>
        <span className="block text-sm font-semibold text-dx-ink">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-xs text-dx-muted">{hint}</span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-dx-blue"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const pickerValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#133569";
  return (
    <Field label={label} error={error}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={pickerValue}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-11 w-12 cursor-pointer rounded-[9px] border border-[#d7dee9] bg-white p-1"
        />
        <TextInput
          value={value}
          placeholder="#RRGGBB"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          className={cn("flex-1", error && "border-[#f04438]")}
        />
      </div>
    </Field>
  );
}

export function CompetitionForm({
  seasonId,
  countryId,
  year,
  competitionId,
}: {
  /** Selected season. Not editable in the form. */
  seasonId: string;
  countryId?: string;
  year?: number;
  competitionId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(competitionId);
  const [form, setForm] = useState<F1CompetitionFormValues>(emptyCompetitionForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const slugEdited = useRef(false);
  const hydrated = useRef(false);

  const backHref =
    countryId && year
      ? `/operacion/formula-1/pais/${encodeURIComponent(countryId)}/temporada/${year}`
      : countryId
        ? `/operacion/formula-1/pais/${encodeURIComponent(countryId)}`
        : "/operacion/formula-1";

  const competitionQuery = useQuery({
    queryKey: ["admin", "f1", "competition-document", competitionId],
    queryFn: () => getF1CompetitionDocument(competitionId!),
    enabled: isEdit,
  });

  useEffect(() => {
    const doc = competitionQuery.data?.data;
    if (!doc || hydrated.current) return;
    setForm(competitionToForm(doc));
    slugEdited.current = true;
    hydrated.current = true;
  }, [competitionQuery.data]);

  function patch(partial: Partial<F1CompetitionFormValues>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  useEffect(() => {
    if (!submitted) return;
    setErrors(validateCompetitionForm(form));
  }, [form, submitted]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fieldErrors = validateCompetitionForm(form);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        throw new Error("Revisa los campos marcados.");
      }
      if (!isEdit && !seasonId.trim()) {
        throw new Error("Falta la temporada seleccionada.");
      }
      if (isEdit && competitionId) {
        return updateF1CompetitionDocument(
          competitionId,
          toCompetitionWriteBody(form, { mode: "update" }),
        );
      }
      return createF1CompetitionDocument(
        toCompetitionWriteBody(form, { mode: "create", seasonId }),
      );
    },
    onSuccess: (result) => {
      if (!isEdit && countryId) {
        linkCompetitionToCountry(result.data.id, countryId);
      }
      toast.success(isEdit ? "Competición actualizada" : "Competición creada");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "competitions"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "competition-document", result.data.id],
      });
      router.push(backHref);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isEdit && competitionQuery.isLoading) {
    return <LoadingBlock compact label="Cargando competición…" />;
  }

  if (isEdit && competitionQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(competitionQuery.error as Error).message}
      </div>
    );
  }

  const invalid = (key: string) => errors[key];

  return (
    <div className="space-y-4">
      <form
        className="space-y-8 rounded-2xl border border-dx-line bg-dx-card p-5 md:p-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          const fieldErrors = validateCompetitionForm(form);
          setErrors(fieldErrors);
          if (Object.keys(fieldErrors).length > 0) {
            toast.error("Revisa los campos marcados.");
            return;
          }
          saveMutation.mutate();
        }}
      >
        <Section title="Identidad">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre" error={invalid("name")}>
              <TextInput
                value={form.name}
                placeholder="Mexico Grand Prix"
                autoFocus={!isEdit}
                className={cn(invalid("name") && "border-[#f04438]")}
                onChange={(event) => {
                  const name = event.target.value;
                  patch({
                    name,
                    slug: slugEdited.current
                      ? form.slug
                      : slugifyCompetitionName(name),
                  });
                }}
              />
            </Field>
            <Field label="Nombre corto" error={invalid("shortName")}>
              <TextInput
                value={form.shortName}
                placeholder="GP México"
                onChange={(event) => patch({ shortName: event.target.value })}
              />
            </Field>
            <Field label="Nombre oficial" error={invalid("officialName")}>
              <TextInput
                value={form.officialName}
                placeholder="Formula 1 Gran Premio de México"
                onChange={(event) =>
                  patch({ officialName: event.target.value })
                }
              />
            </Field>
            <Field label="Slug" error={invalid("slug")}>
              <TextInput
                value={form.slug}
                placeholder="mexico-grand-prix"
                spellCheck={false}
                className={cn(invalid("slug") && "border-[#f04438]")}
                onChange={(event) => {
                  slugEdited.current = true;
                  patch({ slug: event.target.value });
                }}
              />
            </Field>
          </div>
        </Section>

        <Section title="Competición">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Tipo de campeonato">
              <TextSelect
                value={form.championshipType}
                onChange={(event) =>
                  patch({
                    championshipType: event.target.value as F1ChampionshipType,
                  })
                }
              >
                {(
                  Object.entries(F1_CHAMPIONSHIP_TYPE_LABEL) as Array<
                    [F1ChampionshipType, string]
                  >
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Estado">
              <TextSelect
                value={form.status}
                onChange={(event) =>
                  patch({ status: event.target.value as F1CompetitionStatus })
                }
              >
                {(
                  Object.entries(F1_COMPETITION_STATUS_LABEL) as Array<
                    [F1CompetitionStatus, string]
                  >
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Fecha de inicio" error={invalid("startDate")}>
              <TextInput
                type="date"
                value={form.startDate}
                onChange={(event) => patch({ startDate: event.target.value })}
              />
            </Field>
            <Field label="Fecha de fin" error={invalid("endDate")}>
              <TextInput
                type="date"
                value={form.endDate}
                className={cn(invalid("endDate") && "border-[#f04438]")}
                onChange={(event) => patch({ endDate: event.target.value })}
              />
            </Field>
            <Field label="Número de rondas" error={invalid("rounds")}>
              <TextInput
                type="number"
                min={1}
                step={1}
                value={form.rounds}
                className={cn(invalid("rounds") && "border-[#f04438]")}
                onChange={(event) =>
                  patch({ rounds: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Sistema de puntos">
              <TextInput
                value={form.pointsSystemId}
                placeholder="Identificador del sistema de puntos"
                onChange={(event) =>
                  patch({ pointsSystemId: event.target.value })
                }
              />
            </Field>
          </div>
        </Section>

        <Section title="Clasificaciones">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ToggleRow
              label="Campeonato de pilotos"
              checked={form.classifications.drivers}
              onChange={(drivers) =>
                patch({
                  classifications: { ...form.classifications, drivers },
                })
              }
            />
            <ToggleRow
              label="Campeonato de constructores"
              checked={form.classifications.constructors}
              onChange={(constructors) =>
                patch({
                  classifications: { ...form.classifications, constructors },
                })
              }
            />
          </div>
        </Section>

        <Section title="Sprint">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <ToggleRow
              label="Sprint habilitado"
              checked={form.sprint.enabled}
              onChange={(enabled) =>
                patch({ sprint: { ...form.sprint, enabled } })
              }
            />
            {form.sprint.enabled ? (
              <Field label="Rondas sprint" error={invalid("sprint.rounds")}>
                <TextInput
                  type="number"
                  min={1}
                  step={1}
                  value={form.sprint.rounds}
                  className={cn(invalid("sprint.rounds") && "border-[#f04438]")}
                  onChange={(event) =>
                    patch({
                      sprint: {
                        ...form.sprint,
                        rounds: Number(event.target.value),
                      },
                    })
                  }
                />
              </Field>
            ) : null}
          </div>
        </Section>

        <Section title="Parrilla">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Máximo de equipos" error={invalid("grid.maxTeams")}>
              <TextInput
                type="number"
                min={1}
                step={1}
                value={form.grid.maxTeams > 0 ? form.grid.maxTeams : ""}
                placeholder="Opcional"
                className={cn(invalid("grid.maxTeams") && "border-[#f04438]")}
                onChange={(event) => {
                  const raw = event.target.value;
                  patch({
                    grid: {
                      ...form.grid,
                      maxTeams: raw === "" ? 0 : Number(raw),
                    },
                  });
                }}
              />
            </Field>
            <Field
              label="Pilotos por equipo"
              error={invalid("grid.driversPerTeam")}
            >
              <TextInput
                type="number"
                min={1}
                step={1}
                value={
                  form.grid.driversPerTeam > 0 ? form.grid.driversPerTeam : ""
                }
                placeholder="Opcional"
                className={cn(
                  invalid("grid.driversPerTeam") && "border-[#f04438]",
                )}
                onChange={(event) => {
                  const raw = event.target.value;
                  patch({
                    grid: {
                      ...form.grid,
                      driversPerTeam: raw === "" ? 0 : Number(raw),
                    },
                  });
                }}
              />
            </Field>
          </div>
        </Section>

        <Section title="Marca">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Logo (URL)" className="md:col-span-2">
              <TextInput
                value={form.branding.logoUrl}
                placeholder="https://…"
                onChange={(event) =>
                  patch({
                    branding: { ...form.branding, logoUrl: event.target.value },
                  })
                }
              />
            </Field>
            <ColorField
              label="Color primario"
              value={form.branding.primaryColor}
              error={invalid("branding.primaryColor")}
              onChange={(primaryColor) =>
                patch({ branding: { ...form.branding, primaryColor } })
              }
            />
            <ColorField
              label="Color secundario"
              value={form.branding.secondaryColor}
              error={invalid("branding.secondaryColor")}
              onChange={(secondaryColor) =>
                patch({ branding: { ...form.branding, secondaryColor } })
              }
            />
          </div>
        </Section>

        <Section title="Publicación">
          <div className="grid grid-cols-1 gap-3.5">
            <Field label="Sitio oficial" error={invalid("website")}>
              <TextInput
                value={form.website}
                placeholder="https://"
                className={cn(invalid("website") && "border-[#f04438]")}
                onChange={(event) => patch({ website: event.target.value })}
              />
            </Field>
            <Field label="Descripción">
              <TextArea
                value={form.description}
                rows={4}
                onChange={(event) => patch({ description: event.target.value })}
              />
            </Field>
            <ToggleRow
              label="Activa"
              hint="Las competiciones inactivas siguen en la temporada, pero no se operan."
              checked={form.active}
              onChange={(active) => patch({ active })}
            />
          </div>
        </Section>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push(backHref)}
            disabled={saveMutation.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" className="text-white" /> Guardando…
              </span>
            ) : isEdit ? (
              "Guardar cambios"
            ) : (
              "Crear competición"
            )}
          </Button>
        </div>
      </form>

      <Note>
        Los participantes se administran después, en la subcolección entries de
        esta competición. Este formulario no incluye escuderías ni pilotos.
      </Note>
    </div>
  );
}
