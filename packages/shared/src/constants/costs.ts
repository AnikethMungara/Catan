import type { ResourceBundle } from "../types/resources.js";
import { bundleFromPartial } from "../types/resources.js";

export const BUILDING_COSTS = {
  road: bundleFromPartial({ wood: 1, brick: 1 }),
  settlement: bundleFromPartial({ wood: 1, brick: 1, sheep: 1, wheat: 1 }),
  city: bundleFromPartial({ wheat: 2, ore: 3 }),
  devCard: bundleFromPartial({ sheep: 1, wheat: 1, ore: 1 }),
} as const satisfies Record<string, ResourceBundle>;

export const INITIAL_PIECES = {
  roads: 15,
  settlements: 5,
  cities: 4,
} as const;

// Minimum requirements for special achievements
export const LONGEST_ROAD_MINIMUM = 5;
export const LARGEST_ARMY_MINIMUM = 3;

// Victory points
export const VP_TO_WIN = 10;
export const VP_SETTLEMENT = 1;
export const VP_CITY = 2;
export const VP_LONGEST_ROAD = 2;
export const VP_LARGEST_ARMY = 2;
export const VP_DEV_CARD = 1;

// Robber discard threshold
export const ROBBER_DISCARD_THRESHOLD = 7;
