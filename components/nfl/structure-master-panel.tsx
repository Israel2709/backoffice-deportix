"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  createCountry,
  createLeague,
  listAdminCountries,
  listAdminLeagues,
  updateLeague,
} from "@/lib/api/admin-nfl";
import type { NflLeague } from "@/lib/api/nfl-types";
import { Button } from "@/components/ui/button";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { Note } from "@/components/ui/note";
import { ListRow, Section } from "@/components/ui/page";

export function StructureMasterPanel() {
  const queryClient = useQueryClient();
  const [countryName, setCountryName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [leagueForm, setLeagueForm] = useState({
    name: "",
    name_alt: "",
    country_id: "",
    logo: "",
  });
  const [editingLeague, setEditingLeague] = useState<NflLeague | null>(null);

  const countriesQuery = useQuery({
    queryKey: ["admin", "nfl", "countries"],
    queryFn: listAdminCountries,
  });
  const leaguesQuery = useQuery({
    queryKey: ["admin", "nfl", "leagues"],
    queryFn: listAdminLeagues,
  });

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
        queryKey: ["admin", "nfl", "countries"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveLeagueMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: leagueForm.name.trim(),
        name_alt: leagueForm.name_alt.trim() || null,
        country_id: leagueForm.country_id || null,
        logo: leagueForm.logo.trim() || null,
      };
      if (editingLeague) {
        return updateLeague(editingLeague.id, payload);
      }
      return createLeague(payload);
    },
    onSuccess: () => {
      toast.success(
        editingLeague ? "Competición actualizada" : "Competición creada",
      );
      setEditingLeague(null);
      setLeagueForm({ name: "", name_alt: "", country_id: "", logo: "" });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "nfl", "leagues"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

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
        <div className="flex flex-col gap-2.5">
          {(countriesQuery.data?.data ?? []).map((country) => (
            <ListRow
              key={country.id}
              title={country.name}
              meta={country.code ?? undefined}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Competiciones"
        action={
          <Button
            onClick={() => {
              setEditingLeague(null);
              setLeagueForm({
                name: "",
                name_alt: "",
                country_id: countriesQuery.data?.data[0]?.id ?? "",
                logo: "",
              });
            }}
          >
            + Nueva competición
          </Button>
        }
      >
        <div className="mb-4 flex flex-col gap-2.5">
          {(leaguesQuery.data?.data ?? []).map((league) => (
            <div
              key={league.id}
              className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px]"
            >
              <div>
                <div className="font-bold">{league.name}</div>
                <div className="mt-1 text-[13px] text-dx-muted">
                  {league.name_alt || league.type}
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingLeague(league);
                  setLeagueForm({
                    name: league.name,
                    name_alt: league.name_alt ?? "",
                    country_id: league.country_id ?? "",
                    logo: league.logo ?? "",
                  });
                }}
              >
                Editar
              </Button>
            </div>
          ))}
        </div>

        {(editingLeague !== null ||
          leagueForm.name ||
          leagueForm.country_id) && (
          <div className="rounded-2xl border border-dx-line bg-dx-card p-5">
            <h3 className="text-lg font-semibold">
              {editingLeague ? "Editar competición" : "Nueva competición"}
            </h3>
            <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <Field label="Nombre">
                <TextInput
                  value={leagueForm.name}
                  onChange={(e) =>
                    setLeagueForm({ ...leagueForm, name: e.target.value })
                  }
                />
              </Field>
              <Field label="Nombre alternativo">
                <TextInput
                  value={leagueForm.name_alt}
                  onChange={(e) =>
                    setLeagueForm({ ...leagueForm, name_alt: e.target.value })
                  }
                />
              </Field>
              <Field label="País / ámbito">
                <TextSelect
                  value={leagueForm.country_id}
                  onChange={(e) =>
                    setLeagueForm({
                      ...leagueForm,
                      country_id: e.target.value,
                    })
                  }
                >
                  <option value="">—</option>
                  {(countriesQuery.data?.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </TextSelect>
              </Field>
              <Field label="Logo (URL)">
                <TextInput
                  value={leagueForm.logo}
                  onChange={(e) =>
                    setLeagueForm({ ...leagueForm, logo: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingLeague(null);
                  setLeagueForm({
                    name: "",
                    name_alt: "",
                    country_id: "",
                    logo: "",
                  });
                }}
              >
                Cancelar
              </Button>
              <Button
                disabled={
                  !leagueForm.name.trim() || saveLeagueMutation.isPending
                }
                onClick={() => saveLeagueMutation.mutate()}
              >
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Note>
        Jerarquía País → Competición NFL. Ejemplo: Estados Unidos → NFL.
      </Note>
    </div>
  );
}
