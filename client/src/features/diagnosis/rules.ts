import type { Rule, RuleResult } from "./types";
import type { Round, CourseHole, HoleFeature } from "../rounds/types";
import { FEATURE_LABELS, FRONT_PAR, BACK_PAR } from "../course/west-sussex";
import { computeHoleStats } from "../../lib/statistics";
import { isFullRound } from "../../lib/round";

function listFormat(nums: number[]): string {
  if (nums.length === 0) return "";
  if (nums.length === 1) return String(nums[0]);
  if (nums.length === 2) return `${nums[0]} and ${nums[1]}`;
  return `${nums.slice(0, -1).join(", ")}, and ${nums[nums.length - 1]}`;
}

function holeMeans(window: Round[]): Map<number, number> {
  const sums = new Map<number, { s: number; n: number }>();
  for (const r of window) {
    for (const h of r.holes) {
      if (typeof h.score !== "number" || h.score <= 0) continue;
      const cur = sums.get(h.hole) || { s: 0, n: 0 };
      cur.s += h.score;
      cur.n += 1;
      sums.set(h.hole, cur);
    }
  }
  const out = new Map<number, number>();
  sums.forEach((v, k) => out.set(k, v.s / v.n));
  return out;
}

/** Count of scored instances of a given hole across the window. */
function holeSampleCount(window: Round[], hole: number): number {
  let n = 0;
  for (const r of window) {
    const h = r.holes.find((x) => x.hole === hole);
    if (h && typeof h.score === "number" && h.score > 0) n += 1;
  }
  return n;
}

function tagRate(window: Round[], tag: string): number {
  let total = 0;
  let with_ = 0;
  for (const r of window) {
    for (const h of r.holes) {
      if (typeof h.score !== "number" || h.score <= 0) continue;
      total += 1;
      if (h.tags.includes(tag as any)) with_ += 1;
    }
  }
  if (total === 0) return 0;
  return with_ / total;
}

/** Rule 1 — front_back_split. Full rounds in the window only. */
const front_back_split: Rule = {
  id: "front_back_split",
  priority: 1,
  evaluate(window, course): RuleResult {
    const fullRounds = window.filter(isFullRound);
    if (fullRounds.length < 5) return { fires: false };
    let frontTotal = 0, frontN = 0;
    let backTotal = 0, backN = 0;
    for (const r of fullRounds) {
      let f = 0, b = 0;
      for (const h of r.holes) {
        if (typeof h.score !== "number" || h.score <= 0) continue;
        if (h.hole <= 9) f += h.score; else b += h.score;
      }
      frontTotal += f - FRONT_PAR; frontN += 1;
      backTotal += b - BACK_PAR; backN += 1;
    }
    if (frontN < 5 || backN < 5) return { fires: false };
    const frontDelta = frontTotal / frontN;
    const backDelta = backTotal / backN;
    if (backDelta - frontDelta <= 3) return { fires: false };

    // red back-9 holes within window
    const stats = computeHoleStats(window, course);
    const redBack = stats.filter((s) => s.hole > 9 && s.status === "bad").map((s) => s.hole).sort((a, b) => a - b);
    const rightDog = course.filter((c) => c.hole > 9 && c.features.includes("dogleg_right")).map((c) => c.hole);
    const detectsRightDoglegPattern = redBack.filter((h) => rightDog.includes(h)).length >= 3;

    const fmt = (n: number) => (n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1));
    let body = `You play the front nine in ${fmt(frontDelta)} on average. The back, ${fmt(backDelta)}.`;
    if (redBack.length >= 3) {
      body += ` Holes ${listFormat(redBack)} are doing most of the damage.`;
    }
    if (detectsRightDoglegPattern) {
      body += ` Hutchison and Campbell built four right-doglegs into the back nine; the course rewards a power fade.`;
    }
    return {
      fires: true,
      output: {
        headline: `Your back nine is costing you ${(backDelta - frontDelta).toFixed(1)} more strokes than your front.`,
        body,
        affectedHoles: redBack,
      },
    };
  },
};

