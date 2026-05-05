import type { Round } from "../features/rounds/types";
import { isFullRound, roundTotal } from "./round";
import { TEE_RATINGS } from "../features/course/west-sussex";

/** Differential = (total − rating) × 113 / slope, where rating/slope come from the round's tees. */
export function differential(total: number, tees: "white" | "yellow"): number {
  const { rating, slope } = TEE_RATINGS[tees];
  return ((total - rating) * 113) / slope;
}

/**
 * Informal handicap trend: mean of the best 8 of last 20 differentials.
 * Uses FULL rounds only. Each differential is computed using the round's own tees.
 * Returns null until 5 full rounds logged.
 */
export function handicapTrend(rounds: Round[]): number | null {
  const full = rounds.filter(isFullRound);
  if (full.length < 5) return null;
  const sorted = [...full].sort((a, b) => b.date.localeCompare(a.date));
  const recent = sorted.slice(0, 20);
  const diffs = recent.map((r) => differential(roundTotal(r), r.tees)).sort((a, b) => a - b);
  const take = Math.min(8, diffs.length);
  const best = diffs.slice(0, take);
  const mean = best.reduce((s, n) => s + n, 0) / best.length;
  return Math.round(mean * 10) / 10;
}
