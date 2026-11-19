/**
 * Persist standings computed from finished fixtures.
 */

import {
  listParticipants,
  listSeasonMatches,
  listSeasonTeams,
  listTeamsByIds,
  replaceStandings,
} from "@/lib/api/admin-soccer";
import { computeStandingsFromMatches } from "@/lib/soccer/compute-standings";

/**
 * After match saves (or on demand from Clasificación): recompute the full
 * table from finished matches and upsert standings.
 */
export async function syncStandingsGoalsFromMatches(
  seasonId: string,
): Promise<void> {
  const [matchesRes, participantsRes, seasonTeamsRes] = await Promise.all([
    listSeasonMatches(seasonId),
    listParticipants(seasonId),
    listSeasonTeams(seasonId),
  ]);

  const participantIds = [
    ...new Set(
      (participantsRes.data ?? [])
        .map((p) => p.team_id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const known = new Set<string>();
  for (const team of seasonTeamsRes.data ?? []) {
    known.add(team.id);
    const external = String(team.team.id ?? "").trim();
    if (external) known.add(external);
  }
  const missing = participantIds.filter((id) => !known.has(id));
  const orphanTeams =
    missing.length > 0 ? (await listTeamsByIds(missing)).data : [];

  const allTeams = [...(seasonTeamsRes.data ?? []), ...orphanTeams];
  const rows = computeStandingsFromMatches({
    teamIds: participantIds,
    matches: matchesRes.data ?? [],
    teams: allTeams,
  });

  if (rows.length === 0) return;
  await replaceStandings(seasonId, rows);
}
