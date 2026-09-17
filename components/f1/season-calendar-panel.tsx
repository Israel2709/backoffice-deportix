"use client";
import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createRace,
  deleteRace,
  getAdminF1Season,
  listAdminCircuits,
  listSeasonRaces,
  updateRace,
} from "@/lib/api/admin-f1";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { Field, TextInput, TextSelect } from "@/components/capture/field";
import { StickyActions } from "@/components/capture/sticky-actions";

type RaceRow = {
  id?: string;
  circuit_id: string;
  name: string;
  race_date: string;
  status: string;
};

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function SeasonCalendarPanel({
  seasonId,
  competitionId,
}: {
  seasonId: string;
  competitionId: string;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<RaceRow[]>([]);
  const [baseline, setBaseline] = useState("[]");
  const [showCreate, setShowCreate] = useState(false);
  const [newRace, setNewRace] = useState<RaceRow>({
    circuit_id: "",
    name: "",
    race_date: "",
    status: "Scheduled",
  });

  const seasonQuery = useQuery({
    queryKey: ["admin", "f1", "season", seasonId],
    queryFn: () => getAdminF1Season(seasonId),
  });
  const racesQuery = useQuery({
    queryKey: ["admin", "f1", "races", seasonId],
    queryFn: () => listSeasonRaces(seasonId),
  });
  const circuitsQuery = useQuery({
    queryKey: ["admin", "f1", "circuits"],
    queryFn: listAdminCircuits,
  });

  const circuitsById = useMemo(
    () => new Map((circuitsQuery.data?.data ?? []).map((c) => [c.id, c])),
    [circuitsQuery.data],
  );

  useEffect(() => {
    const next = (racesQuery.data?.data ?? []).map((r) => ({
      id: r.id,
      circuit_id: r.circuit_id,
      name: r.name ?? "",
      race_date: toDateInput(r.race_date),
      status: r.status,
    }));
    setRows(next);
    setBaseline(JSON.stringify(next));
  }, [racesQuery.data]);

  const dirty = JSON.stringify(rows) !== baseline;
  useDirtyGuard(dirty);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const baselineRows = JSON.parse(baseline) as RaceRow[];
      const baselineIds = new Set(
        baselineRows.filter((r) => r.id).map((r) => r.id!),
      );
      const currentIds = new Set(
        rows.filter((r) => r.id).map((r) => r.id!),
      );

      for (const id of baselineIds) {
        if (!currentIds.has(id)) {
          await deleteRace(id);
        }
      }

      for (const row of rows) {
        const raceDate = row.race_date
          ? new Date(row.race_date).toISOString()
          : null;
        if (!raceDate) {
          throw new Error("Todas las carreras requieren fecha.");
        }
        if (row.id) {
          await updateRace(row.id, {
            circuit_id: row.circuit_id,
            name: row.name.trim() || null,
            race_date: raceDate,
            status: row.status,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Calendario guardado");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "races", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!newRace.circuit_id || !newRace.race_date) {
        throw new Error("Circuito y fecha son requeridos.");
      }
      return createRace({
        competition_id: competitionId,
        season_id: seasonId,
        circuit_id: newRace.circuit_id,
        race_date: new Date(newRace.race_date).toISOString(),
        name: newRace.name.trim() || null,
        status: newRace.status,
      });
    },
    onSuccess: () => {
      toast.success("Carrera creada");
      setShowCreate(false);
      setNewRace({
        circuit_id: "",
        name: "",
        race_date: "",
        status: "Scheduled",
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "races", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function updateRow(index: number, patch: Partial<RaceRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  if (racesQuery.isLoading || circuitsQuery.isLoading) {
    return <LoadingBlock label="Cargando calendario…" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Calendario</h2>
          <p className="text-sm text-dx-muted">
            {rows.length} carreras · temporada {seasonQuery.data?.data.year ?? "—"}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Nueva carrera</Button>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-dx-line bg-white">
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
              <th className="border-b border-dx-line px-3 py-2.5">GP</th>
              <th className="border-b border-dx-line px-3 py-2.5">Circuito</th>
              <th className="border-b border-dx-line px-3 py-2.5">Fecha</th>
              <th className="border-b border-dx-line px-3 py-2.5">Estado</th>
              <th className="border-b border-dx-line px-3 py-2.5">Resultados</th>
              <th className="border-b border-dx-line px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const circuit = circuitsById.get(row.circuit_id);
              return (
                <tr key={row.id ?? `new-${index}`}>
                  <td className="border-b border-dx-line px-3 py-2">
                    <TextInput
                      value={row.name}
                      onChange={(e) =>
                        updateRow(index, { name: e.target.value })
                      }
                      placeholder={circuit?.name ?? "GP"}
                      className="min-w-[140px]"
                    />
                  </td>
                  <td className="border-b border-dx-line px-3 py-2">
                    <TextSelect
                      value={row.circuit_id}
                      onChange={(e) =>
                        updateRow(index, { circuit_id: e.target.value })
                      }
                    >
                      <option value="">—</option>
                      {(circuitsQuery.data?.data ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </TextSelect>
                  </td>
                  <td className="border-b border-dx-line px-3 py-2">
                    <TextInput
                      type="date"
                      value={row.race_date}
                      onChange={(e) =>
                        updateRow(index, { race_date: e.target.value })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-3 py-2">
                    <TextSelect
                      value={row.status}
                      onChange={(e) =>
                        updateRow(index, { status: e.target.value })
                      }
                    >
                      <option value="Scheduled">Programada</option>
                      <option value="Live">En curso</option>
                      <option value="Completed">Finalizada</option>
                      <option value="Cancelled">Cancelada</option>
                    </TextSelect>
                  </td>
                  <td className="border-b border-dx-line px-3 py-2">
                    {row.id ? (
                      <Link
                        href={`/operacion/formula-1/${competitionId}/${seasonId}/carreras/${row.id}`}
                        className="text-dx-blue underline"
                      >
                        Capturar
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border-b border-dx-line px-3 py-2">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setRows((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      Quitar
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate ? (
        <div className="rounded-2xl border border-dx-line bg-dx-card p-5">
          <h3 className="text-lg font-semibold">Nueva carrera</h3>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <Field label="Nombre GP">
              <TextInput
                value={newRace.name}
                onChange={(e) =>
                  setNewRace({ ...newRace, name: e.target.value })
                }
              />
            </Field>
            <Field label="Circuito">
              <TextSelect
                value={newRace.circuit_id}
                onChange={(e) =>
                  setNewRace({ ...newRace, circuit_id: e.target.value })
                }
              >
                <option value="">Selecciona…</option>
                {(circuitsQuery.data?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Fecha">
              <TextInput
                type="date"
                value={newRace.race_date}
                onChange={(e) =>
                  setNewRace({ ...newRace, race_date: e.target.value })
                }
              />
            </Field>
            <Field label="Estado">
              <TextSelect
                value={newRace.status}
                onChange={(e) =>
                  setNewRace({ ...newRace, status: e.target.value })
                }
              >
                <option value="Scheduled">Programada</option>
                <option value="Live">En curso</option>
                <option value="Completed">Finalizada</option>
                <option value="Cancelled">Cancelada</option>
              </TextSelect>
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Crear carrera
            </Button>
          </div>
        </div>
      ) : null}

      <Note>
        Edita filas existentes y guarda. Las carreras nuevas se crean con el
        formulario; los resultados se capturan en la columna Resultados.
      </Note>

      <StickyActions
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel="Guardar calendario"
        onDiscard={() => setRows(JSON.parse(baseline) as RaceRow[])}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}
