"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  createCountry,
  createLeague,
  deleteCountry,
  listAdminCountries,
  listAdminLeagues,
  updateCountry,
  updateLeague,
} from "@/lib/api/admin-soccer";
import type { SoccerCountry, SoccerLeague } from "@/lib/api/soccer-types";
import { EditableDataTable } from "@/components/data/editable-data-table";
import { Button } from "@/components/ui/button";
import { TextInput, TextSelect } from "@/components/capture/field";
import { Note } from "@/components/ui/note";
import { Section } from "@/components/ui/page";
import { LoadingBlock } from "@/components/ui/spinner";

const countryColumns = [
  {
    id: "name" as const,
    header: "Nombre",
    placeholder: "Nombre del país",
  },
  {
    id: "code" as const,
    header: "Código",
    placeholder: "MX",
    className: "w-[140px]",
  },
];

const leagueColumns = [
  {
    id: "name" as const,
    header: "Nombre",
    placeholder: "Liga MX",
  },
  {
    id: "name_alt" as const,
    header: "Nombre alt.",
    placeholder: "Opcional",
  },
  {
    id: "country_id" as const,
    header: "País",
    placeholder: "País / ámbito",
  },
  {
    id: "type" as const,
    header: "Tipo",
    placeholder: "League",
    className: "w-[120px]",
  },
  {
    id: "logo" as const,
    header: "Logo (URL)",
    placeholder: "https://…",
  },
];

