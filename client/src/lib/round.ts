// Helpers for partial-round support.
// A round may have any number of holes scored (1..18). Holes with score === null
// are "not played" — they don't count toward totals or hole-level stats.

import type { Round, HoleScore, CourseHole } from "../features/rounds/types";

/** Holes that have a numeric score logged. */
export function playedHoles(round: Pick<Round, "holes">): HoleScore[] {
  return round.holes.filter((h) => typeof h.score === "number" && (h.score as number) > 0);
}

export function playedCount(round: Pick<Round, "holes">): number {
  return playedHoles(round).length;
}

export function isFullRound(round: Pick<Round, "holes">): boolean {
  return playedCount(round) === 18;
}

/** Sum of scored holes only. A 9-hole round of 41 returns 41 (not 41 + 9 nulls). */
export function roundTotal(round: Pick<Round, "holes">): number {
  return playedHoles(round).reduce((s, h) => s + (h.score as number), 0);
}

/** Sum of par for the holes that were actually played. */
export function roundParPlayed(round: Pick<Round, "holes">, course: CourseHole[]): number {
  let par = 0;
  for (const h of playedHoles(round)) {
    const c = course.find((x) => x.hole === h.hole);
    if (c) par += c.par;
  }
  return par;
}
