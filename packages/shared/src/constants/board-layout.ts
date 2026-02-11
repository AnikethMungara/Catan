import type { CubeCoord } from "../types/coordinates.js";
import type { TerrainType } from "../types/board.js";

// All 19 hex positions on the standard Catan board (radius 2)
export const HEX_POSITIONS: readonly CubeCoord[] = [
  // Ring 0 (center)
  { q: 0, r: 0, s: 0 },
  // Ring 1
  { q: 1, r: -1, s: 0 },
  { q: 1, r: 0, s: -1 },
  { q: 0, r: 1, s: -1 },
  { q: -1, r: 1, s: 0 },
  { q: -1, r: 0, s: 1 },
  { q: 0, r: -1, s: 1 },
  // Ring 2
  { q: 2, r: -2, s: 0 },
  { q: 2, r: -1, s: -1 },
  { q: 2, r: 0, s: -2 },
  { q: 1, r: 1, s: -2 },
  { q: 0, r: 2, s: -2 },
  { q: -1, r: 2, s: -1 },
  { q: -2, r: 2, s: 0 },
  { q: -2, r: 1, s: 1 },
  { q: -2, r: 0, s: 2 },
  { q: -1, r: -1, s: 2 },
  { q: 0, r: -2, s: 2 },
  { q: 1, r: -2, s: 1 },
];

// Standard terrain distribution (19 tiles total)
export const TERRAIN_DISTRIBUTION: Record<TerrainType, number> = {
  forest: 4,
  pasture: 4,
  fields: 4,
  hills: 3,
  mountains: 3,
  desert: 1,
};

// Number tokens for non-desert hexes (18 tokens)
export const NUMBER_TOKEN_SET: readonly number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];

// Port positions: each port connects to two vertices on the coast.
// Defined as pairs of vertex coordinates (will be filled from coordinate system).
// There are 9 ports: 4 generic (3:1) and 5 specific (2:1, one per resource).
// The port positions are edges on the boundary between land and ocean.
// We define them by specifying which two vertices of an outer hex they connect to.
// The port type assignment is randomized, but positions are fixed.

// Port edge definitions: each entry is [hex, vertexDir1, vertexDir2]
// These represent the 9 coastal edges where ports are placed.
// We'll define the vertex pairs explicitly using the coordinate system.
// For now, we define port positions as pairs of vertex coordinate strings.
// These will be resolved to actual VertexCoord pairs in the coordinate system.

export type PortPosition = {
  readonly hexQ: number;
  readonly hexR: number;
  readonly hexS: number;
  readonly edge: "NE" | "E" | "SE" | "NW" | "W" | "SW";
};

// 9 port positions around the board perimeter
// Each port sits on a coastal edge of an outer hex
export const PORT_POSITIONS: readonly PortPosition[] = [
  { hexQ: 2, hexR: -2, hexS: 0, edge: "NE" },
  { hexQ: 2, hexR: -1, hexS: -1, edge: "E" },
  { hexQ: 2, hexR: 0, hexS: -2, edge: "SE" },
  { hexQ: 0, hexR: 2, hexS: -2, edge: "SE" },
  { hexQ: -1, hexR: 2, hexS: -1, edge: "SW" },
  { hexQ: -2, hexR: 2, hexS: 0, edge: "SW" },
  { hexQ: -2, hexR: 0, hexS: 2, edge: "NW" },
  { hexQ: -1, hexR: -1, hexS: 2, edge: "NW" },
  { hexQ: 1, hexR: -2, hexS: 1, edge: "NE" },
];

// Default port types (will be shuffled during board generation)
// 4 generic (3:1) + 5 specific (2:1)
export const PORT_TYPES_SET: readonly ("generic" | "wood" | "brick" | "sheep" | "wheat" | "ore")[] = [
  "generic",
  "generic",
  "generic",
  "generic",
  "wood",
  "brick",
  "sheep",
  "wheat",
  "ore",
];

// Number of each resource in the bank
export const BANK_RESOURCE_COUNT = 19;
