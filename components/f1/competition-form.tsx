"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Field,
  TextInput,
  TextSelect,
} from "@/components/capture/field";
import { FilteredSelect } from "@/components/capture/filtered-select";
import { LogoUrlOrFileField } from "@/components/capture/logo-url-or-file-field";
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
  toCompetitionWriteBody,
  uniqueCompetitionSlug,
  validateCompetitionForm,
  type F1ChampionshipType,
  type F1CompetitionFormValues,
  type F1CompetitionStatus,
} from "@/lib/api/f1-competition";
import { listAdminCountries } from "@/lib/api/admin-soccer";
import { findCountry } from "@/lib/api/soccer-structure";
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

export function CompetitionForm({
  seasonId,
  countryId,
  countryName,
  year,
  competitionId,
}: {
  /** Selected season. Not editable in the form. */
  seasonId: string;
  countryId?: string;
  countryName?: string;
  year?: number;
  competitionId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(competitionId);
  const [form, setForm] = useState<F1CompetitionFormValues>(() => ({
    ...emptyCompetitionForm(),
    countryId: countryId ?? "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const hydrated = useRef(false);

  const backHref = year
    ? `/operacion/formula-1/temporada/${year}`
    : "/operacion/formula-1";

  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });

  const competitionQuery = useQuery({
    queryKey: ["admin", "f1", "competition-document", competitionId],
    queryFn: () => getF1CompetitionDocument(competitionId!),
    enabled: isEdit,
  });

  const countries = useMemo(
    () =>
      [...(countriesQuery.data?.data ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, "es"),
      ),
    [countriesQuery.data?.data],
  );

  const countryOptions = useMemo(
    () =>
      countries.map((country) => ({
        value: country.id,
        label: country.name,
        meta: country.code ?? undefined,
      })),
    [countries],
  );

  const selectedCountry = useMemo(
    () => findCountry(countries, form.countryId),
    [countries, form.countryId],
  );

  useEffect(() => {
    const doc = competitionQuery.data?.data;
    if (!doc || hydrated.current) return;
    const next = competitionToForm(doc);
    if (countryId && !next.countryId) next.countryId = countryId;
    setForm(next);
    hydrated.current = true;
  }, [competitionQuery.data, countryId]);

  useEffect(() => {
    if (!form.countryId || countries.length === 0) return;
    const found = findCountry(countries, form.countryId);
    if (found && found.id !== form.countryId) {
      setForm((current) => ({ ...current, countryId: found.id }));
    }
  }, [countries, form.countryId]);

  useEffect(() => {
    if (isEdit || hydrated.current || !countryId) return;
    const found =
      findCountry(countries, countryId) ??
      (countryName ? findCountry(countries, countryName) : undefined);
    if (found) {
      setForm((current) =>
        current.countryId === found.id
          ? current
          : { ...current, countryId: found.id },
      );
    }
  }, [countries, countryId, countryName, isEdit]);

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
      const resolvedCountry =
        findCountry(countries, form.countryId) ?? selectedCountry;
      if (!resolvedCountry) {
        setErrors((current) => ({
          ...current,
          countryId: "Selecciona un país de la lista.",
        }));
        throw new Error("Selecciona un país de la lista.");
      }
      const countryPayload = {
        countryName: resolvedCountry.name,
        countryId: resolvedCountry.id,
      };
      // Slug is hidden: derived from name + stable competition id suffix.
      const values: F1CompetitionFormValues = {
        ...form,
        slug: uniqueCompetitionSlug(
          form.name,
          isEdit && competitionId ? competitionId : crypto.randomUUID(),
        ),
      };
      if (isEdit && competitionId) {
        return updateF1CompetitionDocument(
          competitionId,
          toCompetitionWriteBody(values, { mode: "update", ...countryPayload }),
        );
      }
      return createF1CompetitionDocument(
        toCompetitionWriteBody(values, {
          mode: "create",
          seasonId,
          ...countryPayload,
        }),
      );
    },
    onSuccess: (result) => {
      const resolvedId =
        findCountry(countries, form.countryId)?.id ?? form.countryId;
      if (resolvedId) {
        linkCompetitionToCountry(result.data.id, resolvedId, year ?? seasonId);
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

  if (countriesQuery.isLoading || (isEdit && competitionQuery.isLoading)) {
    return <LoadingBlock compact label="Cargando competición…" />;
  }

  if (countriesQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(countriesQuery.error as Error).message}
      </div>
    );
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
                onChange={(event) => patch({ name: event.target.value })}
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
            <Field label="País" error={invalid("countryId")}>
              <FilteredSelect
                value={selectedCountry?.id ?? form.countryId}
                options={countryOptions}
                placeholder="Selecciona un país"
                searchPlaceholder="Buscar país…"
                emptyLabel="Ningún país coincide con la búsqueda."
                invalid={Boolean(invalid("countryId"))}
                onChange={(nextCountryId) => patch({ countryId: nextCountryId })}
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
          </div>
        </Section>

        <Section title="Marca">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <LogoUrlOrFileField
              label="Logo"
              value={form.branding.logoUrl}
              folder="logos/formula-1/competitions"
              onChange={(logoUrl) =>
                patch({ branding: { ...form.branding, logoUrl } })
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
