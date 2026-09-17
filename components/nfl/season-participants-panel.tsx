"use client";
import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listAdminTeams,
  listParticipants,
  replaceParticipants,
} from "@/lib/api/admin-nfl";
import {
  teamAbbrev,
  teamCity,
  teamDisplayName,
} from "@/lib/api/nfl-types";
import { useDirtyGuard } from "@/hooks/use-dirty-guard";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { StickyActions } from "@/components/capture/sticky-actions";
import { TextSelect } from "@/components/capture/field";

export function SeasonParticipantsPanel({
  seasonId,
  leagueId,
}: {
  seasonId: string;
  leagueId: string;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [baseline, setBaseline] = useState("[]");
  const [pickId, setPickId] = useState("");

  const participantsQuery = useQuery({
    queryKey: ["admin", "nfl", "participants", seasonId],
    queryFn: () => listParticipants(seasonId),
  });
  const teamsQuery = useQuery({
    queryKey: ["admin", "nfl", "teams"],
    queryFn: () => listAdminTeams(),
  });

  useEffect(() => {
    const ids = (participantsQuery.data?.data ?? []).map((p) => p.team_id);
    setSelected(ids);
    setBaseline(JSON.stringify(ids));
  }, [participantsQuery.data]);

  const dirty = JSON.stringify(selected) !== baseline;
  useDirtyGuard(dirty);

  const teamsById = useMemo(() => {
    const map = new Map(
      (teamsQuery.data?.data ?? []).map((team) => [team.id, team]),
    );
    return map;
  }, [teamsQuery.data]);

  const available = useMemo(() => {
    return (teamsQuery.data?.data ?? []).filter(
      (team) => !selected.includes(team.id),
    );
  }, [teamsQuery.data, selected]);

  const saveMutation = useMutation({
    mutationFn: () => replaceParticipants(seasonId, selected),
    onSuccess: () => {
      toast.success("Participantes guardados");
      setBaseline(JSON.stringify(selected));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "nfl", "participants", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (participantsQuery.isLoading || teamsQuery.isLoading) {
    return <LoadingBlock label="Cargando participantes…" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">
            {selected.length} equipos
          </h2>
          <p className="text-sm text-dx-muted">
            Asocia equipos maestros a esta temporada
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextSelect
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            className="min-w-[220px]"
          >
            <option value="">Agregar equipo…</option>
            {available.map((team) => (
              <option key={team.id} value={team.id}>
                {teamDisplayName(team)} ({teamAbbrev(team)})
              </option>
            ))}
          </TextSelect>
          <Button
            disabled={!pickId}
            onClick={() => {
              setSelected((prev) => [...prev, pickId]);
              setPickId("");
            }}
          >
            + Agregar
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {selected.map((teamId) => {
          const team = teamsById.get(teamId);
          return (
            <div
              key={teamId}
              className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px]"
            >
              <div>
                <h3 className="font-semibold">
                  {team ? teamDisplayName(team) : teamId}
                </h3>
                <div className="mt-1 text-[13px] text-dx-muted">
                  {team
                    ? [teamCity(team), team.conference, team.division]
                        .filter(Boolean)
                        .join(" · ")
                    : "Equipo no encontrado en maestros"}
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() =>
                  setSelected((prev) => prev.filter((id) => id !== teamId))
                }
              >
                Quitar
              </Button>
            </div>
          );
        })}
      </div>

      <Note>
        Si falta un equipo, créalo primero en Datos Maestros · Football
        Americano · Equipos. Competición de referencia del hub:{" "}
        {leagueId.slice(0, 8)}…
      </Note>

      <StickyActions
        dirty={dirty}
        saving={saveMutation.isPending}
        saveLabel="Guardar participantes"
        onDiscard={() => setSelected(JSON.parse(baseline) as string[])}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}
