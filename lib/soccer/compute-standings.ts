/**
 * Pure standings calculation from finished matches (BO source of truth for UI).
 */

import type { MatchBoStatus, SoccerMatch, SoccerTeam } from "@/lib/api/soccer-types";

export type ComputedStandingRow = {
  team_id: string;
  rank: number;
  played: number;
  goals_for: number;
  goals_against: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
};

type TeamTotals = Omit<ComputedStandingRow, "team_id" | "rank">;

function emptyTotals(): TeamTotals {
  return {
    played: 0,
    goals_for: 0,
    goals_against: 0,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
  };
}

export function buildTeamCanonicalMap(teams: SoccerTeam[]): Map<string, string> {
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

export function isFinishedMatchStatus(
  status: string | MatchBoStatus | null | undefined,
): boolean {
  const raw = String(status ?? "").trim().toLowerCase();
  return (
    raw === "finished" ||
    raw === "ft" ||
    raw === "aet" ||
    raw === "pen" ||
    raw === "aet/pen"
  );
}

export function computeStandingsFromMatches(input: {
  teamIds: string[];
  matches: SoccerMatch[];
  teams?: SoccerTeam[];
}): ComputedStandingRow[] {
  const canonicalOf = buildTeamCanonicalMap(input.teams ?? []);
  const resolve = (rawId: string): string => {
    const id = rawId.trim();
    if (!id) return "";
    return canonicalOf.get(id) ?? id;
  };

  const seedIds = new Set<string>();
  for (const id of input.teamIds) {
    const canonical = resolve(id);
    if (canonical) seedIds.add(canonical);
  }

  const totalsByTeam = new Map<string, TeamTotals>();
  const bump = (rawId: string, goalsFor: number, goalsAgainst: number) => {
    const id = resolve(rawId);
    if (!id) return;
    seedIds.add(id);
    const current = totalsByTeam.get(id) ?? emptyTotals();
    current.played += 1;
    current.goals_for += goalsFor;
    current.goals_against += goalsAgainst;
    if (goalsFor > goalsAgainst) {
      current.wins += 1;
      current.points += 3;
    } else if (goalsFor === goalsAgainst) {
      current.draws += 1;
      current.points += 1;
    } else {
      current.losses += 1;
    }
    totalsByTeam.set(id, current);
  };

  for (const match of input.matches) {
    const status = match.bo_status ?? match.status;
    if (!isFinishedMatchStatus(status)) continue;
    const homeGoals = parseGoal(match.goals?.home);
    const awayGoals = parseGoal(match.goals?.away);
    if (homeGoals == null || awayGoals == null) continue;
    bump(match.home_team_id, homeGoals, awayGoals);
    bump(match.away_team_id, awayGoals, homeGoals);
  }

  const rows: ComputedStandingRow[] = [...seedIds].map((teamId) => {
    const totals = totalsByTeam.get(teamId) ?? emptyTotals();
    return {
      team_id: teamId,
      rank: 0,
      ...totals,
    };
  });

  rows.sort((a, b) => {
    const gdA = a.goals_for - a.goals_against;
    const gdB = b.goals_for - b.goals_against;
    return (
      b.points - a.points ||
      gdB - gdA ||
      b.goals_for - a.goals_for ||
      a.team_id.localeCompare(b.team_id)
    );
  });
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });

  return rows;
}
