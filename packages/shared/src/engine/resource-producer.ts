/**
 * Resource production: given a dice roll, compute which players get which resources.
 * Handles robber blocking and bank scarcity rules.
 */

import type { GameState } from "../types/game.js";
import type { ResourceBundle, ResourceType } from "../types/resources.js";
import { EMPTY_BUNDLE, RESOURCE_TYPES } from "../types/resources.js";
import { TERRAIN_RESOURCE } from "../types/board.js";
import { serializeHex, serializeVertex } from "../types/coordinates.js";
import { hexVertices, canonicalizeVertex } from "./coordinate-system.js";

/**
 * Compute resource gains for each player from a dice roll.
 * Returns a Map from playerId to ResourceBundle of gained resources.
 *
 * Bank scarcity rule: if the bank doesn't have enough of a resource
 * to give to all entitled players, nobody gets that resource.
 */
export function produceResources(
  state: GameState,
  diceTotal: number
): Map<string, ResourceBundle> {
  const gains = new Map<string, ResourceBundle>();
  for (const player of state.players) {
    gains.set(player.id, { ...EMPTY_BUNDLE });
  }

  const robberKey = serializeHex(state.board.robberHex);

  // Calculate what each player should receive
  const totalNeeded: Record<ResourceType, number> = {
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0,
  };

  for (const [hexKey, hex] of state.board.hexes) {
    // Skip non-matching, desert, and robber-blocked hexes
    if (hex.numberToken !== diceTotal) continue;
    if (hex.terrain === "desert") continue;
    if (hexKey === robberKey) continue;

    const resource = TERRAIN_RESOURCE[hex.terrain];
    const vertices = hexVertices(hex.coord);

    for (const vertex of vertices) {
      const canonV = canonicalizeVertex(vertex);
      const vKey = serializeVertex(canonV);
      const building = state.board.buildings.get(vKey);

      if (!building) continue;

      const amount = building.type === "city" ? 2 : 1;
      const playerGains = gains.get(building.playerId)!;
      gains.set(building.playerId, {
        ...playerGains,
        [resource]: playerGains[resource] + amount,
      });
      totalNeeded[resource] += amount;
    }
  }

  // Apply bank scarcity rule: if bank can't supply all for a resource, nobody gets it
  for (const res of RESOURCE_TYPES) {
    if (totalNeeded[res] > state.bankResources[res]) {
      // Zero out this resource for all players
      for (const [pid, bundle] of gains) {
        if (bundle[res] > 0) {
          gains.set(pid, { ...bundle, [res]: 0 });
        }
      }
    }
  }

  return gains;
}
