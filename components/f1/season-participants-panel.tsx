"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listAdminDrivers,
  listAdminF1Teams,
  listF1Participants,
  replaceF1Participants,
} from "@/lib/api/admin-f1";
import { driverDisplayName } from "@/lib/api/f1-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { StickyActions } from "@/components/capture/sticky-actions";
import { TextSelect } from "@/components/capture/field";

type ParticipantRow = { driver_id: string; team_id: string };

export function SeasonParticipantsPanel({
  seasonId,
}: {
  seasonId: string;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [baseline, setBaseline] = useState("[]");
  const [pickDriverId, setPickDriverId] = useState("");
  const [pickTeamId, setPickTeamId] = useState("");

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

  useEffect(() => {
    const next = (participantsQuery.data?.data ?? []).map((p) => ({
      driver_id: p.driver_id,
      team_id: p.team_id,
    }));
    setRows(next);
    setBaseline(JSON.stringify(next));
  }, [participantsQuery.data]);

  const dirty = JSON.stringify(rows) !== baseline;
  useDirtyGuard(dirty);

  const driversById = useMemo(
    () => new Map((driversQuery.data?.data ?? []).map((d) => [d.id, d])),
    [driversQuery.data],
  );
  const teamsById = useMemo(
    () => new Map((teamsQuery.data?.data ?? []).map((t) => [t.id, t])),
    [teamsQuery.data],
  );

  const usedDriverIds = new Set(rows.map((r) => r.driver_id));
  const availableDrivers = (driversQuery.data?.data ?? []).filter(
    (d) => !usedDriverIds.has(d.id),
  );

  const saveMutation = useMutation({
    mutationFn: () => replaceF1Participants(seasonId, rows),
    onSuccess: () => {
      toast.success("Participantes guardados");
      setBaseline(JSON.stringify(rows));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "f1", "participants", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">
            {rows.length} pilotos
          </h2>
          <p className="text-sm text-dx-muted">
            Parejas piloto-equipo para esta temporada
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextSelect
            value={pickDriverId}
            onChange={(e) => setPickDriverId(e.target.value)}
            className="min-w-[180px]"
          >
            <option value="">Piloto…</option>
            {availableDrivers.map((d) => (
              <option key={d.id} value={d.id}>
                {driverDisplayName(d)}
              </option>
            ))}
          </TextSelect>
          <TextSelect
            value={pickTeamId}
            onChange={(e) => setPickTeamId(e.target.value)}
            className="min-w-[180px]"
          >
            <option value="">Equipo…</option>
            {(teamsQuery.data?.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </TextSelect>
          <Button
            disabled={!pickDriverId || !pickTeamId}
            onClick={() => {
              setRows((prev) => [
                ...prev,
                { driver_id: pickDriverId, team_id: pickTeamId },
              ]);
              setPickDriverId("");
              setPickTeamId("");
            }}
          >
            + Agregar
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const driver = driversById.get(row.driver_id);
          const team = teamsById.get(row.team_id);
          return (
            <div
              key={row.driver_id}
              className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px]"
            >
              <div>
                <h3 className="font-semibold">
                  {driver ? driverDisplayName(driver) : row.driver_id}
                </h3>
                <div className="mt-1 text-[13px] text-dx-muted">
                  {team?.name ?? row.team_id}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TextSelect
                  value={row.team_id}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.driver_id === row.driver_id
                          ? { ...r, team_id: e.target.value }
                          : r,
                      ),
                    )
                  }
                >
                  {(teamsQuery.data?.data ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </TextSelect>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setRows((prev) =>
                      prev.filter((r) => r.driver_id !== row.driver_id),
                    )
                  }
                >
                  Quitar
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Note>
        Si falta un piloto o equipo, créalo en Datos Maestros · Fórmula 1.
      </Note>

      <StickyActions
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel="Guardar participantes"
        onDiscard={() => setRows(JSON.parse(baseline) as ParticipantRow[])}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}
