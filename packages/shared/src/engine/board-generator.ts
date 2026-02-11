/**
 * Random board generation for Settlers of Catan.
 * Generates hex tiles, number tokens (with 6/8 adjacency constraint),
 * and port assignments.
 */

import type { Board, HexTile, Port, PortType, TerrainType } from "../types/board.js";
import type { CubeCoord } from "../types/coordinates.js";
import { serializeHex } from "../types/coordinates.js";
import {
  HEX_POSITIONS,
  NUMBER_TOKEN_SET,
  PORT_POSITIONS,
  PORT_TYPES_SET,
  TERRAIN_DISTRIBUTION,
} from "../constants/board-layout.js";
import { SeededRandom } from "../utils/random.js";
import { shuffle } from "../utils/shuffle.js";
import { hexBoardNeighbors, resolvePortVertices } from "./coordinate-system.js";

/**
 * Creates the terrain tile pool from the distribution.
 */
function createTerrainPool(): TerrainType[] {
  const pool: TerrainType[] = [];
  for (const [terrain, count] of Object.entries(TERRAIN_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) {
      pool.push(terrain as TerrainType);
    }
  }
  return pool;
}

/**
 * Check if placing number tokens satisfies the 6/8 adjacency constraint.
 */
function check68Constraint(hexes: Map<string, HexTile>): boolean {
  for (const [, hex] of hexes) {
    if (hex.numberToken !== 6 && hex.numberToken !== 8) continue;
    const neighbors = hexBoardNeighbors(hex.coord);
    for (const neighbor of neighbors) {
      const neighborHex = hexes.get(serializeHex(neighbor));
      if (
        neighborHex &&
        (neighborHex.numberToken === 6 || neighborHex.numberToken === 8)
      ) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Generate a random Catan board.
 * Uses rejection sampling for the 6/8 constraint.
 */
export function generateBoard(seed: number): Board {
  const rng = new SeededRandom(seed);

  // Step 1: Shuffle terrains and assign to hex positions
  const terrainPool = createTerrainPool();
  const terrains = shuffle(terrainPool, rng);

  // Step 2: Assign number tokens to non-desert hexes with 6/8 constraint
  let hexes: Map<string, HexTile>;
  let attempts = 0;
  const maxAttempts = 1000;

  do {
    attempts++;
    const numberTokens = shuffle([...NUMBER_TOKEN_SET], rng);
    hexes = new Map();
    let tokenIndex = 0;

    for (let i = 0; i < HEX_POSITIONS.length; i++) {
      const coord = HEX_POSITIONS[i];
      const terrain = terrains[i];
      const numberToken =
        terrain === "desert" ? null : numberTokens[tokenIndex++];

      hexes.set(serializeHex(coord), {
        coord,
        terrain,
        numberToken: numberToken ?? null,
      });
    }

    if (check68Constraint(hexes)) break;

    if (attempts >= maxAttempts) {
      // Fallback: swap 6s and 8s with other tokens until constraint is met
      fixConstraint(hexes, rng);
      break;
    }
  } while (true);

  // Step 3: Find the desert hex for the robber
  let robberHex: CubeCoord = HEX_POSITIONS[0];
  for (const [, hex] of hexes) {
    if (hex.terrain === "desert") {
      robberHex = hex.coord;
      break;
    }
  }

  // Step 4: Generate ports
  const portTypes = shuffle([...PORT_TYPES_SET], rng) as PortType[];
  const ports: Port[] = PORT_POSITIONS.map((pos, i) => {
    const [v1, v2] = resolvePortVertices(pos.hexQ, pos.hexR, pos.hexS, pos.edge);
    const portType = portTypes[i];
    return {
      vertices: [v1, v2] as const,
      type: portType,
      ratio: portType === "generic" ? 3 : 2,
    };
  });

  return {
    hexes,
    buildings: new Map(),
    roads: new Map(),
    ports,
    robberHex,
  };
}

/**
 * Fix the 6/8 constraint by swapping offending tokens with non-6/8 tokens.
 */
function fixConstraint(hexes: Map<string, HexTile>, rng: SeededRandom): void {
  for (let iter = 0; iter < 100; iter++) {
    let violated = false;

    for (const [key, hex] of hexes) {
      if (hex.numberToken !== 6 && hex.numberToken !== 8) continue;

      const neighbors = hexBoardNeighbors(hex.coord);
      for (const neighbor of neighbors) {
        const neighborHex = hexes.get(serializeHex(neighbor));
        if (
          neighborHex &&
          (neighborHex.numberToken === 6 || neighborHex.numberToken === 8)
        ) {
          violated = true;
          // Find a non-6/8 hex to swap with
          const swapCandidates: string[] = [];
          for (const [k, h] of hexes) {
            if (
              h.numberToken !== null &&
              h.numberToken !== 6 &&
              h.numberToken !== 8
            ) {
              swapCandidates.push(k);
            }
          }
          if (swapCandidates.length > 0) {
            const swapKey =
              swapCandidates[rng.nextInt(0, swapCandidates.length - 1)];
            const swapHex = hexes.get(swapKey)!;
            // Swap number tokens
            hexes.set(key, { ...hex, numberToken: swapHex.numberToken });
            hexes.set(swapKey, { ...swapHex, numberToken: hex.numberToken });
          }
          break;
        }
      }
      if (violated) break;
    }

    if (!violated || check68Constraint(hexes)) break;
  }
}