/** Rule 2 — shared_feature_red */
const shared_feature_red: Rule = {
  id: "shared_feature_red",
  priority: 2,
  evaluate(window, course): RuleResult {
    const stats = computeHoleStats(window, course);
    const redHoles = new Set(stats.filter((s) => s.status === "bad").map((s) => s.hole));
    if (redHoles.size === 0) return { fires: false };
    const buckets = new Map<HoleFeature, number[]>();
    for (const c of course) {
      if (!redHoles.has(c.hole)) continue;
      for (const f of c.features) {
        const arr = buckets.get(f) || [];
        arr.push(c.hole);
        buckets.set(f, arr);
      }
    }
    const candidates: { feature: HoleFeature; holes: number[] }[] = [];
    buckets.forEach((holes, f) => {
      if (holes.length >= 3) candidates.push({ feature: f, holes });
    });
    if (candidates.length === 0) return { fires: false };
    candidates.sort((a, b) => b.holes.length - a.holes.length);
    const chosen = candidates[0];
    const label = FEATURE_LABELS[chosen.feature] || chosen.feature.replace(/_/g, " ");
    const sorted = [...chosen.holes].sort((a, b) => a - b);
    let body = `Across the last ten cards, holes ${listFormat(sorted)} share one trait — they are ${label}, and they are taking the most from you.`;
    if (chosen.feature === "dogleg_right") {
      body += ` Hutchison and Campbell laid these on the back nine to reward a power fade; the course is asking for a shape you don't yet trust.`;
    } else if (chosen.feature === "long_par_4") {
      body += ` Long fours don't allow a soft second; the tee shot has to be enough.`;
    } else if (chosen.feature === "dogleg_left") {
      body += ` A right-to-left shape would tighten the corner and shorten the second.`;
    } else if (chosen.feature === "long_par_3") {
      body += ` The course's long par 3s ask for a wood off the tee — the front-right bail-out is a respectable miss.`;
    }
    return {
      fires: true,
      output: {
        headline: `The ${label} are eating your round.`,
        body,
        affectedHoles: sorted,
      },
    };
  },
};

/** Rule 3 — three_putt_epidemic */
const three_putt_epidemic: Rule = {
  id: "three_putt_epidemic",
  priority: 3,
  evaluate(window): RuleResult {
    const rate = tagRate(window, "three_putt");
    if (rate <= 0.25) return { fires: false };
    const pct = Math.round(rate * 100);
    return {
      fires: true,
      output: {
        headline: `You three-putted on ${pct}% of holes this stretch.`,
        body: `That's roughly ${(rate * 18).toFixed(1)} three-putts a round. The greens at West Sussex run true; the strokes are coming back through tempo and read, not line. A long lag-putt drill before each round would be cheap.`,
      },
    };
  },
};

/** Rule 4 — penalty_hemorrhage */
const penalty_hemorrhage: Rule = {
  id: "penalty_hemorrhage",
  priority: 4,
  evaluate(window): RuleResult {
    let total = 0, with_ = 0;
    for (const r of window) {
      for (const h of r.holes) {
        if (typeof h.score !== "number" || h.score <= 0) continue;
        total += 1;
        if (h.tags.includes("ob") || h.tags.includes("heather")) with_ += 1;
      }
    }
    if (total === 0) return { fires: false };
    const rate = with_ / total;
    if (rate <= 0.15) return { fires: false };
    const pct = Math.round(rate * 100);
    return {
      fires: true,
      output: {
        headline: `${pct}% of your holes had a penalty stroke.`,
        body: `Heather and out-of-bounds are West Sussex's currency. At ${pct}%, the round is paying tax on every other hole. The fix isn't more distance — it's a tee club you trust to stay in play.`,
      },
    };
  },
};

/** Rule 5 — long_par_3_struggle (holes 6 and 12) */
const long_par_3_struggle: Rule = {
  id: "long_par_3_struggle",
  priority: 5,
  evaluate(window): RuleResult {
    const sample = holeSampleCount(window, 6) + holeSampleCount(window, 12);
    if (sample < 4) return { fires: false };
    const means = holeMeans(window);
    const m6 = means.get(6);
    const m12 = means.get(12);
    if (m6 === undefined || m12 === undefined) return { fires: false };
    const mean = (m6 + m12) / 2;
    if (mean <= 4.6) return { fires: false };
    return {
      fires: true,
      output: {
        headline: `The long par 3s (6 and 12) are bogeys-or-worse most rounds.`,
        body: `Six is the famous one — a par-4 in miniature. Twelve plays its full 232 yards downhill, often into the wind. You're averaging ${mean.toFixed(1)} between them; the front-right bail-out exists for a reason. Take the bogey, take the next tee.`,
        affectedHoles: [6, 12],
      },
    };
  },
};

