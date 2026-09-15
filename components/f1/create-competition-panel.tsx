"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createCompetition } from "@/lib/api/admin-f1";
import { Field, TextInput } from "@/components/capture/field";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";

export function CreateCompetitionPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    logo: "",
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createCompetition({
        name: form.name.trim(),
        logo: form.logo.trim() || null,
      }),
    onSuccess: (result) => {
      toast.success("Competición creada");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "competitions"],
      });
      router.push(`/operacion/formula-1/${result.data.id}`);
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
              placeholder="Formula 1"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </Field>
          <Field label="Logo (URL)">
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
            onClick={() => router.push("/operacion/formula-1")}
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
        Al crear la competición pasarás a operar sus temporadas: participantes,
        calendario y clasificaciones.
      </Note>
    </div>
  );
}
