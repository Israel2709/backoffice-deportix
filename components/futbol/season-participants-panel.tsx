"use client";
import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listAdminTeams,
  listParticipants,
  listTeamsByIds,
  replaceParticipants,
} from "@/lib/api/admin-soccer";
import {
  teamCode,
  teamDisplayName,
  teamLogoUrl,
} from "@/lib/api/soccer-types";
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
    queryKey: ["admin", "soccer", "participants", seasonId],
    queryFn: () => listParticipants(seasonId),
  });

  const participantIds = useMemo(
    () =>
      [...new Set((participantsQuery.data?.data ?? []).map((p) => p.team_id))],
    [participantsQuery.data],
  );

  const rosterTeamsQuery = useQuery({
    queryKey: ["admin", "soccer", "teams-by-ids", seasonId, participantIds],
    queryFn: () => listTeamsByIds(participantIds),
    enabled: participantIds.length > 0,
  });

  // Catalog for "Agregar": teams linked to this competition (no global N+1).
  const catalogQuery = useQuery({
    queryKey: ["admin", "soccer", "teams", leagueId, "catalog"],
    queryFn: () => listAdminTeams(leagueId),
  });

  useEffect(() => {
    setSelected(participantIds);
    setBaseline(JSON.stringify(participantIds));
  }, [participantIds]);

  const dirty = JSON.stringify(selected) !== baseline;
  useDirtyGuard(dirty);

  const teamsById = useMemo(() => {
    const map = new Map(
      [
        ...(rosterTeamsQuery.data?.data ?? []),
        ...(catalogQuery.data?.data ?? []),
      ].map((team) => [team.id, team]),
    );
    return map;
  }, [rosterTeamsQuery.data, catalogQuery.data]);

  const available = useMemo(() => {
    const selectedSet = new Set(selected);
    const seen = new Set<string>();
    const rows = [];
    for (const team of catalogQuery.data?.data ?? []) {
      if (seen.has(team.id) || selectedSet.has(team.id)) continue;
      if ((team.status ?? "active") !== "active") continue;
      seen.add(team.id);
      rows.push(team);
    }
    return rows;
  }, [catalogQuery.data, selected]);

  const saveMutation = useMutation({
    mutationFn: () => replaceParticipants(seasonId, selected),
    onSuccess: () => {
      toast.success("Participantes guardados");
      setBaseline(JSON.stringify(selected));
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "participants", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (participantsQuery.isLoading) {
    return <LoadingBlock label="Cargando participantes…" />;
  }

  if (participantsQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(participantsQuery.error as Error).message}
      </div>
    );
  }

  const rosterLoading =
    participantIds.length > 0 && rosterTeamsQuery.isLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">
            {selected.length} equipos
          </h2>
          <p className="text-sm text-dx-muted">
            Equipos que participan en esta temporada de la competición. Un mismo
            club puede estar en varias ligas (p. ej. Apertura y Clausura).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextSelect
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            className="min-w-[220px]"
            disabled={catalogQuery.isLoading}
          >
            <option value="">
              {catalogQuery.isLoading ? "Cargando equipos…" : "Agregar equipo…"}
            </option>
            {available.map((team) => {
              const code = teamCode(team);
              return (
                <option key={team.id} value={team.id}>
                  {teamDisplayName(team)}
                  {code ? ` (${code})` : ""}
                </option>
              );
            })}
          </TextSelect>
          <Button
            disabled={!pickId}
            onClick={() => {
              setSelected((prev) =>
                prev.includes(pickId) ? prev : [...prev, pickId],
              );
              setPickId("");
            }}
          >
            + Agregar
          </Button>
        </div>
      </div>

      {rosterLoading ? (
        <LoadingBlock label="Cargando equipos de la temporada…" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {selected.map((teamId) => {
            const team = teamsById.get(teamId);
            const logo = team ? teamLogoUrl(team) : null;
            const meta = team
              ? [teamCode(team), team.team.country?.trim()]
                  .filter((part): part is string => Boolean(part))
                  .join(" · ")
              : "Equipo no encontrado en maestros";
            const initials = (team ? teamDisplayName(team) : teamId)
              .slice(0, 2)
              .toUpperCase();
            return (
              <div
                key={teamId}
                className="flex items-center justify-between gap-4 rounded-[14px] border border-dx-line bg-white px-[17px] py-[15px]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg border border-dx-line bg-white object-contain"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dx-line bg-[#eef4ff] text-[11px] font-bold text-dx-blue">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold">
                      {team ? teamDisplayName(team) : teamId}
                    </h3>
                    {meta ? (
                      <div className="mt-1 text-[13px] text-dx-muted">{meta}</div>
                    ) : null}
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
      )}

      <Note>
        La lista se guarda en la temporada (`soccer_season_participants`). Si
        falta un equipo, créalo primero en Datos Maestros · Fútbol · Equipos.
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
