import type { Round, CourseHole } from "../rounds/types";

export type RuleOutput = {
  headline: string;
  body: string;
  affectedHoles?: number[];
};

export type RuleResult =
  | { fires: false }
  | { fires: true; output: RuleOutput };

export interface Rule {
  id: string;
  priority: number;
  evaluate(window: Round[], course: CourseHole[]): RuleResult;
}
