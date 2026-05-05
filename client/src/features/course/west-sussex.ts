import type { CourseHole, Tees } from "../rounds/types";

// West Sussex Golf Club — yardages and stroke indexes from the club website's
// Course Overview table. Par identical for both tees; SI shared.
export const WEST_SUSSEX: CourseHole[] = [
  { hole: 1, par: 5, yards: { white: 488, yellow: 459 }, strokeIndex: 16, designNote: "Only par 5 on the card. A gentle dogleg left and a chance to score before the course turns serious.", features: ["reachable_par_5", "dogleg_left"] },
  { hole: 2, par: 4, yards: { white: 410, yellow: 398 }, strokeIndex: 6, designNote: "Bunkerless falling four. Drive freely, the green is open.", features: ["bunkerless"] },
  { hole: 3, par: 4, yards: { white: 364, yellow: 350 }, strokeIndex: 12, designNote: "Strategic bunkering through the landing zone. Position over power.", features: [] },
  { hole: 4, par: 4, yards: { white: 390, yellow: 348 }, strokeIndex: 4, designNote: "Rumpled fairway, fine green site. Reachable in two for the bold.", features: [] },
  { hole: 5, par: 3, yards: { white: 157, yellow: 138 }, strokeIndex: 18, designNote: "Short iron to a well-bunkered green. The first of three par 3s in four holes.", features: ["short_par_3"] },
  { hole: 6, par: 3, yards: { white: 222, yellow: 210 }, strokeIndex: 8, designNote: "The famous one. Plays as a par 4 in miniature; the front-right bail-out is no shame.", features: ["long_par_3", "forced_carry"] },
  { hole: 7, par: 4, yards: { white: 440, yellow: 427 }, strokeIndex: 2, designNote: "Strong par 4. The course's first proper test of the long game.", features: ["long_par_4"] },
  { hole: 8, par: 3, yards: { white: 183, yellow: 170 }, strokeIndex: 10, designNote: "Elevated green beyond a small gully. Trust the yardage.", features: [] },
  { hole: 9, par: 4, yards: { white: 377, yellow: 351 }, strokeIndex: 14, designNote: "The most reachable par 4 on the card. A score-saver before the turn.", features: [] },
  { hole: 10, par: 4, yards: { white: 394, yellow: 385 }, strokeIndex: 9, designNote: "Hard dogleg left, four bunkers in the corner. A draw is rewarded; a block-right is buried in heather.", features: ["dogleg_left"] },
  { hole: 11, par: 4, yards: { white: 448, yellow: 433 }, strokeIndex: 1, designNote: "Stroke index 1. Long, demands a power fade off the tee. Bogey is a respectable score.", features: ["long_par_4", "dogleg_right"] },
  { hole: 12, par: 3, yards: { white: 221, yellow: 199 }, strokeIndex: 13, designNote: "Two-twenty-two yards downhill, sometimes against the wind. Front-right bail-out, again.", features: ["long_par_3"] },
  { hole: 13, par: 4, yards: { white: 378, yellow: 361 }, strokeIndex: 7, designNote: "Famous bunkering. The through-the-air approach is the toughest second shot on the course.", features: ["dogleg_right"] },
  { hole: 14, par: 4, yards: { white: 431, yellow: 418 }, strokeIndex: 3, designNote: "Long, with sand traps set short of the green that punish a thin layup.", features: ["long_par_4"] },
  { hole: 15, par: 3, yards: { white: 145, yellow: 127 }, strokeIndex: 17, designNote: "A scoring opportunity. Pond short, false front. Take enough club.", features: ["short_par_3", "water"] },
  { hole: 16, par: 4, yards: { white: 364, yellow: 353 }, strokeIndex: 15, designNote: "Bunkerless. Drive over the crest to a diagonal shelf, approach into a heathery knoll. Pulborough at its purest.", features: ["bunkerless", "dogleg_right"] },
  { hole: 17, par: 4, yards: { white: 439, yellow: 431 }, strokeIndex: 5, designNote: "Diagonal bunkers across the green. A good drive still leaves work to do.", features: ["long_par_4", "dogleg_right"] },
  { hole: 18, par: 4, yards: { white: 414, yellow: 403 }, strokeIndex: 11, designNote: "Tough closer. Two of your best to find the green in regulation.", features: ["long_par_4"] },
];

export const FRONT_PAR = WEST_SUSSEX.slice(0, 9).reduce((s, h) => s + h.par, 0);
export const BACK_PAR = WEST_SUSSEX.slice(9, 18).reduce((s, h) => s + h.par, 0);
export const COURSE_PAR = FRONT_PAR + BACK_PAR;

export const COURSE_YARDS_WHITE = WEST_SUSSEX.reduce((s, h) => s + h.yards.white, 0);
export const COURSE_YARDS_YELLOW = WEST_SUSSEX.reduce((s, h) => s + h.yards.yellow, 0);

export const TEE_RATINGS: Record<Tees, { rating: number; slope: number }> = {
  white: { rating: 68, slope: 128 },
  yellow: { rating: 67, slope: 124 },
};

// Friendly labels for the HoleFeature tags used in diagnoses.
export const FEATURE_LABELS: Record<string, string> = {
  dogleg_left: "left-doglegs",
  dogleg_right: "right-doglegs",
  long_par_3: "long par 3s",
  short_par_3: "short par 3s",
  long_par_4: "long par 4s",
  reachable_par_5: "the reachable par 5",
  forced_carry: "forced-carry holes",
  bunkerless: "bunkerless holes",
  water: "water holes",
};

export const TEE_LABEL: Record<Tees, string> = {
  white: "White",
  yellow: "Yellow",
};
