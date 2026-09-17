"use client";

import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createTeam,
  deleteTeam,
  listAdminLeagues,
  listAdminTeams,
  updateTeam,
} from "@/lib/api/admin-nfl";
import {
  teamAbbrev,
  teamCity,
  teamDisplayName,
  type NflTeam,
} from "@/lib/api/nfl-types";
import { Button } from "@/components/ui/button";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { Note } from "@/components/ui/note";

type TeamForm = {
  name: string;
  city: string;
  league_id: string;
  logo: string;
  conference: string;
  division: string;
};

const emptyForm = (): TeamForm => ({
  name: "",
  city: "",
  league_id: "",
  logo: "",
  conference: "",
  division: "",
});

function toForm(team: NflTeam): TeamForm {
  return {
    name: team.team.name ?? "",
    city: team.team.city ?? "",
    league_id: team.league_id,
    logo: team.team.logo ?? "",
    conference: team.conference ?? "",
    division: team.division ?? "",
  };
}

export function TeamsMasterPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TeamForm>(emptyForm());

  const teamsQuery = useQuery({
    queryKey: ["admin", "nfl", "teams"],
    queryFn: () => listAdminTeams(),
  });
  const leaguesQuery = useQuery({
    queryKey: ["admin", "nfl", "leagues"],
    queryFn: listAdminLeagues,
  });

  const teams = useMemo(() => {
    const rows = teamsQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((team) => {
      const hay = [
        teamDisplayName(team),
        team.team.city,
        team.conference,
        team.division,
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
        city: form.city.trim() || null,
        league_id: form.league_id,
        logo: form.logo.trim() || null,
        conference: form.conference.trim() || null,
        division: form.division.trim() || null,
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
        queryKey: ["admin", "nfl", "teams"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTeam(id),
    onSuccess: () => {
      toast.success("Equipo eliminado");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "nfl", "teams"],
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

  function openEdit(team: NflTeam) {
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
        <LoadingBlock compact label="Cargando…" />
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
                    teamAbbrev(team)
                  )}
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold">
                    {teamDisplayName(team)}
                  </h3>
                  <div className="mt-1 text-[13px] text-dx-muted">
                    {[teamCity(team), team.conference, team.division]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => openEdit(team)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (
                      confirm(
                        "¿Eliminar este equipo? Solo es posible si no tiene histórico.",
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
            <Field label="Nombre">
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Ciudad">
              <TextInput
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </Field>
            <Field label="Conferencia">
              <TextInput
                value={form.conference}
                onChange={(e) =>
                  setForm({ ...form, conference: e.target.value })
                }
                placeholder="AFC / NFC"
              />
            </Field>
            <Field label="División">
              <TextInput
                value={form.division}
                onChange={(e) =>
                  setForm({ ...form, division: e.target.value })
                }
                placeholder="East / West / North / South"
              />
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
                saveMutation.isPending || !form.name || !form.league_id
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
