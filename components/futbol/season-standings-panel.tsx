"use client";
import { LoadingBlock } from "@/components/ui/spinner";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  listParticipants,
  listSeasonMatches,
  listSeasonTeams,
  listTeamsByIds,
} from "@/lib/api/admin-soccer";
import {
  teamDisplayName,
  teamLogoUrl,
  type SoccerTeam,
} from "@/lib/api/soccer-types";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { computeStandingsFromMatches } from "@/lib/soccer/compute-standings";
import { syncStandingsGoalsFromMatches } from "@/lib/soccer/sync-standings-goals";

export function SeasonStandingsPanel({ seasonId }: { seasonId: string }) {
  const queryClient = useQueryClient();

  const matchesQuery = useQuery({
    queryKey: ["admin", "soccer", "matches", seasonId],
    queryFn: () => listSeasonMatches(seasonId),
  });
  const participantsQuery = useQuery({
    queryKey: ["admin", "soccer", "participants", seasonId],
    queryFn: () => listParticipants(seasonId),
  });
  const seasonTeamsQuery = useQuery({
    queryKey: ["admin", "soccer", "teams", "season", seasonId],
    queryFn: () => listSeasonTeams(seasonId),
  });

  const participantIds = useMemo(
    () =>
      [
        ...new Set(
          (participantsQuery.data?.data ?? [])
            .map((p) => p.team_id?.trim())
            .filter((id): id is string => Boolean(id)),
        ),
      ],
    [participantsQuery.data],
  );

  const missingTeamIds = useMemo(() => {
    const known = new Set<string>();
    for (const team of seasonTeamsQuery.data?.data ?? []) {
      known.add(team.id);
      const external = String(team.team.id ?? "").trim();
      if (external) known.add(external);
    }
    return participantIds.filter((id) => id && !known.has(id));
  }, [seasonTeamsQuery.data, participantIds]);

  const orphanTeamsQuery = useQuery({
    queryKey: ["admin", "soccer", "teams-by-ids", seasonId, missingTeamIds],
    queryFn: () => listTeamsByIds(missingTeamIds),
    enabled: missingTeamIds.length > 0,
  });

  const teamsById = useMemo(() => {
    const map = new Map<string, SoccerTeam>();
    for (const team of [
      ...(seasonTeamsQuery.data?.data ?? []),
      ...(orphanTeamsQuery.data?.data ?? []),
    ]) {
      map.set(team.id, team);
      const external = String(team.team.id ?? "").trim();
      if (external) map.set(external, team);
    }
    return map;
  }, [seasonTeamsQuery.data, orphanTeamsQuery.data]);

  const allTeams = useMemo(
    () => [
      ...(seasonTeamsQuery.data?.data ?? []),
      ...(orphanTeamsQuery.data?.data ?? []),
    ],
    [seasonTeamsQuery.data, orphanTeamsQuery.data],
  );

  // UI source of truth: always recompute from current finished matches.
  // Avoids stale CDN ranks and duplicate Firestore standing docs.
  const rows = useMemo(() => {
    if (participantIds.length === 0 && !(matchesQuery.data?.data?.length)) {
      return [];
    }
    return computeStandingsFromMatches({
      teamIds: participantIds,
      matches: matchesQuery.data?.data ?? [],
      teams: allTeams,
    }).map((row) => {
      const team = teamsById.get(row.team_id);
      return {
        ...row,
        team_name: team ? teamDisplayName(team) : null,
        team_logo: team ? teamLogoUrl(team) : null,
      };
    });
  }, [participantIds, matchesQuery.data, allTeams, teamsById]);

  const syncMutation = useMutation({
    mutationFn: () => syncStandingsGoalsFromMatches(seasonId),
    onSuccess: () => {
      toast.success("Clasificación guardada desde partidos");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "matches", seasonId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "soccer", "standings", seasonId],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const loading =
    matchesQuery.isLoading ||
    participantsQuery.isLoading ||
    seasonTeamsQuery.isLoading;

  if (loading) {
    return <LoadingBlock label="Cargando clasificación…" />;
  }

  if (matchesQuery.isError) {
    return (
      <div className="rounded-xl border border-[#f1dfa9] bg-[#fff9e8] px-3.5 py-3 text-[13px] text-[#7d5a00]">
        {(matchesQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-semibold">Clasificación</h2>
          <div className="text-sm text-dx-muted">
            {rows.length} equipos · calculada desde partidos finalizados
          </div>
        </div>
        <Button
          variant="secondary"
          disabled={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
        >
          {syncMutation.isPending
            ? "Guardando…"
            : "Guardar clasificación"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-dx-line bg-white">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-[#f8fafc] text-[11px] tracking-wide text-[#667085] uppercase">
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                Pos.
              </th>
              <th className="border-b border-dx-line px-3 py-2.5">Equipo</th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                PJ
              </th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                GF
              </th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                GC
              </th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                DG
              </th>
              <th className="border-b border-dx-line px-3 py-2.5 text-center">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const team = teamsById.get(row.team_id);
              const name =
                (team ? teamDisplayName(team) : null) ||
                row.team_name?.trim() ||
                null;
              const logo =
                (team ? teamLogoUrl(team) : null) ||
                row.team_logo?.trim() ||
                null;
              const dg = row.goals_for - row.goals_against;
              return (
                <tr key={row.team_id}>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <span className="inline-flex min-w-[36px] justify-center text-[15px] font-extrabold text-dx-ink">
                      {row.rank}
                    </span>
                  </td>
                  <td className="border-b border-dx-line px-3 py-2">
                    <div className="flex items-center gap-2">
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logo}
                          alt=""
                          className="h-[30px] w-[30px] rounded-lg border border-[#cad9f0] bg-white object-contain p-0.5"
                        />
                      ) : (
                        <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[#cad9f0] bg-[#edf4ff] text-[10px] font-black text-dx-blue">
                          {team?.team.code?.slice(0, 3) ?? "EQ"}
                        </span>
                      )}
                      <strong>{name ?? row.team_id}</strong>
                    </div>
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center font-semibold text-[#41516b]">
                    {row.played}
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center font-semibold text-[#41516b]">
                    {row.goals_for}
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center font-semibold text-[#41516b]">
                    {row.goals_against}
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center">
                    <span className="inline-flex min-w-[62px] justify-center rounded-[7px] border border-[#d9e4f3] bg-[#f2f6fc] px-2 py-1.5 font-extrabold text-[#41516b]">
                      {dg > 0 ? `+${dg}` : dg}
                    </span>
                  </td>
                  <td className="border-b border-dx-line px-3 py-2 text-center text-[15px] font-extrabold text-dx-ink">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Note>
        La tabla se calcula en vivo desde partidos <b>Finalizado</b> con
        marcador. <b>Guardar clasificación</b> persiste el resultado en la API
        (App QD). Pos. = Pts → DG → GF.
      </Note>
    </div>
  );
}
