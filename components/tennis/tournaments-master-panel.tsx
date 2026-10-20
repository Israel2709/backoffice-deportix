"use client";

import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createEdition,
  listAdminEditions,
  updateEdition,
} from "@/lib/api/admin-tennis";
import { listAdminCountries } from "@/lib/api/admin-soccer";
import {
  EDITION_STATUS_LABEL,
  editionLabel,
  PUBLISH_STATUS_LABEL,
  TOURNAMENT_CATEGORY_LABEL,
  type TennisEdition,
  type TennisEditionStatus,
  type TennisPublishStatus,
  type TennisTournamentCategory,
} from "@/lib/api/tennis-types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { LogoUrlOrFileField } from "@/components/capture/logo-url-or-file-field";
import {
  Field,
  NumberInput,
  TextInput,
  TextSelect,
} from "@/components/capture/field";
import { FilteredSelect } from "@/components/capture/filtered-select";
import { Note } from "@/components/ui/note";
import { PublishStatusRadio } from "@/components/tennis/publish-status-radio";

type TournamentForm = {
  tournament_name: string;
  short_name: string;
  category: TennisTournamentCategory;
  year: number | null;
  gender: "ATP" | "WTA";
  country_code: string;
  city: string;
  image_url: string;
  image_alt_url: string;
  start_date: string;
  end_date: string;
  participants_count: number | null;
  status: TennisEditionStatus;
  publish_status: TennisPublishStatus;
};

function defaultParticipantsCount(category: TennisTournamentCategory): number {
  return category === "grand_slam" ? 128 : 64;
}

const emptyForm = (): TournamentForm => {
  const year = new Date().getFullYear();
  return {
    tournament_name: "",
    short_name: "",
    category: "grand_slam",
    year,
    gender: "ATP",
    country_code: "",
    city: "",
    image_url: "",
    image_alt_url: "",
    start_date: `${year}-01-01`,
    end_date: `${year}-12-31`,
    participants_count: 128,
    status: "upcoming",
    publish_status: "published",
  };
};

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toForm(edition: TennisEdition): TournamentForm {
  return {
    tournament_name: edition.tournament_name,
    short_name: edition.short_name ?? "",
    category: edition.category,
    year: edition.year,
    gender: edition.gender,
    country_code: (edition.country_code ?? "").toUpperCase(),
    city: edition.city ?? "",
    image_url: edition.image_url ?? "",
    image_alt_url: edition.image_alt_url ?? "",
    start_date: toDateInput(edition.start_date),
    end_date: toDateInput(edition.end_date),
    participants_count:
      edition.participants_count ?? defaultParticipantsCount(edition.category),
    status: edition.status,
    publish_status: edition.publish_status,
  };
}

function categoriesForGender(
  gender: "ATP" | "WTA",
): TennisTournamentCategory[] {
  if (gender === "WTA") return ["grand_slam", "wta_1000"];
  return ["grand_slam", "atp_1000"];
}

function statusTone(status: TennisEditionStatus) {
  if (status === "current") return "green" as const;
  if (status === "upcoming") return "amber" as const;
  if (status === "cancelled") return "red" as const;
  return "gray" as const;
}

