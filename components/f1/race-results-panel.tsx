"use client";
import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getRace,
  listAdminDrivers,
  listAdminF1Teams,
  listF1Participants,
  listRaceResults,
  replaceRaceResults,
} from "@/lib/api/admin-f1";
import {
  driverDisplayName,
  F1_RESULT_STATUS_LABEL,
  type F1ResultStatus,
} from "@/lib/api/f1-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { StickyActions } from "@/components/capture/sticky-actions";
import { TextSelect } from "@/components/capture/field";
import { cn } from "@/lib/utils";

type ResultRow = {
  driver_id: string;
  team_id: string;
  position: number;
  points: number;
  status: F1ResultStatus;
};

const inputClass =
  "mx-auto max-w-[74px] rounded-[7px] border border-[#d9e0ea] bg-white px-2 py-1.5 text-center text-[13px]";

export function RaceResultsPanel({
  raceId,
  seasonId,
}: {
  raceId: string;
  seasonId: string;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [baseline, setBaseline] = useState("[]");

  const raceQuery = useQuery({
    queryKey: ["admin", "f1", "race", raceId],
    queryFn: () => getRace(raceId),
  });
  const resultsQuery = useQuery({
    queryKey: ["admin", "f1", "race-results", raceId],
    queryFn: () => listRaceResults(raceId),
  });
  const participantsQuery = useQuery({
    queryKey: ["admin", "f1", "participants", seasonId],
    queryFn: () => listF1Participants(seasonId),
  });
  const driversQuery = useQuery({
    queryKey: ["admin", "f1", "drivers"],
    queryFn: () => listAdminDrivers(),
  });
  const teamsQuery = useQuery({
    queryKey: ["admin", "f1", "teams"],
    queryFn: listAdminF1Teams,
  });

  const driversById = useMemo(
    () => new Map((driversQuery.data?.data ?? []).map((d) => [d.id, d])),
    [driversQuery.data],
  );
  const teamsById = useMemo(
    () => new Map((teamsQuery.data?.data ?? []).map((t) => [t.id, t])),
    [teamsQuery.data],
  );
  const participantPairs = useMemo(
    () => participantsQuery.data?.data ?? [],
    [participantsQuery.data],
  );

  useEffect(() => {
    const results = resultsQuery.data?.data ?? [];
    if (results.length > 0) {
      const next = results.map((r) => ({
        driver_id: r.driver_id,
        team_id: r.team_id,
        position: r.position,
        points: r.points ?? 0,
        status: (r.status ?? "classified") as F1ResultStatus,
      }));
      setRows(next);
      setBaseline(JSON.stringify(next));
      return;
    }
    if (participantPairs.length === 0) return;
    const next = participantPairs.map((p, index) => ({
      driver_id: p.driver_id,
      team_id: p.team_id,
      position: index + 1,
      points: 0,
      status: "classified" as F1ResultStatus,
    }));
    setRows(next);
    setBaseline(JSON.stringify(next));
  }, [resultsQuery.data, participantPairs]);

  const dirty = JSON.stringify(rows) !== baseline;
  useDirtyGuard(dirty);

  const saveMutation = useMutation({
    mutationFn: () =>
      replaceRaceResults(
        raceId,
        rows.map((r) => ({
          driver_id: r.driver_id,
          team_id: r.team_id,
          position: r.position,
          points: r.points,
          status: r.status,
        })),
      ),
    onSuccess: () => {
      toast.success("Resultados guardados");
      setBaseline(JSON.stringify(rows));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "race-results", raceId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (raceQuery.isLoading || resultsQuery.isLoading) {
    return <LoadingBlock label="Cargando resultados…" />;
  }

  const race = raceQuery.data?.data;

  function updateRow(driverId: string, patch: Partial<ResultRow>) {
    setRows((prev) =>
      prev.map((row) =>
        row.driver_id === driverId ? { ...row, ...patch } : row,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[21px] font-semibold">
          {race?.name?.trim() || "Resultados de carrera"}
        </h2>
        <p className="text-sm text-dx-muted">
          {race?.race_date
            ? new Date(race.race_date).toLocaleDateString()
            : "Sin fecha"}{" "}
          · {rows.length} filas
        </p>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-dx-line bg-white">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                Pos.
              </th>
              <th className="border-b border-dx-line px-3 py-2.5">Piloto</th>
              <th className="border-b border-dx-line px-3 py-2.5">Equipo</th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                Pts
              </th>
              <th className="border-b border-dx-line px-3 py-2.5">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const driver = driversById.get(row.driver_id);
              const team = teamsById.get(row.team_id);
              return (
                <tr key={row.driver_id}>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <input
                      className={cn(inputClass, "max-w-[56px] font-extrabold")}
                      value={row.position}
                      onChange={(e) =>
                        updateRow(row.driver_id, {
                          position: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-3 py-2">
                    <strong>
                      {driver ? driverDisplayName(driver) : row.driver_id}
                    </strong>
                  </td>
                  <td className="border-b border-dx-line px-3 py-2">
                    <TextSelect
                      value={row.team_id}
                      onChange={(e) =>
                        updateRow(row.driver_id, { team_id: e.target.value })
                      }
                    >
                      {(teamsQuery.data?.data ?? []).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </TextSelect>
                    {!team ? (
                      <span className="text-xs text-dx-muted">{row.team_id}</span>
                    ) : null}
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <input
                      className={inputClass}
                      value={row.points}
                      onChange={(e) =>
                        updateRow(row.driver_id, {
                          points: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-dx-line px-3 py-2">
                    <TextSelect
                      value={row.status}
                      onChange={(e) =>
                        updateRow(row.driver_id, {
                          status: e.target.value as F1ResultStatus,
                        })
                      }
                    >
                      {(
                        Object.keys(F1_RESULT_STATUS_LABEL) as F1ResultStatus[]
                      ).map((key) => (
                        <option key={key} value={key}>
                          {F1_RESULT_STATUS_LABEL[key]}
                        </option>
                      ))}
                    </TextSelect>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            const used = new Set(rows.map((r) => r.driver_id));
            const next = participantPairs.find((p) => !used.has(p.driver_id));
            if (!next) {
              toast.message("No hay más participantes por agregar");
              return;
            }
            setRows((prev) => [
              ...prev,
              {
                driver_id: next.driver_id,
                team_id: next.team_id,
                position: prev.length + 1,
                points: 0,
                status: "classified",
              },
            ]);
          }}
        >
          + Agregar fila
        </Button>
      </div>

      <Note>
        El lote reemplaza todos los resultados de la carrera. Los pilotos deben
        ser participantes de la temporada.
      </Note>

      <StickyActions
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel="Guardar resultados"
        onDiscard={() => setRows(JSON.parse(baseline) as ResultRow[])}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}
