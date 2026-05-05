import { ulid } from "ulid";
import type { Round, CourseHole, Diagnosis } from "../rounds/types";
import { RULES, fallbackPositive } from "./rules";
import { nowISO } from "../../lib/date";
import { playedCount } from "../../lib/round";

/**
 * Run the diagnosis engine on the most recent 10 rounds with at least one
 * scored hole. Returns null if fewer than 10 such rounds are logged, or if the
 * window is too sparse (< 80 scored hole-records across the 10).
 */
export function runDiagnosis(rounds: Round[], course: CourseHole[]): Diagnosis | null {
  const eligible = rounds.filter((r) => playedCount(r) >= 1);
  const sortedDesc = [...eligible].sort((a, b) => b.date.localeCompare(a.date));
  const window = sortedDesc.slice(0, 10);
  if (window.length < 10) return null;
  const scoredRecords = window.reduce((s, r) => s + playedCount(r), 0);
  if (scoredRecords < 80) return null;

  for (const rule of RULES) {
    const result = rule.evaluate(window, course);
    if (result.fires) {
      return {
        id: ulid(),
        generatedAt: nowISO(),
        windowStart: window[window.length - 1].date,
        windowEnd: window[0].date,
        ruleId: rule.id,
        headline: result.output.headline,
        body: result.output.body,
        affectedHoles: result.output.affectedHoles,
      };
    }
  }

  const fb = fallbackPositive(window, course);
  return {
    id: ulid(),
    generatedAt: nowISO(),
    windowStart: window[window.length - 1].date,
    windowEnd: window[0].date,
    ruleId: "positive_observation",
    headline: fb.headline,
    body: fb.body,
    affectedHoles: fb.affectedHoles,
  };
}
