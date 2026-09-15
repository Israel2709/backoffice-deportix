"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createDriver,
  deleteDriver,
  listAdminDrivers,
  listAdminF1Teams,
  updateDriver,
} from "@/lib/api/admin-f1";
import { driverDisplayName, type F1Driver } from "@/lib/api/f1-types";
import { Button } from "@/components/ui/button";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { Note } from "@/components/ui/note";

type DriverForm = {
  name: string;
  nationality: string;
  number: string;
  team_id: string;
  photo: string;
};

const emptyForm = (): DriverForm => ({
  name: "",
  nationality: "",
  number: "",
  team_id: "",
  photo: "",
});

function toForm(driver: F1Driver): DriverForm {
  return {
    name: driver.name,
    nationality: driver.nationality ?? "",
    number: driver.number != null ? String(driver.number) : "",
    team_id: driver.team_id ?? "",
    photo: driver.photo ?? "",
  };
}

export function DriversMasterPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<DriverForm>(emptyForm());

  const driversQuery = useQuery({
    queryKey: ["admin", "f1", "drivers"],
    queryFn: () => listAdminDrivers(),
  });
  const teamsQuery = useQuery({
    queryKey: ["admin", "f1", "teams"],
    queryFn: listAdminF1Teams,
  });

  const teamsById = useMemo(() => {
    return new Map((teamsQuery.data?.data ?? []).map((t) => [t.id, t]));
  }, [teamsQuery.data]);

  const drivers = useMemo(() => {
    const rows = driversQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((d) =>
      [d.name, d.nationality, d.number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [driversQuery.data, search]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        nationality: form.nationality.trim(),
        number: form.number ? Number(form.number) : null,
        team_id: form.team_id || null,
        photo: form.photo.trim() || null,
      };
      if (editingId) return updateDriver(editingId, payload);
      return createDriver(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? "Piloto actualizado" : "Piloto creado");
      setCreating(false);
      setEditingId(null);
      setForm(emptyForm());
      void queryClient.invalidateQueries({ queryKey: ["admin", "f1", "drivers"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDriver(id),
    onSuccess: () => {
      toast.success("Piloto eliminado");
      void queryClient.invalidateQueries({ queryKey: ["admin", "f1", "drivers"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Catálogo de pilotos</h2>
          <p className="text-sm text-dx-muted">
            {drivers.length} pilotos · buscar / editar / + nuevo
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
            + Nuevo piloto
          </Button>
        </div>
      </div>

      {driversQuery.isLoading ? (
        <p className="text-sm text-dx-muted">Cargando…</p>
      ) : driversQuery.isError ? (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          {(driversQuery.error as Error).message}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {drivers.map((driver) => {
            const team = driver.team_id ? teamsById.get(driver.team_id) : null;
            return (
              <div
                key={driver.id}
                className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px]"
              >
                <div>
                  <h3 className="text-[17px] font-semibold">
                    {driverDisplayName(driver)}
                    {driver.number != null ? ` #${driver.number}` : ""}
                  </h3>
                  <div className="mt-1 text-[13px] text-dx-muted">
                    {[driver.nationality, team?.name].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCreating(true);
                      setEditingId(driver.id);
                      setForm(toForm(driver));
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (confirm("¿Eliminar este piloto?")) {
                        deleteMutation.mutate(driver.id);
                      }
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creating ? (
        <div className="rounded-2xl border border-dx-line bg-dx-card p-5">
          <h3 className="text-lg font-semibold">
            {editingId ? "Editar piloto" : "Nuevo piloto"}
          </h3>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre">
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Nacionalidad">
              <TextInput
                value={form.nationality}
                onChange={(e) =>
                  setForm({ ...form, nationality: e.target.value })
                }
              />
            </Field>
            <Field label="Dorsal">
              <TextInput
                type="number"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
              />
            </Field>
            <Field label="Equipo">
              <TextSelect
                value={form.team_id}
                onChange={(e) => setForm({ ...form, team_id: e.target.value })}
              >
                <option value="">—</option>
                {(teamsQuery.data?.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Foto (URL)">
              <TextInput
                value={form.photo}
                onChange={(e) => setForm({ ...form, photo: e.target.value })}
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
                !form.name.trim() ||
                !form.nationality.trim()
              }
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      ) : null}

      <Note>
        El equipo del piloto es referencia maestra; en cada temporada se confirma
        la pareja piloto-equipo en Participantes.
      </Note>
    </div>
  );
}
