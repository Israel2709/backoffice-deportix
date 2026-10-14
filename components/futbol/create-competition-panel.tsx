"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  createLeague,
  createSeason,
  getAdminOrganization,
  listAdminSeasons,
} from "@/lib/api/admin-soccer";
import {
  isDefaultOrganizationId,
  soccerOrgCompetitionsHref,
  soccerPartidosHref,
} from "@/lib/api/soccer-structure";
import { LogoUrlOrFileField } from "@/components/capture/logo-url-or-file-field";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { LoadingBlock, Spinner } from "@/components/ui/spinner";

export function CreateCompetitionPanel({
  year,
  orgId,
}: {
  year: number;
  orgId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    name_alt: "",
    type: "League",
    logo: "",
  });

  const orgQuery = useQuery({
    queryKey: ["admin", "soccer", "organizations", orgId],
    queryFn: () => getAdminOrganization(orgId),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const org = orgQuery.data?.data;
      const isDefault = isDefaultOrganizationId(orgId);
      const countryId =
        org?.country_id?.trim() || org?.country_name?.trim() || null;
      if (!isDefault && !countryId) {
        throw new Error(
          "La organización no tiene país. Asigna un país en Datos maestros.",
        );
      }

      const created = await createLeague({
        name: form.name.trim(),
        name_alt: form.name_alt.trim() || null,
        country_id: countryId,
        organization_id: isDefault ? null : orgId,
        type: form.type.trim() || "League",
        logo: form.logo.trim() || null,
      });

      const leagueId = created.data.id;
      const { data: seasons } = await listAdminSeasons(leagueId);
      const hasYear = seasons.some((season) => season.year === year);
      if (!hasYear) {
        await createSeason({
          league_id: leagueId,
          year,
          status: "upcoming",
        });
      }

      return { leagueId };
    },
    onSuccess: ({ leagueId }) => {
      toast.success("Competición creada");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "leagues"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "nav-leagues"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "nav-orgs"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "season-years"],
      });
      router.push(soccerPartidosHref(leagueId, year));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canSave =
    form.name.trim().length > 0 &&
    !createMutation.isPending &&
    !orgQuery.isLoading &&
    !orgQuery.isError;

  if (orgQuery.isLoading) {
    return <LoadingBlock label="Cargando formulario…" />;
  }

  if (orgQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(orgQuery.error as Error).message}
      </div>
    );
  }

  const org = orgQuery.data?.data;
  const countryLabel =
    org?.country_name?.trim() || org?.country_id?.trim() || "—";
  const cancelHref = soccerOrgCompetitionsHref(year, orgId);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dx-line bg-dx-card p-5 md:p-6">
        <div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-dx-line bg-[#f7f9fc] px-3.5 py-3 text-[13px] text-dx-muted md:grid-cols-3">
          <div>
            <span className="font-semibold text-dx-ink">Temporada: </span>
            {year}
          </div>
          <div>
            <span className="font-semibold text-dx-ink">Organización: </span>
            {org?.name ?? orgId}
          </div>
          <div>
            <span className="font-semibold text-dx-ink">País: </span>
            {countryLabel}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <Field label="Nombre">
            <TextInput
              value={form.name}
              placeholder="Liga MX"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </Field>
          <Field label="Nombre alternativo">
            <TextInput
              value={form.name_alt}
              placeholder="Opcional"
              onChange={(e) => setForm({ ...form, name_alt: e.target.value })}
            />
          </Field>
          <Field label="Tipo">
            <TextSelect
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="League">Liga</option>
              <option value="Cup">Copa</option>
              <option value="Friendly">Amistoso</option>
              <option value="Other">Otro</option>
            </TextSelect>
          </Field>
          <LogoUrlOrFileField
            value={form.logo}
            folder="logos/soccer/leagues"
            onChange={(logo) => setForm({ ...form, logo })}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push(cancelHref)}
            disabled={createMutation.isPending}
          >
            Cancelar
          </Button>
          <Button disabled={!canSave} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" className="text-white" /> Creando…
              </span>
            ) : (
              "Crear competición"
            )}
          </Button>
        </div>
      </div>

      <Note>
        El país se infiere de la organización. Al crear, se registra la
        temporada {year} y pasarás a Partidos.
      </Note>
    </div>
  );
}
