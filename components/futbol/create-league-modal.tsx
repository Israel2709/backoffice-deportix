"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FilteredSelect } from "@/components/capture/filtered-select";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { LogoUrlOrFileField } from "@/components/capture/logo-url-or-file-field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { listLeagueTypes } from "@/lib/api/admin-catalogs";
import {
  createLeague,
  listAdminOrganizations,
} from "@/lib/api/admin-soccer";

function normalizeLeagueTypeCode(
  raw: string | null | undefined,
  codes: string[],
): string {
  const normalized = (raw ?? "").trim().toLowerCase();
  if (!normalized) return codes[0] ?? "league";
  const match = codes.find((code) => code.toLowerCase() === normalized);
  return match ?? normalized;
}

type FormState = {
  name: string;
  name_alt: string;
  type: string;
  organization_id: string;
  logo: string;
};

function emptyForm(defaultType: string): FormState {
  return {
    name: "",
    name_alt: "",
    type: defaultType,
    organization_id: "",
    logo: "",
  };
}

export function CreateLeagueModal({
  open,
  onClose,
  countryName,
  countryCode,
}: {
  open: boolean;
  onClose: () => void;
  countryName: string;
  countryCode?: string | null;
}) {
  const titleId = useId();
  const queryClient = useQueryClient();

  const orgsQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations"],
    queryFn: () => listAdminOrganizations(),
    enabled: open,
  });

  const leagueTypesQuery = useQuery({
    queryKey: ["admin", "soccer", "catalog", "league-types"],
    queryFn: listLeagueTypes,
    enabled: open,
  });

  const organizations = orgsQuery.data?.data ?? [];
  const leagueTypes = leagueTypesQuery.data?.data ?? [];
  const leagueTypeCodes = useMemo(
    () => leagueTypes.map((item) => item.code),
    [leagueTypes],
  );
  const defaultType = leagueTypeCodes[0] ?? "league";

  const [form, setForm] = useState<FormState>(() => emptyForm(defaultType));

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(defaultType));
  }, [open, defaultType, countryName]);

  const orgOptions = useMemo(
    () =>
      [...organizations]
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((org) => {
          const countryLabel =
            org.country_name?.trim() || org.country_id?.trim() || "";
          const base = org.abbreviation
            ? `${org.name} (${org.abbreviation})`
            : org.name;
          return {
            value: org.id,
            label: countryLabel ? `${base} · ${countryLabel}` : base,
            meta: countryLabel || undefined,
          };
        }),
    [organizations],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      if (!name) throw new Error("El nombre de la liga es obligatorio.");

      const organizationId = form.organization_id.trim() || null;
      const org = organizationId
        ? organizations.find((item) => item.id === organizationId)
        : null;
      const resolvedCountry =
        org?.country_id?.trim() ||
        org?.country_name?.trim() ||
        countryName.trim() ||
        null;

      if (!resolvedCountry) {
        throw new Error("Selecciona un país antes de crear la liga.");
      }

      return createLeague({
        name,
        name_alt: form.name_alt.trim() || null,
        country_id: resolvedCountry,
        organization_id: organizationId,
        type: normalizeLeagueTypeCode(form.type, leagueTypeCodes),
        logo: form.logo.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Liga creada");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "leagues"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "nav-leagues"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "nav-orgs"],
      });
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !createMutation.isPending) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, createMutation.isPending, onClose]);

  const canSave =
    form.name.trim().length > 0 &&
    !createMutation.isPending &&
    !orgsQuery.isLoading &&
    !leagueTypesQuery.isLoading;

  const countryLabel = countryCode?.trim()
    ? `${countryName} (${countryCode.trim()})`
    : countryName;

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-[#0f1c33]/45 backdrop-blur-[1px]"
        disabled={createMutation.isPending}
        onClick={() => {
          if (!createMutation.isPending) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] flex max-h-[min(920px,92vh)] w-full max-w-[720px] flex-col overflow-hidden rounded-[18px] border border-dx-line bg-white shadow-[0_18px_50px_rgba(15,28,51,0.22)]"
      >
        <div className="border-b border-dx-line px-6 py-4">
          <h2
            id={titleId}
            className="text-[18px] font-semibold leading-snug text-dx-ink"
          >
            Nueva liga
          </h2>
          <p className="mt-1 text-[13px] text-dx-muted">
            Alta de liga o torneo para {countryLabel}. Si asignas organización,
            el país se alinea con el de esa organización.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-dx-line bg-[#f7f9fc] px-3.5 py-3 text-[13px] text-dx-muted">
            <span className="font-semibold text-dx-ink">País: </span>
            {countryLabel}
          </div>

          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre">
              <TextInput
                value={form.name}
                placeholder="Liga MX"
                autoFocus
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Nombre alternativo">
              <TextInput
                value={form.name_alt}
                placeholder="Opcional"
                onChange={(e) =>
                  setForm({ ...form, name_alt: e.target.value })
                }
              />
            </Field>
            <Field label="Tipo">
              <TextSelect
                value={normalizeLeagueTypeCode(form.type, leagueTypeCodes)}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {leagueTypes.length === 0 ? (
                  <option value="league">Liga</option>
                ) : (
                  leagueTypes.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))
                )}
              </TextSelect>
            </Field>
            <Field label="Organización">
              <FilteredSelect
                value={form.organization_id}
                options={[
                  { value: "", label: "— Sin asignar —" },
                  ...orgOptions,
                ]}
                placeholder="Organización…"
                searchPlaceholder="Buscar organización…"
                emptyLabel="Ninguna organización coincide."
                onChange={(organization_id) =>
                  setForm({ ...form, organization_id })
                }
              />
            </Field>
            <LogoUrlOrFileField
              value={form.logo}
              folder="logos/soccer/leagues"
              onChange={(logo) => setForm({ ...form, logo })}
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-dx-line px-6 py-4">
          <Button
            type="button"
            variant="secondary"
            disabled={createMutation.isPending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" className="text-white" /> Creando…
              </span>
            ) : (
              "Crear liga"
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
