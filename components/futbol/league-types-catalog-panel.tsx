"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Field, TextInput } from "@/components/capture/field";
import { EditableDataTable } from "@/components/data/editable-data-table";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { LoadingBlock } from "@/components/ui/spinner";
import {
  createLeagueType,
  deleteLeagueType,
  listLeagueTypes,
  updateLeagueType,
  type CatalogLeagueType,
} from "@/lib/api/admin-catalogs";

export function LeagueTypesCatalogPanel() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const typesQuery = useQuery({
    queryKey: ["admin", "soccer", "catalog", "league-types"],
    queryFn: listLeagueTypes,
  });

  const rows = useMemo(() => {
    const data = typesQuery.data?.data ?? [];
    return data.map((item) => ({ ...item, id: item.code }));
  }, [typesQuery.data]);

  const columns = useMemo(
    () => [
      {
        id: "code",
        header: "Código",
        editable: false,
        className: "w-[180px]",
      },
      {
        id: "label",
        header: "Etiqueta",
        placeholder: "Liga",
      },
    ],
    [],
  );

  const getValues = useCallback(
    (row: CatalogLeagueType & { id: string }) => ({
      code: row.code,
      label: row.label,
    }),
    [],
  );

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: ["admin", "soccer", "catalog", "league-types"],
    });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      createLeagueType({
        code: code.trim(),
        label: label.trim(),
      }),
    onSuccess: () => {
      toast.success("Tipo creado");
      setCode("");
      setLabel("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveMutation = useMutation({
    mutationFn: async (
      changes: Array<{ id: string; values: Record<string, string> }>,
    ) => {
      for (const change of changes) {
        const nextLabel = change.values.label?.trim() ?? "";
        if (!nextLabel) throw new Error("La etiqueta es obligatoria.");
        await updateLeagueType(change.id, { label: nextLabel });
      }
    },
    onSuccess: (_data, changes) => {
      toast.success(
        changes.length === 1
          ? "Tipo actualizado"
          : `${changes.length} tipos actualizados`,
      );
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLeagueType(id),
    onMutate: (id) => setDeletingId(id),
    onSuccess: () => {
      toast.success("Tipo eliminado");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setDeletingId(null),
  });

  if (typesQuery.isLoading) {
    return <LoadingBlock compact label="Cargando tipos…" />;
  }

  if (typesQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(typesQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Field label="Código">
          <TextInput
            value={code}
            placeholder="league"
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
        <Field label="Etiqueta">
          <TextInput
            value={label}
            placeholder="Liga"
            onChange={(e) => setLabel(e.target.value)}
          />
        </Field>
        <div className="flex items-end">
          <Button
            disabled={
              !code.trim() || !label.trim() || createMutation.isPending
            }
            onClick={() => createMutation.mutate()}
          >
            + Tipo
          </Button>
        </div>
      </div>

      <EditableDataTable
        columns={columns}
        rows={rows}
        getValues={getValues}
        saving={saveMutation.isPending}
        deletingId={deletingId}
        onSave={(changes) => saveMutation.mutateAsync(changes)}
        onDelete={(id) => {
          if (
            !window.confirm(
              `¿Eliminar el tipo «${id}»? Las ligas que ya lo usan pueden fallar al editarse hasta que les asignes otro tipo.`,
            )
          ) {
            return;
          }
          deleteMutation.mutate(id);
        }}
        emptyLabel="No hay tipos. Crea league y cup arriba si el catálogo está vacío."
        filterPlaceholder="Filtrar tipos…"
      />

      <Note>
        El código se usa en la API (`league`, `cup`, …). La etiqueta es lo que
        verás en los selectores del Back Office. Este catálogo alimenta Ligas /
        torneos y Estructura deportiva.
      </Note>
    </div>
  );
}
