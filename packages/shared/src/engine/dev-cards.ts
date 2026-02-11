/**
 * Development card system: deck creation, buying, and playing cards.
 */

import type { DevCard, DevCardType } from "../types/cards.js";
import { DEV_CARD_DISTRIBUTION } from "../types/cards.js";
import type { GameState } from "../types/game.js";
import type { ResourceType } from "../types/resources.js";
import { EMPTY_BUNDLE } from "../types/resources.js";
import { BUILDING_COSTS } from "../constants/costs.js";
import { SeededRandom } from "../utils/random.js";
import { shuffle } from "../utils/shuffle.js";
import {
  updatePlayer,
  updateTurnState,
  getPlayer,
  addLogEntry,
  takePlayerResources,
  givePlayerResources,
  transferResources,
} from "./state-helpers.js";
import { updateLargestArmy } from "./army-tracker.js";

/**
 * Create a shuffled development card deck.
 */
export function createDevCardDeck(seed: number): DevCardType[] {
  const rng = new SeededRandom(seed);
  const deck: DevCardType[] = [];

  for (const [type, count] of Object.entries(DEV_CARD_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) {
      deck.push(type as DevCardType);
    }
  }

  return shuffle(deck, rng);
}

/**
 * Buy a development card. Removes cost from player, draws from deck.
 */
export function buyDevCard(state: GameState, playerId: string): GameState {
  const player = getPlayer(state, playerId);

  // Draw from top of deck
  const cardType = state.devCardDeck[0];
  const newDeck = state.devCardDeck.slice(1);

  const newCard: DevCard = {
    type: cardType,
    turnAcquired: state.turnState.turnNumber,
  };

  // Remove cost
  let result = takePlayerResources(state, playerId, BUILDING_COSTS.devCard);

  // Add card to player's hand
  result = updatePlayer(result, playerId, {
    devCards: [...player.devCards, newCard],
  });

  // Update deck
  result = {
    ...result,
    devCardDeck: newDeck,
  };

  result = updateTurnState(result, { devCardBoughtThisTurn: true });

  result = addLogEntry(
    result,
    "BUY_DEV_CARD",
    `${player.name} bought a development card`
  );

  return result;
}

/**
 * Play a Knight card: move robber + steal.
 * The robber movement and stealing are handled by the caller using the robber module.
 * This function handles the knight-specific state changes.
 */
export function playKnight(
  state: GameState,
  playerId: string
): GameState {
  const player = getPlayer(state, playerId);

  // Remove the knight card from hand
  let removed = false;
  const newCards = player.devCards.filter((c) => {
    if (!removed && c.type === "knight" && c.turnAcquired < state.turnState.turnNumber) {
      removed = true;
      return false;
    }
    return true;
  });

  let result = updatePlayer(state, playerId, {
    devCards: newCards,
    knightsPlayed: player.knightsPlayed + 1,
  });

  result = updateTurnState(result, { devCardPlayedThisTurn: true });

  result = addLogEntry(
    result,
    "PLAY_KNIGHT",
    `${player.name} played a Knight (${player.knightsPlayed + 1} total)`
  );

  // Check largest army
  result = updateLargestArmy(result);

  return result;
}

/**
 * Play Road Building: place up to 2 free roads.
 * Handled by setting roadBuildingRoadsLeft and letting the game engine
 * process PLACE_ROAD actions without cost.
 */
export function playRoadBuilding(
  state: GameState,
  playerId: string
): GameState {
  const player = getPlayer(state, playerId);

  // Remove the card from hand
  let removed = false;
  const newCards = player.devCards.filter((c) => {
    if (!removed && c.type === "roadBuilding" && c.turnAcquired < state.turnState.turnNumber) {
      removed = true;
      return false;
    }
    return true;
  });

  const roadsToPlace = Math.min(2, player.roadsRemaining);

  let result = updatePlayer(state, playerId, { devCards: newCards });
  result = updateTurnState(result, {
    devCardPlayedThisTurn: true,
    roadBuildingRoadsLeft: roadsToPlace,
  });

  result = addLogEntry(
    result,
    "PLAY_ROAD_BUILDING",
    `${player.name} played Road Building`
  );

  return result;
}

/**
 * Play Year of Plenty: take any 2 resources from the bank.
 */
export function playYearOfPlenty(
  state: GameState,
  playerId: string,
  resources: readonly [ResourceType, ResourceType]
): GameState {
  const player = getPlayer(state, playerId);

  // Remove the card from hand
  let removed = false;
  const newCards = player.devCards.filter((c) => {
    if (!removed && c.type === "yearOfPlenty" && c.turnAcquired < state.turnState.turnNumber) {
      removed = true;
      return false;
    }
    return true;
  });

  let result = updatePlayer(state, playerId, { devCards: newCards });

  // Give resources from bank
  const bundle = { ...EMPTY_BUNDLE };
  for (const res of resources) {
    (bundle as Record<string, number>)[res] += 1;
  }
  result = givePlayerResources(result, playerId, bundle);

  result = updateTurnState(result, { devCardPlayedThisTurn: true });

  result = addLogEntry(
    result,
    "PLAY_YEAR_OF_PLENTY",
    `${player.name} played Year of Plenty and took ${resources[0]} and ${resources[1]}`
  );

  return result;
}

/**
 * Play Monopoly: name a resource, all other players give you all of that type.
 */
export function playMonopoly(
  state: GameState,
  playerId: string,
  resource: ResourceType
): GameState {
  const player = getPlayer(state, playerId);

  // Remove the card from hand
  let removed = false;
  const newCards = player.devCards.filter((c) => {
    if (!removed && c.type === "monopoly" && c.turnAcquired < state.turnState.turnNumber) {
      removed = true;
      return false;
    }
    return true;
  });

  let result = updatePlayer(state, playerId, { devCards: newCards });

  // Collect from all other players
  let totalCollected = 0;
  for (const otherPlayer of result.players) {
    if (otherPlayer.id === playerId) continue;
    const amount = otherPlayer.resources[resource];
    if (amount > 0) {
      const bundle = { ...EMPTY_BUNDLE, [resource]: amount };
      result = transferResources(result, otherPlayer.id, playerId, bundle);
      totalCollected += amount;
    }
  }

  result = updateTurnState(result, { devCardPlayedThisTurn: true });

  result = addLogEntry(
    result,
    "PLAY_MONOPOLY",
    `${player.name} played Monopoly on ${resource} and collected ${totalCollected}`
  );

  return result;
}