/** Rule 6 — closing_holes_collapse (16-18 mean over par > 1.3 each) */
const closing_holes_collapse: Rule = {
  id: "closing_holes_collapse",
  priority: 6,
  evaluate(window, course): RuleResult {
    const sample = holeSampleCount(window, 16) + holeSampleCount(window, 17) + holeSampleCount(window, 18);
    if (sample < 6) return { fires: false };
    const means = holeMeans(window);
    const result: number[] = [];
    let okAll = true;
    for (const h of [16, 17, 18]) {
      const m = means.get(h);
      const par = course.find((c) => c.hole === h)!.par;
      if (m === undefined) { okAll = false; break; }
      if (m - par <= 1.3) { okAll = false; break; }
      result.push(Math.round((m - par) * 10) / 10);
    }
    if (!okAll) return { fires: false };
    return {
      fires: true,
      output: {
        headline: `You're losing the round on 16, 17, and 18.`,
        body: `Sixteen is bunkerless but unforgiving on the approach; seventeen and eighteen are long fours that demand two of your best. Across this stretch you're going +${result[0]}, +${result[1]}, +${result[2]} on the closers. Walk to the sixteenth tee already accepting bogey-bogey-bogey is a fine finish — the round is won earlier than this.`,
        affectedHoles: [16, 17, 18],
      },
    };
  },
};

/** Rule 7 — first_hole_warmup (mean on hole 1 > 6.0 despite par 5) */
const first_hole_warmup: Rule = {
  id: "first_hole_warmup",
  priority: 7,
  evaluate(window): RuleResult {
    if (holeSampleCount(window, 1) < 4) return { fires: false };
    const means = holeMeans(window);
    const m1 = means.get(1);
    if (m1 === undefined || m1 <= 6.0) return { fires: false };
    return {
      fires: true,
      output: {
        headline: `You're giving away strokes on the only par 5.`,
        body: `Hole one is the gentlest opener on the card — a soft dogleg left, reachable in regulation, room to score. You're averaging ${m1.toFixed(1)}. Get to the course early, hit ten balls, and walk to the first tee already loose.`,
        affectedHoles: [1],
      },
    };
  },
};

export const RULES: Rule[] = [
  front_back_split,
  shared_feature_red,
  three_putt_epidemic,
  penalty_hemorrhage,
  long_par_3_struggle,
  closing_holes_collapse,
  first_hole_warmup,
];

/** Fallback — positive_observation: pick 3 holes with strongest negative delta. */
export function fallbackPositive(window: Round[], course: CourseHole[]): { headline: string; body: string; affectedHoles: number[] } {
  const stats = computeHoleStats(window, course);
  const candidates = stats
    .filter((s) => s.count >= 5 && s.delta != null && s.delta < 0)
    .sort((a, b) => (a.delta! - b.delta!));
  const top = candidates.slice(0, 3);
  if (top.length === 0) {
    return {
      headline: `Steady ten rounds. Nothing pulling the average either way.`,
      body: `No single hole is leaking strokes and no part of the course is running away from you. That's its own kind of progress — keep logging, and the patterns will surface.`,
      affectedHoles: [],
    };
  }
  const totalSaved = top.reduce((s, x) => s + Math.abs(x.delta!), 0);
  const holesText = listFormat(top.map((x) => x.hole));
  return {
    headline: `Your ${top.length === 1 ? "hole" : "holes"} ${holesText} ${top.length === 1 ? "is" : "are"} saving ${totalSaved.toFixed(1)} strokes a round. Keep playing them the way you do.`,
    body: `Across the last ten rounds these are the holes you've taken to. Whatever your tee club, whatever your approach — note it down and bring it back next time. The card rewards what you already do well here.`,
    affectedHoles: top.map((x) => x.hole),
  };
}