export function TournamentsMasterPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TournamentForm>(emptyForm());
  const formRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const editionsQuery = useQuery({
    queryKey: ["admin", "tennis", "editions"],
    queryFn: listAdminEditions,
  });
  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });

  useEffect(() => {
    if (!creating) return;
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    nameInputRef.current?.focus();
  }, [creating, editingId]);

  const countryOptions = useMemo(() => {
    const rows = [...(countriesQuery.data?.data ?? [])]
      .filter((country) => Boolean(country.code?.trim()))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return rows.map((country) => ({
      value: country.code!.trim().toUpperCase(),
      label: country.name,
      meta: country.code!.trim().toUpperCase(),
    }));
  }, [countriesQuery.data?.data]);

  const countryNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of countryOptions) {
      map.set(option.value, option.label);
    }
    return map;
  }, [countryOptions]);

  const formCountryOptions = useMemo(() => {
    if (
      !form.country_code ||
      countryOptions.some((option) => option.value === form.country_code)
    ) {
      return countryOptions;
    }
    return [
      ...countryOptions,
      {
        value: form.country_code,
        label: form.country_code,
        meta: form.country_code,
      },
    ];
  }, [countryOptions, form.country_code]);

  const tournaments = useMemo(() => {
    const rows = editionsQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.tournament_name,
        row.short_name,
        row.category,
        row.gender,
        row.country_code,
        row.country_name,
        row.city,
        String(row.year),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [editionsQuery.data, search]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = form.tournament_name.trim();
      const countryCode = form.country_code.trim().toUpperCase();
      if (!name) throw new Error("El nombre del torneo es obligatorio.");
      if (!countryCode) {
        throw new Error("Selecciona el país del torneo.");
      }
      if (!form.start_date || !form.end_date) {
        throw new Error("Indica fecha de inicio y fecha de fin.");
      }
      if (form.end_date < form.start_date) {
        throw new Error("La fecha de fin no puede ser anterior al inicio.");
      }
      const year = form.year;
      if (year == null || !Number.isFinite(year)) {
        throw new Error("Indica el año del torneo.");
      }
      const participantsCount = form.participants_count;
      if (
        participantsCount == null ||
        !Number.isFinite(participantsCount) ||
        participantsCount < 2 ||
        participantsCount > 256
      ) {
        throw new Error(
          "Indica la cantidad de participantes (entre 2 y 256).",
        );
      }

      const payload = {
        tournament_name: name,
        short_name: form.short_name.trim() || null,
        category: form.category,
        year,
        gender: form.gender,
        country_code: countryCode,
        city: form.city.trim() || null,
        image_url: form.image_url.trim() || null,
        image_alt_url: form.image_alt_url.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date,
        participants_count: participantsCount,
        status: form.status,
        publish_status: form.publish_status,
      };

      if (editingId) return updateEdition(editingId, payload);
      return createEdition(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? "Torneo actualizado" : "Torneo creado");
      setCreating(false);
      setEditingId(null);
      setForm(emptyForm());
      void queryClient.invalidateQueries({
        queryKey: ["admin", "tennis", "editions"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Catálogo de torneos</h2>
          <p className="text-sm text-dx-muted">
            {tournaments.length} torneos · alta con categoría, sede y fechas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextInput
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
          <Button
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setForm(emptyForm());
            }}
          >
            + Nuevo torneo
          </Button>
        </div>
      </div>

      {creating ? (
        <div
          ref={formRef}
          className="rounded-2xl border border-dx-line bg-dx-card p-5"
        >
          <h3 className="text-lg font-semibold">
            {editingId ? "Editar torneo" : "Nuevo torneo"}
          </h3>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre">
              <TextInput
                ref={nameInputRef}
                value={form.tournament_name}
                onChange={(e) =>
                  setForm({ ...form, tournament_name: e.target.value })
                }
                placeholder="US Open"
              />
            </Field>
            <Field label="Nombre corto">
              <TextInput
                value={form.short_name}
                onChange={(e) =>
                  setForm({ ...form, short_name: e.target.value })
                }
                placeholder="USO"
              />
            </Field>
            <Field label="Circuito">
              <TextSelect
                value={form.gender}
                onChange={(e) => {
                  const gender = e.target.value as "ATP" | "WTA";
                  const allowed = categoriesForGender(gender);
                  const category = allowed.includes(form.category)
                    ? form.category
                    : allowed[0]!;
                  const prevDefault = defaultParticipantsCount(form.category);
                  setForm({
                    ...form,
                    gender,
                    category,
                    participants_count:
                      form.participants_count === prevDefault
                        ? defaultParticipantsCount(category)
                        : form.participants_count,
                  });
                }}
              >
                <option value="ATP">ATP (varonil)</option>
                <option value="WTA">WTA (femenil)</option>
              </TextSelect>
            </Field>
            <Field label="Categoría">
              <TextSelect
                value={form.category}
                onChange={(e) => {
                  const category = e.target.value as TennisTournamentCategory;
                  const prevDefault = defaultParticipantsCount(form.category);
                  setForm({
                    ...form,
                    category,
                    participants_count:
                      form.participants_count === prevDefault
                        ? defaultParticipantsCount(category)
                        : form.participants_count,
                  });
                }}
              >
                {categoriesForGender(form.gender).map((key) => (
                  <option key={key} value={key}>
                    {TOURNAMENT_CATEGORY_LABEL[key]}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Año">
              <NumberInput
                value={form.year}
                onChange={(year) => setForm({ ...form, year })}
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
                placeholder="128"
              />
            </Field>
            <Field label="País">
              <FilteredSelect
                value={form.country_code}
                options={formCountryOptions}
                placeholder={
                  countriesQuery.isLoading
                    ? "Cargando países…"
                    : "Selecciona un país"
                }
                searchPlaceholder="Buscar país…"
                emptyLabel="Ningún país coincide con la búsqueda."
                disabled={countriesQuery.isLoading}
                onChange={(country_code) =>
                  setForm({ ...form, country_code })
                }
              />
            </Field>
            <Field label="Ciudad">
              <TextInput
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="New York"
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
            <Field label="Estado deportivo">
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
            <LogoUrlOrFileField
              label="Imagen"
              value={form.image_url}
              folder="logos/tennis/tournaments"
              onChange={(image_url) => setForm({ ...form, image_url })}
            />
            <LogoUrlOrFileField
              label="Imagen alternativa"
              value={form.image_alt_url}
              folder="logos/tennis/tournaments"
              onChange={(image_alt_url) => setForm({ ...form, image_alt_url })}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setCreating(false);
                setEditingId(null);
                setForm(emptyForm());
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                saveMutation.isPending ||
                !form.tournament_name.trim() ||
                !form.country_code.trim() ||
                !form.start_date ||
                !form.end_date ||
                form.year == null ||
                form.participants_count == null ||
                form.participants_count < 2
              }
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      ) : null}

      {editionsQuery.isLoading ? (
        <LoadingBlock compact label="Cargando…" />
      ) : editionsQuery.isError ? (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          {(editionsQuery.error as Error).message}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {tournaments.map((tournament) => (
            <div
              key={tournament.id}
              className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px]"
            >
              <div>
                <h3 className="text-[17px] font-semibold">
                  {editionLabel(tournament)}
                </h3>
                <div className="mt-1 text-[13px] text-dx-muted">
                  {[
                    TOURNAMENT_CATEGORY_LABEL[tournament.category],
                    tournament.city,
                    (tournament.country_code &&
                      countryNameByCode.get(
                        tournament.country_code.toUpperCase(),
                      )) ||
                      tournament.country_name ||
                      tournament.country_code,
                    tournament.participants_count != null
                      ? `${tournament.participants_count} participantes`
                      : null,
                    PUBLISH_STATUS_LABEL[tournament.publish_status],
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={statusTone(tournament.status)}>
                  {EDITION_STATUS_LABEL[tournament.status]}
                </StatusBadge>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCreating(true);
                    setEditingId(tournament.id);
                    setForm(toForm(tournament));
                  }}
                >
                  Editar
                </Button>
                <Link
                  href={`/operacion/tenis/${tournament.id}`}
                  className="text-sm text-dx-blue underline"
                >
                  Operar →
                </Link>
              </div>
            </div>
          ))}
          {tournaments.length === 0 ? (
            <p className="text-sm text-dx-muted">No hay torneos todavía.</p>
          ) : null}
        </div>
      )}

      <Note>
        El torneo queda disponible en Operación Deportiva para participantes,
        draw, partidos y publicación. Tipo de evento: individuales (singles).
      </Note>
    </div>
  );
}