export function StructureMasterPanel() {
  const queryClient = useQueryClient();
  const [countryName, setCountryName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [leagueNameAlt, setLeagueNameAlt] = useState("");
  const [leagueCountryId, setLeagueCountryId] = useState("");
  const [leagueType, setLeagueType] = useState("League");
  const [leagueLogo, setLeagueLogo] = useState("");
  const [deletingCountryId, setDeletingCountryId] = useState<string | null>(
    null,
  );

  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });
  const leaguesQuery = useQuery({
    queryKey: ["admin", "soccer", "leagues"],
    queryFn: listAdminLeagues,
  });

  const getCountryValues = useCallback((row: SoccerCountry) => {
    return {
      name: row.name ?? "",
      code: row.code ?? "",
    };
  }, []);

  const getLeagueValues = useCallback((row: SoccerLeague) => {
    return {
      name: row.name ?? "",
      name_alt: row.name_alt ?? "",
      country_id: row.country_id ?? row.country_name ?? "",
      type: row.type ?? "League",
      logo: row.logo ?? "",
    };
  }, []);

  const createCountryMutation = useMutation({
    mutationFn: () =>
      createCountry({
        name: countryName.trim(),
        code: countryCode.trim() || null,
      }),
    onSuccess: () => {
      toast.success("País creado");
      setCountryName("");
      setCountryCode("");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "countries"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveCountriesMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      for (const change of changes) {
        const name = change.values.name?.trim() ?? "";
        if (!name) throw new Error("El nombre del país es obligatorio.");
        await updateCountry(change.id, {
          name,
          code: change.values.code?.trim() || null,
        });
      }
    },
    onSuccess: (_data, changes) => {
      toast.success(
        changes.length === 1
          ? "País actualizado"
          : `${changes.length} países actualizados`,
      );
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "countries"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteCountryMutation = useMutation({
    mutationFn: (id: string) => deleteCountry(id),
    onMutate: (id) => setDeletingCountryId(id),
    onSuccess: () => {
      toast.success("País eliminado");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "countries"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setDeletingCountryId(null),
  });

  const createLeagueMutation = useMutation({
    mutationFn: () =>
      createLeague({
        name: leagueName.trim(),
        name_alt: leagueNameAlt.trim() || null,
        country_id: leagueCountryId || null,
        type: leagueType.trim() || "League",
        logo: leagueLogo.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Competición creada");
      setLeagueName("");
      setLeagueNameAlt("");
      setLeagueCountryId("");
      setLeagueType("League");
      setLeagueLogo("");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "leagues"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveLeaguesMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      for (const change of changes) {
        const name = change.values.name?.trim() ?? "";
        if (!name) throw new Error("El nombre de la competición es obligatorio.");
        await updateLeague(change.id, {
          name,
          name_alt: change.values.name_alt?.trim() || null,
          country_id: change.values.country_id?.trim() || null,
          type: change.values.type?.trim() || "League",
          logo: change.values.logo?.trim() || null,
        });
      }
    },
    onSuccess: (_data, changes) => {
      toast.success(
        changes.length === 1
          ? "Competición actualizada"
          : `${changes.length} competiciones actualizadas`,
      );
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "leagues"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const countries = countriesQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <Section title="Países / ámbitos">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_auto]">
          <TextInput
            placeholder="Nombre del país"
            value={countryName}
            onChange={(e) => setCountryName(e.target.value)}
          />
          <TextInput
            placeholder="Código"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          />
          <Button
            disabled={!countryName.trim() || createCountryMutation.isPending}
            onClick={() => createCountryMutation.mutate()}
          >
            + País
          </Button>
        </div>

        {countriesQuery.isLoading ? (
          <LoadingBlock compact label="Cargando países…" />
        ) : countriesQuery.isError ? (
          <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
            {(countriesQuery.error as Error).message}
          </div>
        ) : (
          <EditableDataTable
            columns={countryColumns}
            rows={countries}
            getValues={getCountryValues}
            saving={saveCountriesMutation.isPending}
            deletingId={deletingCountryId}
            emptyLabel="No hay países. Crea uno arriba."
            onSave={(changes) => saveCountriesMutation.mutateAsync(changes)}
            onDelete={(id) => {
              if (
                !window.confirm(
                  "¿Eliminar este país? Solo se permite si no tiene competiciones asociadas.",
                )
              ) {
                return;
              }
              deleteCountryMutation.mutate(id);
            }}
          />
        )}
      </Section>

      <Section title="Competiciones">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_160px_120px_1fr_auto]">
          <TextInput
            placeholder="Nombre"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
          />
          <TextInput
            placeholder="Nombre alt."
            value={leagueNameAlt}
            onChange={(e) => setLeagueNameAlt(e.target.value)}
          />
          <TextSelect
            value={leagueCountryId}
            onChange={(e) => setLeagueCountryId(e.target.value)}
          >
            <option value="">País…</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </TextSelect>
          <TextSelect
            value={leagueType}
            onChange={(e) => setLeagueType(e.target.value)}
          >
            <option value="League">Liga</option>
            <option value="Cup">Copa</option>
            <option value="Friendly">Amistoso</option>
            <option value="Other">Otro</option>
          </TextSelect>
          <TextInput
            placeholder="Logo URL"
            value={leagueLogo}
            onChange={(e) => setLeagueLogo(e.target.value)}
          />
          <Button
            disabled={!leagueName.trim() || createLeagueMutation.isPending}
            onClick={() => createLeagueMutation.mutate()}
          >
            + Competición
          </Button>
        </div>

        {leaguesQuery.isLoading ? (
          <LoadingBlock compact label="Cargando competiciones…" />
        ) : leaguesQuery.isError ? (
          <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
            {(leaguesQuery.error as Error).message}
          </div>
        ) : (
          <EditableDataTable
            columns={leagueColumns}
            rows={leaguesQuery.data?.data ?? []}
            getValues={getLeagueValues}
            saving={saveLeaguesMutation.isPending}
            emptyLabel="No hay competiciones. Crea una arriba."
            onSave={(changes) => saveLeaguesMutation.mutateAsync(changes)}
          />
        )}
      </Section>

      <Note>
        Jerarquía País → Organización → Competición: en esta fase País y
        Competición son editables; la organización intermedia se puede modelar
        después si App QD lo requiere.
      </Note>
    </div>
  );
}
