"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { SeasonMatchesPanel } from "@/components/futbol/season-matches-panel";
import { LoadingBlock } from "@/components/ui/spinner";
import { listParticipants, listRounds } from "@/lib/api/admin-soccer";

export default function SeasonPartidosPage({
  params,
}: {
  params: Promise<{ leagueId: string; seasonId: string }>;
}) {
  const { leagueId, seasonId } = use(params);
  const base = `/operacion/futbol/${encodeURIComponent(leagueId)}/${encodeURIComponent(seasonId)}`;

  const participantsQuery = useQuery({
    queryKey: ["admin", "soccer", "participants", seasonId],
    queryFn: () => listParticipants(seasonId),
  });
  const roundsQuery = useQuery({
    queryKey: ["admin", "soccer", "rounds", seasonId],
    queryFn: () => listRounds(seasonId),
  });

  if (participantsQuery.isLoading || roundsQuery.isLoading) {
    return <LoadingBlock label="Comprobando requisitos…" />;
  }

  const hasParticipants = (participantsQuery.data?.data.length ?? 0) > 0;
  const hasStructure = (roundsQuery.data?.data.length ?? 0) > 0;

  if (!hasParticipants || !hasStructure) {
    return (
      <div className="rounded-2xl border border-dashed border-dx-line bg-dx-card px-6 py-12 text-center shadow-[0_4px_14px_rgba(19,53,105,0.06)]">
        <p className="text-[16px] font-semibold text-dx-ink">
          Partidos aún no disponibles
        </p>
        <p className="mt-2 text-[14px] text-dx-muted">
          Primero captura{" "}
          {!hasParticipants ? (
            <Link
              href={`${base}/participantes`}
              className="font-bold text-dx-blue hover:underline"
            >
              Participantes
            </Link>
          ) : null}
          {!hasParticipants && !hasStructure ? " y " : null}
          {!hasStructure ? (
            <Link
              href={`${base}/estructura`}
              className="font-bold text-dx-blue hover:underline"
            >
              Estructura
            </Link>
          ) : null}
          .
        </p>
      </div>
    );
  }

  return <SeasonMatchesPanel seasonId={seasonId} />;
}
