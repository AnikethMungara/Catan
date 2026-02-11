/**
 * Largest army tracking.
 * Minimum 3 knights played to qualify.
 * Transfers only when strictly surpassed; ties don't transfer.
 */

import type { GameState } from "../types/game.js";
import { LARGEST_ARMY_MINIMUM } from "../constants/costs.js";

/**
 * Recalculate largest army after a knight is played.
 */
export function updateLargestArmy(state: GameState): GameState {
  const currentHolder = state.players.find((p) => p.hasLargestArmy);

  // Find the player with the most knights
  let maxKnights = 0;
  let maxPlayer: string | null = null;
  let tied = false;

  for (const player of state.players) {
    if (player.knightsPlayed > maxKnights) {
      maxKnights = player.knightsPlayed;
      maxPlayer = player.id;
      tied = false;
    } else if (player.knightsPlayed === maxKnights && maxKnights > 0) {
      tied = true;
    }
  }

  // Must meet minimum
  if (maxKnights < LARGEST_ARMY_MINIMUM) {
    return {
      ...state,
      players: state.players.map((p) => ({ ...p, hasLargestArmy: false })),
    };
  }

  let newHolderId: string | null = null;

  if (currentHolder) {
    if (currentHolder.knightsPlayed >= maxKnights) {
      // Current holder still has the most (or tied) - keep them
      newHolderId = currentHolder.id;
    } else if (!tied) {
      // Someone strictly surpassed - transfer
      newHolderId = maxPlayer;
    } else {
      // Current holder lost and there's a tie - nobody holds it
      newHolderId = null;
    }
  } else {
    // No current holder
    if (!tied && maxPlayer) {
      newHolderId = maxPlayer;
    }
    // If tied, nobody gets it
  }

  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      hasLargestArmy: p.id === newHolderId,
    })),
  };
}
