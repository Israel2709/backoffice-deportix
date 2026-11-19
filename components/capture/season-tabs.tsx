"use client";

import { useQuery } from "@tanstack/react-query";
import { CaptureTabs } from "@/components/capture/capture-tabs";
import { listParticipants, listRounds } from "@/lib/api/admin-soccer";

export function SeasonTabs({
  leagueId,
  seasonId,
}: {
  leagueId: string;
  seasonId: string;
}) {
  const base = `/operacion/futbol/${leagueId}/${seasonId}`;

  const participantsQuery = useQuery({
    queryKey: ["admin", "soccer", "participants", seasonId],
    queryFn: () => listParticipants(seasonId),
  });
  const roundsQuery = useQuery({
    queryKey: ["admin", "soccer", "rounds", seasonId],
    queryFn: () => listRounds(seasonId),
  });

  const hasParticipants = (participantsQuery.data?.data.length ?? 0) > 0;
  const hasStructure = (roundsQuery.data?.data.length ?? 0) > 0;
  const partidosReady = hasParticipants && hasStructure;

  let partidosDisabledTitle =
    "Primero captura Participantes y Estructura (jornadas).";
  if (!hasParticipants && hasStructure) {
    partidosDisabledTitle = "Primero captura Participantes.";
  } else if (hasParticipants && !hasStructure) {
    partidosDisabledTitle = "Primero captura Estructura (jornadas).";
  }

  return (
    <CaptureTabs
      items={[
        { href: base, label: "General", exact: true },
        { href: `${base}/participantes`, label: "Participantes" },
        { href: `${base}/estructura`, label: "Estructura" },
        {
          href: `${base}/partidos`,
          label: "Partidos",
          disabled: !partidosReady,
          disabledTitle: partidosDisabledTitle,
        },
        { href: `${base}/clasificacion`, label: "Clasificación" },
      ]}
    />
  );
}
