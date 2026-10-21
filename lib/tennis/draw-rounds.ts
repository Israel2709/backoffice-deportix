export type DrawRound = {
  /** 1-based order from the first round to the final. */
  order: number;
  name: string;
  matchCount: number;
};

/** Next power of two ≥ n (minimum 2). */
export function drawSizeFromParticipants(participants: number): number {
  if (!Number.isFinite(participants) || participants < 2) return 0;
  let size = 2;
  while (size < participants) size *= 2;
  return size;
}

/**
 * Single-elimination rounds for a main draw of `participants` players.
 * Names follow the BO HTML pattern: R1… then Octavos / Cuartos / Semifinales / Final.
 */
export function buildDrawRounds(participants: number): DrawRound[] {
  const size = drawSizeFromParticipants(participants);
  if (size < 2) return [];

  const roundCount = Math.log2(size);
  const rounds: DrawRound[] = [];

  for (let i = 1; i <= roundCount; i += 1) {
    const matchCount = size / 2 ** i;
    const fromEnd = roundCount - i + 1;
    let name: string;
    if (fromEnd === 1) name = "Final";
    else if (fromEnd === 2) name = "Semifinales";
    else if (fromEnd === 3) name = "Cuartos";
    else if (fromEnd === 4) name = "Octavos";
    else name = `R${i}`;
    rounds.push({ order: i, name, matchCount });
  }

  return rounds;
}

/**
 * Prefer the configured draw size; otherwise derive from enrolled players or
 * from first-round match slots already on the board.
 */
export function resolveDrawParticipants(input: {
  configured?: number | null;
  enrolledCount?: number | null;
  firstRoundMatchCount?: number | null;
}): number | null {
  const configured = input.configured;
  if (typeof configured === "number" && Number.isFinite(configured) && configured >= 2) {
    return configured;
  }
  const enrolled = input.enrolledCount;
  if (typeof enrolled === "number" && Number.isFinite(enrolled) && enrolled >= 2) {
    return enrolled;
  }
  const firstRound = input.firstRoundMatchCount;
  if (
    typeof firstRound === "number" &&
    Number.isFinite(firstRound) &&
    firstRound >= 1
  ) {
    return firstRound * 2;
  }
  return null;
}
