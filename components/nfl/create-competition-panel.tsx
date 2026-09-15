"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  createLeague,
  listAdminCountries,
} from "@/lib/api/admin-nfl";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";

export function CreateCompetitionPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    name_alt: "",
    country_id: "",
    type: "League",
    logo: "",
  });

  const countriesQuery = useQuery({
    queryKey: ["admin", "nfl", "countries"],
    queryFn: listAdminCountries,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createLeague({
        name: form.name.trim(),
        name_alt: form.name_alt.trim() || null,
        country_id: form.country_id || null,
        type: form.type.trim() || "League",
        logo: form.logo.trim() || null,
      }),
    onSuccess: (result) => {
      toast.success("Competición creada");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "nfl", "leagues"],
      });
      router.push(`/operacion/football-americano/${result.data.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canSave = form.name.trim().length > 0 && !createMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dx-line bg-dx-card p-5 md:p-6">
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <Field label="Nombre">
            <TextInput
              value={form.name}
              placeholder="NFL"
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
          <Field label="País / ámbito">
            <TextSelect
              value={form.country_id}
              onChange={(e) =>
                setForm({ ...form, country_id: e.target.value })
              }
            >
              <option value="">— Sin país —</option>
              {(countriesQuery.data?.data ?? []).map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                  {country.code ? ` (${country.code})` : ""}
                </option>
              ))}
            </TextSelect>
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
          <Field label="Logo (URL)" className="md:col-span-2">
            <TextInput
              value={form.logo}
              placeholder="https://…"
              onChange={(e) => setForm({ ...form, logo: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push("/operacion/football-americano")}
            disabled={createMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            disabled={!canSave}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Creando…" : "Crear competición"}
          </Button>
        </div>
      </div>

      <Note>
        Al crear la competición pasarás a operar sus temporadas. Los países se
        administran en Datos Maestros · Football Americano · Estructura.
      </Note>
    </div>
  );
}
