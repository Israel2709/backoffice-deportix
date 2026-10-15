"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createOrganization,
  deleteOrganization,
  listAdminCountries,
  listAdminOrganizations,
  updateOrganization,
} from "@/lib/api/admin-soccer";
import type { SoccerOrganizationRecord } from "@/lib/api/soccer-types";
import { LogoUrlOrFileField } from "@/components/capture/logo-url-or-file-field";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";

type OrgForm = {
  name: string;
  abbreviation: string;
  countryName: string;
  logo: string;
  logo_alt: string;
};

const emptyForm = (): OrgForm => ({
  name: "",
  abbreviation: "",
  countryName: "",
  logo: "",
  logo_alt: "",
});

function toForm(org: SoccerOrganizationRecord): OrgForm {
  return {
    name: org.name ?? "",
    abbreviation: org.abbreviation ?? "",
    countryName: org.country_name ?? org.country_id ?? "",
    logo: org.logo ?? "",
    logo_alt: org.logo_alt ?? "",
  };
}

export function OrganizationsMasterPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<OrgForm>(emptyForm());

  const orgsQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations"],
    queryFn: () => listAdminOrganizations(),
  });
  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });

  const organizations = useMemo(() => {
    const rows = orgsQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((org) =>
      [org.name, org.abbreviation, org.country_name, org.country_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [orgsQuery.data, search]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        abbreviation: form.abbreviation.trim() || null,
        logo: form.logo.trim() || null,
        logo_alt: form.logo_alt.trim() || null,
        countryName: form.countryName.trim(),
      };
      if (!payload.name) throw new Error("El nombre es obligatorio.");
      if (!payload.countryName && !editingId) {
        throw new Error("El país es obligatorio.");
      }
      if (editingId) {
        return updateOrganization(editingId, {
          name: payload.name,
          abbreviation: payload.abbreviation,
          logo: payload.logo,
          logo_alt: payload.logo_alt,
        });
      }
      return createOrganization(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? "Organización actualizada" : "Organización creada");
      setCreating(false);
      setEditingId(null);
      setForm(emptyForm());
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "organizations"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSuccess: () => {
      toast.success("Organización eliminada");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "organizations"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const showForm = creating || editingId != null;
  const countries = countriesQuery.data?.data ?? [];

  if (orgsQuery.isLoading || countriesQuery.isLoading) {
    return <LoadingBlock label="Cargando organizaciones…" />;
  }

  if (orgsQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(orgsQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar organización o país…"
          className="max-w-sm"
        />
        <Button
          onClick={() => {
            setCreating(true);
            setEditingId(null);
            setForm(emptyForm());
          }}
        >
          + Nueva organización
        </Button>
      </div>

      {showForm ? (
        <div className="rounded-2xl border border-dx-line bg-dx-card p-5 md:p-6">
          <h3 className="text-lg font-semibold text-dx-ink">
            {editingId ? "Editar organización" : "Nueva organización"}
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre">
              <TextInput
                value={form.name}
                placeholder="Liga MX / FMF / CONMEBOL…"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </Field>
            <Field label="Siglas">
              <TextInput
                value={form.abbreviation}
                placeholder="FMF, CONMEBOL, UEFA…"
                onChange={(e) =>
                  setForm({ ...form, abbreviation: e.target.value })
                }
              />
            </Field>
            <Field label="País / ámbito">
              <TextSelect
                value={form.countryName}
                disabled={Boolean(editingId)}
                onChange={(e) =>
                  setForm({ ...form, countryName: e.target.value })
                }
              >
                <option value="">— Selecciona —</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.name}>
                    {country.name}
                    {country.code ? ` (${country.code})` : ""}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <LogoUrlOrFileField
              label="Logo"
              value={form.logo}
              folder="logos/soccer/organizations"
              onChange={(logo) => setForm({ ...form, logo })}
            />
            <LogoUrlOrFileField
              label="Logo alternativo"
              value={form.logo_alt}
              folder="logos/soccer/organizations"
              onChange={(logo_alt) => setForm({ ...form, logo_alt })}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setCreating(false);
                setEditingId(null);
                setForm(emptyForm());
              }}
              disabled={saveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                !form.name.trim() ||
                (!editingId && !form.countryName.trim()) ||
                saveMutation.isPending
              }
              onClick={() => saveMutation.mutate()}
            >
              {editingId ? "Guardar" : "Crear"}
            </Button>
          </div>
          {editingId ? (
            <p className="mt-3 text-[12px] text-dx-muted">
              El país no se edita aquí. Si necesitas moverla de país, créala de
              nuevo o contacta al equipo de datos.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-dx-line bg-dx-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-dx-line bg-[#f7f9fc] text-[12px] font-bold uppercase tracking-wide text-dx-muted">
            <tr>
              <th className="px-4 py-3">Organización</th>
              <th className="px-4 py-3">Siglas</th>
              <th className="px-4 py-3">País</th>
              <th className="px-4 py-3 w-[160px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {organizations.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-dx-muted"
                >
                  No hay organizaciones. Crea la primera arriba.
                </td>
              </tr>
            ) : (
              organizations.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-dx-line last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {org.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={org.logo}
                          alt=""
                          className="h-9 w-9 rounded-lg border border-dx-line object-contain bg-white"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-dx-line bg-[#eef4ff] text-[11px] font-bold text-dx-blue">
                          {(org.abbreviation || org.name).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-dx-ink">
                          {org.name}
                        </div>
                        {org.logo_alt ? (
                          <div className="text-[12px] text-dx-muted">
                            Tiene logo alt.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-dx-muted">
                    {org.abbreviation || "—"}
                  </td>
                  <td className="px-4 py-3 text-dx-muted">
                    {org.country_name ?? org.country_id ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setCreating(false);
                          setEditingId(org.id);
                          setForm(toForm(org));
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `¿Eliminar «${org.name}»? Solo si no tiene competiciones asociadas.`,
                            )
                          ) {
                            return;
                          }
                          deleteMutation.mutate(org.id);
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Note>
        Las organizaciones viven en `sports_organizations`. Al crear una
        competición en Operación o Estructura, el país se toma de la
        organización asignada.
      </Note>
    </div>
  );
}
