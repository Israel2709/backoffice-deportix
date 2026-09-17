"use client";

import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createF1Team,
  deleteF1Team,
  listAdminF1Teams,
  updateF1Team,
} from "@/lib/api/admin-f1";
import type { F1Team } from "@/lib/api/f1-types";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/capture/field";
import { Note } from "@/components/ui/note";

type TeamForm = { name: string; logo: string };

const emptyForm = (): TeamForm => ({ name: "", logo: "" });

function toForm(team: F1Team): TeamForm {
  return { name: team.name, logo: team.logo ?? "" };
}

export function TeamsMasterPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TeamForm>(emptyForm());

  const teamsQuery = useQuery({
    queryKey: ["admin", "f1", "teams"],
    queryFn: listAdminF1Teams,
  });

  const teams = useMemo(() => {
    const rows = teamsQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((t) => t.name.toLowerCase().includes(q));
  }, [teamsQuery.data, search]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        logo: form.logo.trim() || null,
      };
      if (editingId) return updateF1Team(editingId, payload);
      return createF1Team(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? "Equipo actualizado" : "Equipo creado");
      setCreating(false);
      setEditingId(null);
      setForm(emptyForm());
      void queryClient.invalidateQueries({ queryKey: ["admin", "f1", "teams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteF1Team(id),
    onSuccess: () => {
      toast.success("Equipo eliminado");
      void queryClient.invalidateQueries({ queryKey: ["admin", "f1", "teams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

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
          <Button
            onClick={() => {
              setCreating(true);
              setEditingId(null);
              setForm(emptyForm());
            }}
          >
            + Nuevo equipo
          </Button>
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
                  {team.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={team.logo}
                      alt=""
                      className="max-h-[38px] max-w-[38px] object-contain"
                    />
                  ) : (
                    team.name.slice(0, 3).toUpperCase()
                  )}
                </div>
                <h3 className="text-[17px] font-semibold">{team.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCreating(true);
                    setEditingId(team.id);
                    setForm(toForm(team));
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (
                      confirm(
                        "¿Eliminar este equipo? Fallará si hay pilotos o participantes asociados.",
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
              disabled={saveMutation.isPending || !form.name.trim()}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      ) : null}

      <Note>
        Los equipos se asignan a pilotos y a parejas piloto-equipo en cada
        temporada.
      </Note>
    </div>
  );
}
