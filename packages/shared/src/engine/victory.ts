/**
 * Victory point calculation and win detection.
 */

import type { GameState } from "../types/game.js";
import {
  VP_SETTLEMENT,
  VP_CITY,
  VP_LONGEST_ROAD,
  VP_LARGEST_ARMY,
  VP_DEV_CARD,
  VP_TO_WIN,
} from "../constants/costs.js";
import { addLogEntry } from "./state-helpers.js";

export type VPBreakdown = {
  settlements: number;
  cities: number;
  longestRoad: number;
  largestArmy: number;
  victoryPointCards: number;
  total: number;
  publicTotal: number; // excludes hidden VP cards
};

/**
 * Calculate VP breakdown for a player.
 */
export function calculateVP(
  state: GameState,
  playerId: string
): VPBreakdown {
  const player = state.players.find((p) => p.id === playerId)!;

  // Note: when you build a city, settlement goes back to pool.
  // So actual settlements on the board = settlementsPlaced - citiesPlaced
  // Wait no — citiesPlaced counts from initial pool of 4.
  // settlementsRemaining decreases when placing, increases when upgrading to city.
  // So settlements on board = INITIAL_PIECES.settlements - player.settlementsRemaining
  // Actually let me re-think: when we place a settlement, settlementsRemaining goes down.
  // When we upgrade to city, settlementsRemaining goes UP (piece returns) and citiesRemaining goes DOWN.
  // So on-board settlements = INITIAL_PIECES.settlements - settlementsRemaining - citiesPlaced... no.
  // Hmm, let me just count from the board state directly.

  let settlementCount = 0;
  let cityCount = 0;
  for (const [, building] of state.board.buildings) {
    if (building.playerId !== playerId) continue;
    if (building.type === "settlement") settlementCount++;
    else cityCount++;
  }

  const vpCards = player.devCards.filter(
    (c) => c.type === "victoryPoint"
  ).length;

  const settlements = settlementCount * VP_SETTLEMENT;
  const cities = cityCount * VP_CITY;
  const longestRoad = player.hasLongestRoad ? VP_LONGEST_ROAD : 0;
  const largestArmy = player.hasLargestArmy ? VP_LARGEST_ARMY : 0;
  const victoryPointCards = vpCards * VP_DEV_CARD;

  const total =
    settlements + cities + longestRoad + largestArmy + victoryPointCards;
  const publicTotal = total - victoryPointCards;

  return {
    settlements,
    cities,
    longestRoad,
    largestArmy,
    victoryPointCards,
    total,
    publicTotal,
  };
}

/**
 * Check if the current player has won.
 * Only the active player can win on their turn.
 * Returns the updated state (transitioned to GAME_OVER if there's a winner).
 */
export function checkVictory(state: GameState): GameState {
  if (state.turnState.phase === "GAME_OVER") return state;
  if (state.turnState.phase === "SETUP") return state;

  const currentPlayer = state.players[state.turnState.currentPlayerIndex];
  const vp = calculateVP(state, currentPlayer.id);

  if (vp.total >= VP_TO_WIN) {
    let result = addLogEntry(
      state,
      "GAME_OVER",
      `${currentPlayer.name} wins with ${vp.total} victory points!`
    );
    result = {
      ...result,
      winner: currentPlayer.id,
      turnState: {
        ...result.turnState,
        phase: "GAME_OVER",
      },
    };
    return result;
  }

  return state;
}
