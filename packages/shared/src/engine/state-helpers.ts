/**
 * Immutable state update helpers for the game engine.
 * All functions return new objects rather than mutating.
 */

import type { Board, Building, BuildingType, Road } from "../types/board.js";
import type { GameEvent, GameState, TurnState } from "../types/game.js";
import type { Player } from "../types/player.js";
import type { ResourceBundle, ResourceType } from "../types/resources.js";
import {
  addBundles,
  EMPTY_BUNDLE,
  RESOURCE_TYPES,
  subtractBundles,
} from "../types/resources.js";

export function updatePlayer(
  state: GameState,
  playerId: string,
  updates: Partial<Player>
): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, ...updates } : p
    ),
  };
}

export function updateTurnState(
  state: GameState,
  updates: Partial<TurnState>
): GameState {
  return {
    ...state,
    turnState: { ...state.turnState, ...updates },
  };
}

export function updateBoard(
  state: GameState,
  updates: Partial<Board>
): GameState {
  return {
    ...state,
    board: { ...state.board, ...updates },
  };
}

export function addResources(
  player: Player,
  bundle: ResourceBundle
): Player {
  return {
    ...player,
    resources: addBundles(player.resources, bundle),
  };
}

export function removeResources(
  player: Player,
  bundle: ResourceBundle
): Player {
  return {
    ...player,
    resources: subtractBundles(player.resources, bundle),
  };
}

export function addResourceToBundle(
  bundle: ResourceBundle,
  resource: ResourceType,
  amount: number
): ResourceBundle {
  return { ...bundle, [resource]: bundle[resource] + amount };
}

export function addBankResources(
  state: GameState,
  bundle: ResourceBundle
): GameState {
  return {
    ...state,
    bankResources: addBundles(state.bankResources, bundle),
  };
}

export function removeBankResources(
  state: GameState,
  bundle: ResourceBundle
): GameState {
  return {
    ...state,
    bankResources: subtractBundles(state.bankResources, bundle),
  };
}

export function givePlayerResources(
  state: GameState,
  playerId: string,
  bundle: ResourceBundle
): GameState {
  let result = updatePlayer(state, playerId, {
    resources: addBundles(
      state.players.find((p) => p.id === playerId)!.resources,
      bundle
    ),
  });
  result = removeBankResources(result, bundle);
  return result;
}

export function takePlayerResources(
  state: GameState,
  playerId: string,
  bundle: ResourceBundle
): GameState {
  let result = updatePlayer(state, playerId, {
    resources: subtractBundles(
      state.players.find((p) => p.id === playerId)!.resources,
      bundle
    ),
  });
  result = addBankResources(result, bundle);
  return result;
}

export function placeBuilding(
  state: GameState,
  vertexKey: string,
  building: Building
): GameState {
  const newBuildings = new Map(state.board.buildings);
  newBuildings.set(vertexKey, building);
  return updateBoard(state, { buildings: newBuildings });
}

export function placeRoad(
  state: GameState,
  edgeKey: string,
  road: Road
): GameState {
  const newRoads = new Map(state.board.roads);
  newRoads.set(edgeKey, road);
  return updateBoard(state, { roads: newRoads });
}

export function upgradeBuilding(
  state: GameState,
  vertexKey: string,
  newType: BuildingType
): GameState {
  const existing = state.board.buildings.get(vertexKey);
  if (!existing) return state;
  const newBuildings = new Map(state.board.buildings);
  newBuildings.set(vertexKey, { ...existing, type: newType });
  return updateBoard(state, { buildings: newBuildings });
}

export function addLogEntry(
  state: GameState,
  type: string,
  message: string,
  data?: Record<string, unknown>
): GameState {
  const event: GameEvent = {
    type,
    message,
    timestamp: Date.now(),
    data,
  };
  return {
    ...state,
    log: [...state.log, event],
  };
}

export function getPlayer(state: GameState, playerId: string): Player {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);
  return player;
}

export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.turnState.currentPlayerIndex];
}

export function createEmptyResourceBundle(): ResourceBundle {
  return { ...EMPTY_BUNDLE };
}

/**
 * Transfer resources directly between two players (for trades/stealing).
 * Does NOT go through the bank.
 */
export function transferResources(
  state: GameState,
  fromPlayerId: string,
  toPlayerId: string,
  bundle: ResourceBundle
): GameState {
  const from = getPlayer(state, fromPlayerId);
  const to = getPlayer(state, toPlayerId);

  let result = updatePlayer(state, fromPlayerId, {
    resources: subtractBundles(from.resources, bundle),
  });
  result = updatePlayer(result, toPlayerId, {
    resources: addBundles(to.resources, bundle),
  });
  return result;
}

/**
 * Check if the bank has enough of each resource in the bundle.
 */
export function bankHasResources(
  state: GameState,
  bundle: ResourceBundle
): boolean {
  return RESOURCE_TYPES.every((r) => state.bankResources[r] >= bundle[r]);
}
