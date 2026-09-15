"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listRounds, replaceRounds } from "@/lib/api/admin-nfl";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { Field, TextInput } from "@/components/capture/field";
import { StickyActions } from "@/components/capture/sticky-actions";

type RoundRow = {
  name: string;
  position: number;
  phase: string;
};

export function SeasonStructurePanel({ seasonId }: { seasonId: string }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<RoundRow[]>([]);
  const [baseline, setBaseline] = useState("[]");
  const [phaseName, setPhaseName] = useState("Temporada Regular");
  const [generateCount, setGenerateCount] = useState(18);

  const roundsQuery = useQuery({
    queryKey: ["admin", "nfl", "rounds", seasonId],
    queryFn: () => listRounds(seasonId),
  });

  useEffect(() => {
    const next = (roundsQuery.data?.data ?? []).map((r) => ({
      name: r.name,
      position: r.position,
      phase: r.phase ?? "Temporada Regular",
    }));
    setRows(next);
    setBaseline(JSON.stringify(next));
  }, [roundsQuery.data]);

  const dirty = JSON.stringify(rows) !== baseline;
  useDirtyGuard(dirty);

  const saveMutation = useMutation({
    mutationFn: () =>
      replaceRounds(
        seasonId,
        rows.map((r) => ({
          name: r.name,
          position: r.position,
          phase: r.phase || null,
        })),
      ),
    onSuccess: () => {
      toast.success("Estructura guardada");
      setBaseline(JSON.stringify(rows));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "nfl", "rounds", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function generateWeeks() {
    const generated = Array.from({ length: generateCount }, (_, i) => ({
      name: `Semana ${i + 1}`,
      position: i + 1,
      phase: phaseName || "Temporada Regular",
    }));
    setRows(generated);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Estructura</h2>
          <p className="text-sm text-dx-muted">
            Fases y semanas · no es obligatorio precrear toda la estructura
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Fase">
            <TextInput
              value={phaseName}
              onChange={(e) => setPhaseName(e.target.value)}
            />
          </Field>
          <Field label="Semanas">
            <TextInput
              type="number"
              min={1}
              max={40}
              value={generateCount}
              onChange={(e) => setGenerateCount(Number(e.target.value))}
              className="w-24"
            />
          </Field>
          <Button variant="secondary" onClick={generateWeeks}>
            Generar semanas
          </Button>
          <Button
            onClick={() =>
              setRows((prev) => [
                ...prev,
                {
                  name: `Semana ${prev.length + 1}`,
                  position: prev.length + 1,
                  phase: phaseName || "Temporada Regular",
                },
              ])
            }
          >
            + Semana
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-dx-line bg-white">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-[#f8fafc] text-xs tracking-wide text-[#667085] uppercase">
              <th className="border-b border-dx-line px-3 py-2.5">#</th>
              <th className="border-b border-dx-line px-3 py-2.5">Nombre</th>
              <th className="border-b border-dx-line px-3 py-2.5">Fase</th>
              <th className="border-b border-dx-line px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.position}-${index}`}>
                <td className="border-b border-dx-line px-3 py-2 font-bold">
                  {row.position}
                </td>
                <td className="border-b border-dx-line px-3 py-2">
                  <TextInput
                    value={row.name}
                    onChange={(e) => {
                      const next = [...rows];
                      next[index] = { ...row, name: e.target.value };
                      setRows(next);
                    }}
                  />
                </td>
                <td className="border-b border-dx-line px-3 py-2">
                  <TextInput
                    value={row.phase}
                    onChange={(e) => {
                      const next = [...rows];
                      next[index] = { ...row, phase: e.target.value };
                      setRows(next);
                    }}
                  />
                </td>
                <td className="border-b border-dx-line px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setRows((prev) =>
                        prev
                          .filter((_, i) => i !== index)
                          .map((r, i) => ({ ...r, position: i + 1 })),
                      )
                    }
                  >
                    Quitar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Note>
        Ejemplo NFL: Temporada Regular → Semana 1…18; Playoffs → Wild Card,
        Divisional, Conference, Super Bowl.
      </Note>

      <StickyActions
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel="Guardar estructura"
        onDiscard={() => setRows(JSON.parse(baseline) as RoundRow[])}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}
