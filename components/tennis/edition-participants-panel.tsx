"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listAdminPlayers,
  listEditionParticipants,
  replaceEditionParticipants,
} from "@/lib/api/admin-tennis";
import { playerDisplayName } from "@/lib/api/tennis-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { StickyActions } from "@/components/capture/sticky-actions";
import { TextInput, TextSelect } from "@/components/capture/field";

type ParticipantRow = { player_id: string; seed: string };

export function EditionParticipantsPanel({
  editionId,
}: {
  editionId: string;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [baseline, setBaseline] = useState("[]");
  const [pickId, setPickId] = useState("");

  const participantsQuery = useQuery({
    queryKey: ["admin", "tennis", "participants", editionId],
    queryFn: () => listEditionParticipants(editionId),
  });
  const playersQuery = useQuery({
    queryKey: ["admin", "tennis", "players"],
    queryFn: () => listAdminPlayers(),
  });

  useEffect(() => {
    const next = (participantsQuery.data?.data ?? []).map((p) => ({
      player_id: p.player_id,
      seed: p.seed != null ? String(p.seed) : "",
    }));
    setRows(next);
    setBaseline(JSON.stringify(next));
  }, [participantsQuery.data]);

  const dirty = JSON.stringify(rows) !== baseline;
  useDirtyGuard(dirty);

  const playersById = useMemo(
    () => new Map((playersQuery.data?.data ?? []).map((p) => [p.id, p])),
    [playersQuery.data],
  );

  const usedIds = new Set(rows.map((r) => r.player_id));
  const available = (playersQuery.data?.data ?? []).filter(
    (p) => !usedIds.has(p.id) && p.status === "active",
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      replaceEditionParticipants(
        editionId,
        rows.map((r) => ({
          player_id: r.player_id,
          seed: r.seed ? Number(r.seed) : null,
        })),
      ),
    onSuccess: () => {
      toast.success("Participantes guardados");
      setBaseline(JSON.stringify(rows));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "tennis", "participants", editionId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">
            {rows.length} jugadores
          </h2>
          <p className="text-sm text-dx-muted">
            Jugadores y cabeza de serie para el draw
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextSelect
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            className="min-w-[220px]"
          >
            <option value="">Agregar jugador…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {playerDisplayName(p)}
              </option>
            ))}
          </TextSelect>
          <Button
            disabled={!pickId}
            onClick={() => {
              setRows((prev) => [...prev, { player_id: pickId, seed: "" }]);
              setPickId("");
            }}
          >
            + Agregar
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const player = playersById.get(row.player_id);
          return (
            <div
              key={row.player_id}
              className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px]"
            >
              <div>
                <h3 className="font-semibold">
                  {player ? playerDisplayName(player) : row.player_id}
                </h3>
                <div className="mt-1 text-[13px] text-dx-muted">
                  {player?.country_name ?? "—"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TextInput
                  type="number"
                  placeholder="Seed"
                  value={row.seed}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.player_id === row.player_id
                          ? { ...r, seed: e.target.value }
                          : r,
                      ),
                    )
                  }
                  className="max-w-[80px]"
                />
                <Button
                  variant="ghost"
                  onClick={() =>
                    setRows((prev) =>
                      prev.filter((r) => r.player_id !== row.player_id),
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
        Si falta un jugador, créalo en Datos Maestros · Tenis · Jugadores.
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
