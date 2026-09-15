"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createCircuit,
  deleteCircuit,
  listAdminCircuits,
  updateCircuit,
} from "@/lib/api/admin-f1";
import type { F1Circuit } from "@/lib/api/f1-types";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/capture/field";
import { Note } from "@/components/ui/note";

type CircuitForm = {
  name: string;
  country: string;
  city: string;
  image: string;
};

const emptyForm = (): CircuitForm => ({
  name: "",
  country: "",
  city: "",
  image: "",
});

function toForm(circuit: F1Circuit): CircuitForm {
  return {
    name: circuit.name,
    country: circuit.country ?? "",
    city: circuit.city ?? "",
    image: circuit.image ?? "",
  };
}

export function CircuitsMasterPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CircuitForm>(emptyForm());

  const circuitsQuery = useQuery({
    queryKey: ["admin", "f1", "circuits"],
    queryFn: listAdminCircuits,
  });

  const circuits = useMemo(() => {
    const rows = circuitsQuery.data?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) =>
      [c.name, c.country, c.city].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [circuitsQuery.data, search]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        country: form.country.trim(),
        city: form.city.trim() || null,
        image: form.image.trim() || null,
      };
      if (editingId) return updateCircuit(editingId, payload);
      return createCircuit(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? "Circuito actualizado" : "Circuito creado");
      setCreating(false);
      setEditingId(null);
      setForm(emptyForm());
      void queryClient.invalidateQueries({ queryKey: ["admin", "f1", "circuits"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCircuit(id),
    onSuccess: () => {
      toast.success("Circuito eliminado");
      void queryClient.invalidateQueries({ queryKey: ["admin", "f1", "circuits"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Catálogo de circuitos</h2>
          <p className="text-sm text-dx-muted">
            {circuits.length} circuitos · buscar / editar / + nuevo
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
            + Nuevo circuito
          </Button>
        </div>
      </div>

      {circuitsQuery.isLoading ? (
        <p className="text-sm text-dx-muted">Cargando…</p>
      ) : circuitsQuery.isError ? (
        <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
          {(circuitsQuery.error as Error).message}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {circuits.map((circuit) => (
            <div
              key={circuit.id}
              className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px]"
            >
              <div>
                <h3 className="text-[17px] font-semibold">{circuit.name}</h3>
                <div className="mt-1 text-[13px] text-dx-muted">
                  {[circuit.country, circuit.city].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCreating(true);
                    setEditingId(circuit.id);
                    setForm(toForm(circuit));
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm("¿Eliminar este circuito?")) {
                      deleteMutation.mutate(circuit.id);
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
            {editingId ? "Editar circuito" : "Nuevo circuito"}
          </h3>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre">
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="País">
              <TextInput
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </Field>
            <Field label="Ciudad">
              <TextInput
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </Field>
            <Field label="Imagen (URL)">
              <TextInput
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
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
                saveMutation.isPending || !form.name.trim() || !form.country.trim()
              }
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      ) : null}

      <Note>
        Los circuitos se reutilizan en el calendario de cada temporada desde
        Operación Deportiva.
      </Note>
    </div>
  );
}
