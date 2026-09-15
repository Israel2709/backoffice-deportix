"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createTeam,
  deleteTeam,
  listAdminCountries,
  listAdminLeagues,
  listAdminTeams,
  updateTeam,
} from "@/lib/api/admin-soccer";
import {
  teamCode,
  teamDisplayName,
  type SoccerTeam,
} from "@/lib/api/soccer-types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { Note } from "@/components/ui/note";

type TeamForm = {
  name: string;
  name_short: string;
  abbreviation: string;
  name_alt: string;
  country_id: string;
  country_name: string;
  league_id: string;
  logo: string;
  status: "active" | "inactive";
};

const emptyForm = (): TeamForm => ({
  name: "",
  name_short: "",
  abbreviation: "",
  name_alt: "",
  country_id: "",
  country_name: "",
  league_id: "",
  logo: "",
  status: "active",
});

function toForm(team: SoccerTeam): TeamForm {
  return {
    name: team.team.name ?? "",
    name_short: team.name_short ?? "",
    abbreviation: team.team.code ?? "",
    name_alt: team.name_alt ?? "",
    country_id: team.country_id ?? "",
    country_name: team.team.country ?? "",
    league_id: team.league_id,
    logo: team.team.logo ?? "",
    status: team.status ?? "active",
  };
}

export function TeamsMasterPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TeamForm>(emptyForm());

  const teamsQuery = useQuery({
    queryKey: ["admin", "soccer", "teams"],
    queryFn: () => listAdminTeams(),
  });
  const leaguesQuery = useQuery({
    queryKey: ["admin", "soccer", "leagues"],
    queryFn: listAdminLeagues,
  });
  const countriesQuery = useQuery({
    queryKey: ["admin", "soccer", "countries"],
    queryFn: listAdminCountries,
  });

  const teams = useMemo(() => {
    const rows = teamsQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((team) => {
      const hay = [
        teamDisplayName(team),
        team.name_short,
        team.team.code,
        team.team.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [teamsQuery.data, search]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        name_short: form.name_short.trim(),
        abbreviation: form.abbreviation.trim(),
        name_alt: form.name_alt.trim() || null,
        country_id: form.country_id || null,
        country_name: form.country_name.trim() || null,
        league_id: form.league_id,
        logo: form.logo.trim() || null,
        status: form.status,
      };
      if (editingId) {
        return updateTeam(editingId, payload);
      }
      return createTeam(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? "Equipo actualizado" : "Equipo creado");
      setCreating(false);
      setEditingId(null);
      setForm(emptyForm());
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "teams"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: (result) => {
      if (result && "message" in result && result.message) {
        toast.message(result.message);
      } else {
        toast.success("Equipo eliminado");
      }
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "teams"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function openCreate() {
    setCreating(true);
    setEditingId(null);
    const firstLeague = leaguesQuery.data?.data[0]?.id ?? "";
    setForm({ ...emptyForm(), league_id: firstLeague });
  }

  function openEdit(team: SoccerTeam) {
    setCreating(true);
    setEditingId(team.id);
    setForm(toForm(team));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Catálogo de equipos</h2>
          <p className="text-sm text-dx-muted">
            {teams.length} equipos · buscar / editar / + nuevo
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextInput
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px]"
          />
          <Button onClick={openCreate}>+ Nuevo equipo</Button>
        </div>
      </div>

      {teamsQuery.isLoading ? (
        <p className="text-sm text-dx-muted">Cargando…</p>
      ) : teamsQuery.isError ? (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          {(teamsQuery.error as Error).message}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px]"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-[46px] w-[46px] items-center justify-center overflow-hidden rounded-xl border border-dx-line bg-white text-[10px] font-black text-dx-blue">
                  {team.team.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={team.team.logo}
                      alt=""
                      className="max-h-[38px] max-w-[38px] object-contain"
                    />
                  ) : (
                    teamCode(team).slice(0, 3)
                  )}
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold">
                    {teamDisplayName(team)}
                  </h3>
                  <div className="mt-1 text-[13px] text-dx-muted">
                    {[team.name_short, teamCode(team), team.team.country]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  tone={team.status === "inactive" ? "gray" : "green"}
                >
                  {team.status === "inactive" ? "Inactivo" : "Activo"}
                </StatusBadge>
                <Button variant="secondary" onClick={() => openEdit(team)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (
                      confirm(
                        "¿Eliminar o inactivar este equipo? Si tiene histórico se inactivará.",
                      )
                    ) {
                      deleteMutation.mutate(team.id);
                    }
                  }}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating ? (
        <div className="rounded-2xl border border-dx-line bg-dx-card p-5">
          <h3 className="text-lg font-semibold">
            {editingId ? "Editar equipo" : "Nuevo equipo"}
          </h3>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre oficial">
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Nombre corto">
              <TextInput
                value={form.name_short}
                onChange={(e) =>
                  setForm({ ...form, name_short: e.target.value })
                }
              />
            </Field>
            <Field label="Abreviatura">
              <TextInput
                value={form.abbreviation}
                onChange={(e) =>
                  setForm({ ...form, abbreviation: e.target.value })
                }
              />
            </Field>
            <Field label="Nombre alternativo">
              <TextInput
                value={form.name_alt}
                onChange={(e) =>
                  setForm({ ...form, name_alt: e.target.value })
                }
              />
            </Field>
            <Field label="País">
              <TextSelect
                value={form.country_id}
                onChange={(e) => {
                  const country = countriesQuery.data?.data.find(
                    (c) => c.id === e.target.value,
                  );
                  setForm({
                    ...form,
                    country_id: e.target.value,
                    country_name: country?.name ?? "",
                  });
                }}
              >
                <option value="">—</option>
                {(countriesQuery.data?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Estado">
              <TextSelect
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as "active" | "inactive",
                  })
                }
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </TextSelect>
            </Field>
            <Field label="Competición de referencia">
              <TextSelect
                value={form.league_id}
                onChange={(e) =>
                  setForm({ ...form, league_id: e.target.value })
                }
              >
                <option value="">Selecciona…</option>
                {(leaguesQuery.data?.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Logo (URL)">
              <TextInput
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
                placeholder="https://…"
              />
            </Field>
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
                !form.name ||
                !form.name_short ||
                !form.abbreviation ||
                !form.league_id
              }
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      ) : null}

      <Note>
        El equipo se crea una sola vez y se asocia a temporadas desde Operación
        Deportiva. Logos por URL (upload de archivo llega después).
      </Note>
    </div>
  );
}
