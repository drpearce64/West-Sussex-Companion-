// Spec §3 — data model.
// IDs are ULIDs (sortable, collision-free).

export type HoleTag =
  | "ob"           // out of bounds / lost ball
  | "three_putt"
  | "up_and_down"  // saved par/bogey from off the green
  | "sand"         // bunker shot played
  | "heather"      // ball into heather / penalty area
  | "good_shot";   // remember this

export const HOLE_TAGS: { id: HoleTag; label: string }[] = [
  { id: "ob", label: "OB" },
  { id: "three_putt", label: "3-putt" },
  { id: "up_and_down", label: "Up & down" },
  { id: "sand", label: "Sand" },
  { id: "heather", label: "Heather" },
  { id: "good_shot", label: "Good shot" },
];

export type HoleScore = {
  hole: number;        // 1..18
  score: number | null;
  tags: HoleTag[];
};

export type Tees = "white" | "yellow";

export type Round = {
  id: string;
  date: string;        // ISO YYYY-MM-DD
  partners: string;
  notes?: string;
  holes: HoleScore[];  // length 18, ordered 1..18
  tees: Tees;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 2;
};

export type HoleFeature =
  | "dogleg_left"
  | "dogleg_right"
  | "long_par_3"     // 200+ yards
  | "short_par_3"    // < 170 yards
  | "long_par_4"     // 410+ yards
  | "reachable_par_5"
  | "forced_carry"
  | "bunkerless"
  | "water";

export type CourseHole = {
  hole: number;
  par: 3 | 4 | 5;
  yards: { white: number; yellow: number };
  strokeIndex: number;
  name?: string;
  designNote: string;
  features: HoleFeature[];
};

export type Diagnosis = {
  id: string;
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  ruleId: string;
  headline: string;
  body: string;
  affectedHoles?: number[];
};

/** Draft type stored in the meta table for resuming a partial round. */
export type RoundDraft = {
  date: string;
  partners: string;
  notes: string;
  holes: HoleScore[];
  tees: Tees;
  updatedAt: string;
};

export function emptyHoles(): HoleScore[] {
  return Array.from({ length: 18 }, (_, i) => ({
    hole: i + 1,
    score: null,
    tags: [],
  }));
}

export function totalScore(round: Pick<Round, "holes">): number {
  return round.holes.reduce((sum, h) => sum + (h.score ?? 0), 0);
}

export function isComplete(round: Pick<Round, "holes">): boolean {
  return round.holes.every((h) => typeof h.score === "number" && h.score! > 0);
}
