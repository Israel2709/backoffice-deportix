"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createPlayer,
  deletePlayer,
  listAdminPlayers,
  updatePlayer,
} from "@/lib/api/admin-tennis";
import {
  playerDisplayName,
  type TennisPlayer,
  type TennisPlayerStatus,
} from "@/lib/api/tennis-types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { Note } from "@/components/ui/note";

type PlayerForm = {
  name: string;
  display_name: string;
  country_code: string;
  country_name: string;
  photo_url: string;
  status: TennisPlayerStatus;
};

const emptyForm = (): PlayerForm => ({
  name: "",
  display_name: "",
  country_code: "",
  country_name: "",
  photo_url: "",
  status: "active",
});

function toForm(player: TennisPlayer): PlayerForm {
  return {
    name: player.name,
    display_name: player.display_name ?? "",
    country_code: player.country_code ?? "",
    country_name: player.country_name ?? "",
    photo_url: player.photo_url ?? "",
    status: player.status,
  };
}

export function PlayersMasterPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PlayerForm>(emptyForm());

  const playersQuery = useQuery({
    queryKey: ["admin", "tennis", "players"],
    queryFn: () => listAdminPlayers(),
  });

  const players = useMemo(() => {
    const rows = playersQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) =>
      [p.name, p.display_name, p.country_name, p.country_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [playersQuery.data, search]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        display_name: form.display_name.trim() || null,
        country_code: form.country_code.trim() || null,
        country_name: form.country_name.trim() || null,
        photo_url: form.photo_url.trim() || null,
        status: form.status,
      };
      if (editingId) return updatePlayer(editingId, payload);
      return createPlayer(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? "Jugador actualizado" : "Jugador creado");
      setCreating(false);
      setEditingId(null);
      setForm(emptyForm());
      void queryClient.invalidateQueries({
        queryKey: ["admin", "tennis", "players"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlayer(id),
    onSuccess: (result) => {
      if (result && "message" in result && result.message) {
        toast.message(result.message);
      } else {
        toast.success("Jugador eliminado");
      }
      void queryClient.invalidateQueries({
        queryKey: ["admin", "tennis", "players"],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Catálogo de jugadores</h2>
          <p className="text-sm text-dx-muted">
            {players.length} jugadores · buscar / editar / + nuevo
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
            + Nuevo jugador
          </Button>
        </div>
      </div>

      {playersQuery.isLoading ? (
        <p className="text-sm text-dx-muted">Cargando…</p>
      ) : playersQuery.isError ? (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          {(playersQuery.error as Error).message}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px]"
            >
              <div>
                <h3 className="text-[17px] font-semibold">
                  {playerDisplayName(player)}
                </h3>
                <div className="mt-1 text-[13px] text-dx-muted">
                  {[player.country_name, player.country_code]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  tone={player.status === "inactive" ? "gray" : "green"}
                >
                  {player.status === "inactive" ? "Inactivo" : "Activo"}
                </StatusBadge>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCreating(true);
                    setEditingId(player.id);
                    setForm(toForm(player));
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (
                      confirm(
                        "¿Eliminar o inactivar este jugador? Si tiene histórico se inactivará.",
                      )
                    ) {
                      deleteMutation.mutate(player.id);
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
            {editingId ? "Editar jugador" : "Nuevo jugador"}
          </h3>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre">
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Nombre para mostrar">
              <TextInput
                value={form.display_name}
                onChange={(e) =>
                  setForm({ ...form, display_name: e.target.value })
                }
              />
            </Field>
            <Field label="País">
              <TextInput
                value={form.country_name}
                onChange={(e) =>
                  setForm({ ...form, country_name: e.target.value })
                }
              />
            </Field>
            <Field label="Código país">
              <TextInput
                value={form.country_code}
                onChange={(e) =>
                  setForm({ ...form, country_code: e.target.value })
                }
                placeholder="MEX"
              />
            </Field>
            <Field label="Estado">
              <TextSelect
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as TennisPlayerStatus,
                  })
                }
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </TextSelect>
            </Field>
            <Field label="Foto (URL)">
              <TextInput
                value={form.photo_url}
                onChange={(e) =>
                  setForm({ ...form, photo_url: e.target.value })
                }
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
        Los jugadores se asocian a ediciones de torneo desde Operación Deportiva.
      </Note>
    </div>
  );
}
