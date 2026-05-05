import type { Round, CourseHole } from "../features/rounds/types";
import { isFullRound, roundTotal } from "./round";
import { handicapTrend } from "./handicap";

export type HoleStat = {
  hole: number;
  par: number;
  count: number;          // logged scores on this hole
  average: number | null; // null if count===0
  expected: number;       // par + handicapTrend/18
  delta: number | null;   // average − expected
  status: "good" | "mid" | "bad" | "none";
  recent: number[];       // last 5 scores oldest→newest
};

export type StatusKind = "good" | "mid" | "bad" | "none";

export function statusFromDelta(delta: number): StatusKind {
  if (delta <= -0.30) return "good";
  if (delta >= 0.30) return "bad";
  return "mid";
}

export function computeHoleStats(rounds: Round[], course: CourseHole[]): HoleStat[] {
  const hcp = handicapTrend(rounds) ?? 0;
  const expectedAdj = hcp / 18;

  // Sort rounds chronologically asc for "recent" ordering oldest→newest of the last 5.
  const sortedAsc = [...rounds].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt.localeCompare(b.createdAt);
  });

  // "First 5 rounds → all amber" rule applies to FULL rounds only.
  const fullRoundCount = rounds.filter(isFullRound).length;
  const insufficientTotal = fullRoundCount < 5;

  return course.map((c) => {
    const scoresAsc: number[] = [];
    for (const r of sortedAsc) {
      const h = r.holes.find((x) => x.hole === c.hole);
      if (h && typeof h.score === "number" && h.score > 0) scoresAsc.push(h.score);
    }
    const count = scoresAsc.length;
    const recent = scoresAsc.slice(-5);
    const expected = c.par + expectedAdj;

    if (count < 3) {
      return { hole: c.hole, par: c.par, count, average: null, expected, delta: null, status: "none" as StatusKind, recent };
    }
    const avg = scoresAsc.reduce((s, n) => s + n, 0) / count;
    const delta = avg - expected;
    let status: StatusKind = statusFromDelta(delta);
    if (insufficientTotal) status = "mid";
    return {
      hole: c.hole,
      par: c.par,
      count,
      average: Math.round(avg * 10) / 10,
      expected,
      delta: Math.round(delta * 100) / 100,
      status,
      recent,
    };
  });
}

export function bestRound(rounds: Round[]): { total: number; date: string } | null {
  const full = rounds.filter(isFullRound);
  if (full.length === 0) return null;
  let best = full[0];
  let bestTotal = roundTotal(best);
  for (const r of full) {
    const t = roundTotal(r);
    if (t < bestTotal) {
      best = r;
      bestTotal = t;
    }
  }
  return { total: bestTotal, date: best.date };
}

export function scoringAverage(rounds: Round[]): number | null {
  const full = rounds.filter(isFullRound);
  if (full.length === 0) return null;
  const sum = full.reduce((s, r) => s + roundTotal(r), 0);
  return Math.round((sum / full.length) * 10) / 10;
}

export function squareColorByPar(score: number, par: number): "good" | "mid" | "bad" {
  const over = score - par;
  if (over <= 0) return "good";
  if (over === 1) return "mid";
  return "bad";
}

/** Estimated season impact in strokes/round: delta clamped at zero, rounded to 1 decimal. */
export function seasonImpact(stat: HoleStat): number {
  if (stat.delta == null) return 0;
  return Math.round(stat.delta * 10) / 10;
}
