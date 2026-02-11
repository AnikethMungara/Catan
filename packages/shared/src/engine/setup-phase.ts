/**
 * Setup phase logic: snake draft for initial settlement and road placement.
 * Order: P1→P2→P3→P4→P4→P3→P2→P1 (for 4 players)
 * Each step: place 1 settlement, then 1 road connected to it.
 * Second settlement grants starting resources from adjacent hexes.
 */

import type { GameState } from "../types/game.js";
import type { PlayerAction } from "../types/actions.js";
import type { VertexCoord } from "../types/coordinates.js";
import { serializeVertex, serializeEdge } from "../types/coordinates.js";
import { EMPTY_BUNDLE, RESOURCE_TYPES } from "../types/resources.js";
import { TERRAIN_RESOURCE } from "../types/board.js";
import {
  placeBuilding,
  placeRoad,
  updatePlayer,
  updateTurnState,
  addLogEntry,
  getPlayer,
  givePlayerResources,
} from "./state-helpers.js";
import {
  canonicalizeVertex,
  vertexAdjacentHexes,
} from "./coordinate-system.js";
import { updateLongestRoad } from "./road-calculator.js";

/**
 * Generate the snake draft order for N players.
 * E.g., for 4 players: [0, 1, 2, 3, 3, 2, 1, 0]
 */
export function generateSetupOrder(playerCount: number): number[] {
  const forward = Array.from({ length: playerCount }, (_, i) => i);
  const backward = [...forward].reverse();
  return [...forward, ...backward];
}

/**
 * Process a setup action (PLACE_SETTLEMENT or PLACE_ROAD).
 */
export function handleSetupAction(
  state: GameState,
  action: PlayerAction
): GameState {
  switch (action.type) {
    case "PLACE_SETTLEMENT":
      return handleSetupSettlement(state, action);
    case "PLACE_ROAD":
      return handleSetupRoad(state, action);
    default:
      return state;
  }
}

function handleSetupSettlement(
  state: GameState,
  action: PlayerAction & { type: "PLACE_SETTLEMENT" }
): GameState {
  const vertex = canonicalizeVertex(action.vertex);
  const vKey = serializeVertex(vertex);
  const player = getPlayer(state, action.playerId);

  // Place the settlement
  let result = placeBuilding(state, vKey, {
    type: "settlement",
    playerId: action.playerId,
  });

  // Reduce piece count
  result = updatePlayer(result, action.playerId, {
    settlementsRemaining: player.settlementsRemaining - 1,
  });

  // Update port access
  result = updatePortAccess(result, action.playerId, vertex);

  // Remember this vertex for road placement constraint
  result = updateTurnState(result, {
    lastSettlementVertex: vKey,
    setupSubPhase: "PLACE_ROAD",
  });

  result = addLogEntry(
    result,
    "PLACE_SETTLEMENT",
    `${player.name} placed a settlement`
  );

  return result;
}

function handleSetupRoad(
  state: GameState,
  action: PlayerAction & { type: "PLACE_ROAD" }
): GameState {
  const eKey = serializeEdge(action.edge);
  const player = getPlayer(state, action.playerId);

  // Place the road
  let result = placeRoad(state, eKey, { playerId: action.playerId });

  // Reduce piece count
  result = updatePlayer(result, action.playerId, {
    roadsRemaining: player.roadsRemaining - 1,
  });

  result = addLogEntry(
    result,
    "PLACE_ROAD",
    `${player.name} placed a road`
  );

  // Update longest road
  result = updateLongestRoad(result);

  // Determine if we're in the second round (gives starting resources)
  const isSecondRound =
    state.turnState.setupStep >= state.players.length;

  if (isSecondRound && state.turnState.lastSettlementVertex) {
    result = grantStartingResources(
      result,
      action.playerId,
      state.turnState.lastSettlementVertex
    );
  }

  // Advance to next setup step
  result = advanceSetupStep(result);

  return result;
}

/**
 * Grant starting resources from the second settlement's adjacent hexes.
 */
function grantStartingResources(
  state: GameState,
  playerId: string,
  vertexKey: string
): GameState {
  const parts = vertexKey.split(",");
  const vertex: VertexCoord = {
    q: Number(parts[0]),
    r: Number(parts[1]),
    s: Number(parts[2]),
    dir: parts[3] as "N" | "S",
  };

  const adjHexes = vertexAdjacentHexes(vertex);
  const bundle = { ...EMPTY_BUNDLE };

  for (const hex of adjHexes) {
    const hexKey = `${hex.q},${hex.r},${hex.s}`;
    const hexTile = state.board.hexes.get(hexKey);
    if (hexTile && hexTile.terrain !== "desert") {
      const resource = TERRAIN_RESOURCE[hexTile.terrain];
      (bundle as Record<string, number>)[resource] += 1;
    }
  }

  const player = getPlayer(state, playerId);
  let result = givePlayerResources(state, playerId, bundle);

  const resList = RESOURCE_TYPES.filter((r) => bundle[r] > 0)
    .map((r) => `${bundle[r]} ${r}`)
    .join(", ");

  if (resList) {
    result = addLogEntry(
      result,
      "STARTING_RESOURCES",
      `${player.name} receives starting resources: ${resList}`
    );
  }

  return result;
}

/**
 * Advance to the next setup step (next player or transition to main game).
 */
function advanceSetupStep(state: GameState): GameState {
  const nextStep = state.turnState.setupStep + 1;
  const totalSteps = state.turnState.setupOrder.length;

  if (nextStep >= totalSteps) {
    // Setup complete — transition to main game
    return updateTurnState(state, {
      phase: "MAIN",
      mainSubPhase: "ROLL_DICE",
      setupSubPhase: undefined,
      lastSettlementVertex: undefined,
      currentPlayerIndex: 0,
      turnNumber: 1,
    });
  }

  const nextRound = nextStep >= state.players.length ? 1 : 0;

  return updateTurnState(state, {
    setupStep: nextStep,
    setupRound: nextRound,
    setupSubPhase: "PLACE_SETTLEMENT",
    lastSettlementVertex: undefined,
    currentPlayerIndex: state.turnState.setupOrder[nextStep],
  });
}

/**
 * Check if a newly placed settlement grants port access.
 */
function updatePortAccess(
  state: GameState,
  playerId: string,
  vertex: VertexCoord
): GameState {
  const vKey = serializeVertex(vertex);
  const player = getPlayer(state, playerId);
  const newPorts = [...player.portsAccess];

  for (const port of state.board.ports) {
    const portV1Key = serializeVertex(port.vertices[0]);
    const portV2Key = serializeVertex(port.vertices[1]);

    if (vKey === portV1Key || vKey === portV2Key) {
      if (!newPorts.includes(port.type)) {
        newPorts.push(port.type);
      }
    }
  }

  if (newPorts.length !== player.portsAccess.length) {
    return updatePlayer(state, playerId, { portsAccess: newPorts });
  }

  return state;
}
