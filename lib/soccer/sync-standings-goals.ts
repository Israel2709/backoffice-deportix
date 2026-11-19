/**
 * Recalculate league GF/GC from season fixtures and persist into standings.
 * Rank, PJ, points and W/D/L stay as captured on the standings table.
 */

import {
  listParticipants,
  listSeasonMatches,
  listSeasonTeams,
  listStandings,
  listTeamsByIds,
  replaceStandings,
} from "@/lib/api/admin-soccer";
import type { SoccerStanding, SoccerTeam } from "@/lib/api/soccer-types";

function buildCanonicalMap(teams: SoccerTeam[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const team of teams) {
    map.set(team.id, team.id);
    const external = String(team.team.id ?? "").trim();
    if (external) map.set(external, team.id);
  }
  return map;
}

function parseGoal(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

/**
 * After match saves: recompute GF/GC for every participant from all matches
 * that have both scores filled, then upsert standings rows.
 */
export async function syncStandingsGoalsFromMatches(
  seasonId: string,
): Promise<void> {
  const [matchesRes, standingsRes, participantsRes, seasonTeamsRes] =
    await Promise.all([
      listSeasonMatches(seasonId),
      listStandings(seasonId),
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
  const canonicalOf = buildCanonicalMap(allTeams);

  const resolve = (rawId: string): string => {
    const id = rawId.trim();
    if (!id) return "";
    return canonicalOf.get(id) ?? id;
  };

  const goalsByTeam = new Map<string, { for: number; against: number }>();
  const bump = (rawId: string, goalsFor: number, goalsAgainst: number) => {
    const id = resolve(rawId);
    if (!id) return;
    const current = goalsByTeam.get(id) ?? { for: 0, against: 0 };
    current.for += goalsFor;
    current.against += goalsAgainst;
    goalsByTeam.set(id, current);
  };

  for (const match of matchesRes.data ?? []) {
    const homeGoals = parseGoal(match.goals?.home);
    const awayGoals = parseGoal(match.goals?.away);
    if (homeGoals == null || awayGoals == null) continue;
    bump(match.home_team_id, homeGoals, awayGoals);
    bump(match.away_team_id, awayGoals, homeGoals);
  }

  const standingByTeam = new Map<string, SoccerStanding>();
  for (const row of standingsRes.data ?? []) {
    const id = resolve(row.team_id);
    if (!id) continue;
    standingByTeam.set(id, row);
  }

  const teamIds = new Set<string>();
  for (const id of participantIds) {
    const canonical = resolve(id);
    if (canonical) teamIds.add(canonical);
  }
  for (const id of standingByTeam.keys()) teamIds.add(id);
  for (const id of goalsByTeam.keys()) teamIds.add(id);

  if (teamIds.size === 0) return;

  const rows = [...teamIds].map((teamId, index) => {
    const existing = standingByTeam.get(teamId);
    const goals = goalsByTeam.get(teamId) ?? { for: 0, against: 0 };
    return {
      team_id: teamId,
      rank: existing?.rank ?? index + 1,
      played: existing?.played ?? 0,
      goals_for: goals.for,
      goals_against: goals.against,
      points: existing?.points ?? 0,
      wins: existing?.wins ?? 0,
      draws: existing?.draws ?? 0,
      losses: existing?.losses ?? 0,
    };
  });

  rows.sort((a, b) => a.rank - b.rank || a.team_id.localeCompare(b.team_id));
  await replaceStandings(seasonId, rows);
}
