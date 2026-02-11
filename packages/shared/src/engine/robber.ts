/**
 * Robber mechanics: discard, move, steal.
 */

import type { CubeCoord } from "../types/coordinates.js";
import { serializeVertex } from "../types/coordinates.js";
import type { GameState } from "../types/game.js";
import type { ResourceBundle, ResourceType } from "../types/resources.js";
import { RESOURCE_TYPES, bundleTotal, EMPTY_BUNDLE } from "../types/resources.js";
import { ROBBER_DISCARD_THRESHOLD } from "../constants/costs.js";
import {
  updatePlayer,
  updateTurnState,
  addLogEntry,
  getPlayer,
  addBankResources,
  updateBoard,
  transferResources,
} from "./state-helpers.js";
import { hexVertices, canonicalizeVertex } from "./coordinate-system.js";
import { SeededRandom } from "../utils/random.js";

/**
 * Get players who need to discard (>7 cards after a 7 is rolled).
 * Returns a Map of playerId -> number of cards to discard.
 */
export function getPlayersToDiscard(
  state: GameState
): Map<string, number> {
  const result = new Map<string, number>();
  for (const player of state.players) {
    const total = bundleTotal(player.resources);
    if (total > ROBBER_DISCARD_THRESHOLD) {
      result.set(player.id, Math.floor(total / 2));
    }
  }
  return result;
}

/**
 * Process a player's discard action.
 * Returns the updated state. When all discards are complete,
 * transitions to MOVE_ROBBER.
 */
export function processDiscard(
  state: GameState,
  playerId: string,
  resources: ResourceBundle
): GameState {
  const player = getPlayer(state, playerId);
  const discardCount = bundleTotal(resources);

  // Remove resources from player, add back to bank
  let result = updatePlayer(state, playerId, {
    resources: {
      wood: player.resources.wood - resources.wood,
      brick: player.resources.brick - resources.brick,
      sheep: player.resources.sheep - resources.sheep,
      wheat: player.resources.wheat - resources.wheat,
      ore: player.resources.ore - resources.ore,
    },
  });
  result = addBankResources(result, resources);

  result = addLogEntry(
    result,
    "DISCARD",
    `${player.name} discarded ${discardCount} cards`
  );

  // Remove this player from pending discards
  const newPending = new Map(state.turnState.pendingDiscards);
  newPending.delete(playerId);

  result = updateTurnState(result, { pendingDiscards: newPending });

  // If all discards complete, move to MOVE_ROBBER
  if (newPending.size === 0) {
    result = updateTurnState(result, { mainSubPhase: "MOVE_ROBBER" });
  }

  return result;
}

/**
 * Move the robber to a new hex.
 * Returns the updated state with transition to STEAL or TRADE_BUILD_PLAY.
 */
export function moveRobber(
  state: GameState,
  newHex: CubeCoord,
  movedByPlayerId: string
): GameState {
  const player = getPlayer(state, movedByPlayerId);

  let result = updateBoard(state, { robberHex: newHex });

  result = addLogEntry(result, "MOVE_ROBBER", `${player.name} moved the robber`);

  // Find players with buildings adjacent to the new robber hex (excluding the mover)
  const adjacentPlayers = getPlayersAdjacentToHex(result, newHex, movedByPlayerId);

  if (adjacentPlayers.length === 0) {
    // No one to steal from — skip to TRADE_BUILD_PLAY
    result = updateTurnState(result, {
      mainSubPhase: "TRADE_BUILD_PLAY",
      mustStealFrom: [],
    });
  } else if (adjacentPlayers.length === 1) {
    // Only one player — auto-steal
    const targetPlayer = getPlayer(result, adjacentPlayers[0]);
    if (bundleTotal(targetPlayer.resources) === 0) {
      // Target has no resources — skip stealing
      result = addLogEntry(
        result,
        "STEAL",
        `${player.name} has no one to steal from`
      );
      result = updateTurnState(result, {
        mainSubPhase: "TRADE_BUILD_PLAY",
        mustStealFrom: [],
      });
    } else {
      result = updateTurnState(result, {
        mainSubPhase: "STEAL",
        mustStealFrom: adjacentPlayers,
      });
    }
  } else {
    // Multiple players — player must choose
    // Filter out players with 0 resources
    const stealable = adjacentPlayers.filter((pid) => {
      const p = getPlayer(result, pid);
      return bundleTotal(p.resources) > 0;
    });

    if (stealable.length === 0) {
      result = addLogEntry(
        result,
        "STEAL",
        `${player.name} has no one to steal from`
      );
      result = updateTurnState(result, {
        mainSubPhase: "TRADE_BUILD_PLAY",
        mustStealFrom: [],
      });
    } else {
      result = updateTurnState(result, {
        mainSubPhase: "STEAL",
        mustStealFrom: stealable,
      });
    }
  }

  return result;
}

/**
 * Steal a random resource from a target player.
 */
export function stealResource(
  state: GameState,
  thief: string,
  targetId: string,
  seed: number
): GameState {
  const thiefPlayer = getPlayer(state, thief);
  const target = getPlayer(state, targetId);

  if (bundleTotal(target.resources) === 0) {
    let result = addLogEntry(
      state,
      "STEAL",
      `${thiefPlayer.name} tried to steal from ${target.name} but they have no resources`
    );
    result = updateTurnState(result, {
      mainSubPhase: "TRADE_BUILD_PLAY",
      mustStealFrom: [],
    });
    return result;
  }

  // Build an array of all resources the target has
  const rng = new SeededRandom(seed);
  const available: ResourceType[] = [];
  for (const res of RESOURCE_TYPES) {
    for (let i = 0; i < target.resources[res]; i++) {
      available.push(res);
    }
  }

  const stolenResource = available[rng.nextInt(0, available.length - 1)];
  const stolenBundle: ResourceBundle = {
    ...EMPTY_BUNDLE,
    [stolenResource]: 1,
  };

  let result = transferResources(state, targetId, thief, stolenBundle);

  result = addLogEntry(
    result,
    "STEAL",
    `${thiefPlayer.name} stole a resource from ${target.name}`
  );

  result = updateTurnState(result, {
    mainSubPhase: "TRADE_BUILD_PLAY",
    mustStealFrom: [],
  });

  return result;
}

/**
 * Get player IDs who have buildings adjacent to a hex (excluding the specified player).
 */
function getPlayersAdjacentToHex(
  state: GameState,
  hex: CubeCoord,
  excludePlayerId: string
): string[] {
  const vertices = hexVertices(hex);
  const playerIds = new Set<string>();

  for (const vertex of vertices) {
    const canonV = canonicalizeVertex(vertex);
    const vKey = serializeVertex(canonV);
    const building = state.board.buildings.get(vKey);
    if (building && building.playerId !== excludePlayerId) {
      playerIds.add(building.playerId);
    }
  }

  return [...playerIds];
}
