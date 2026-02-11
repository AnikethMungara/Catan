/**
 * Complete move validation for all action types in every game phase.
 * Every action must pass validation before being dispatched.
 */

import type { PlayerAction } from "../types/actions.js";
import type { GameState } from "../types/game.js";
import {
  hasResources,
  bundleTotal,
  RESOURCE_TYPES,
  EMPTY_BUNDLE,
} from "../types/resources.js";
import { serializeVertex, serializeEdge, serializeHex } from "../types/coordinates.js";
import { BUILDING_COSTS } from "../constants/costs.js";
import { getPlayer } from "./state-helpers.js";
import {
  canonicalizeVertex,
  vertexAdjacentVertices,
  vertexAdjacentEdges,
  edgeAdjacentVertices,
  isValidHex,
  allVertexCoords,
  allEdgeCoords,
} from "./coordinate-system.js";
import { validateBankTrade } from "./trade-validator.js";

export type ValidationResult = {
  valid: boolean;
  reason?: string;
};

/**
 * Validate any action. Main entry point.
 */
export function validateAction(
  state: GameState,
  action: PlayerAction
): ValidationResult {
  const { turnState } = state;

  // Game over — no actions allowed
  if (turnState.phase === "GAME_OVER") {
    return { valid: false, reason: "Game is over" };
  }

  // Route to phase-specific validation
  switch (turnState.phase) {
    case "SETUP":
      return validateSetupAction(state, action);
    case "MAIN":
      return validateMainAction(state, action);
    default:
      return { valid: false, reason: "Unknown game phase" };
  }
}

// ===== Setup Phase Validation =====

function validateSetupAction(
  state: GameState,
  action: PlayerAction
): ValidationResult {
  const { turnState } = state;
  const currentPlayerIdx = turnState.setupOrder[turnState.setupStep];
  const currentPlayer = state.players[currentPlayerIdx];

  if (action.playerId !== currentPlayer.id) {
    return { valid: false, reason: "It's not your turn" };
  }

  switch (turnState.setupSubPhase) {
    case "PLACE_SETTLEMENT":
      if (action.type !== "PLACE_SETTLEMENT") {
        return { valid: false, reason: "You must place a settlement" };
      }
      return validateSetupSettlement(state, action);

    case "PLACE_ROAD":
      if (action.type !== "PLACE_ROAD") {
        return { valid: false, reason: "You must place a road" };
      }
      return validateSetupRoad(state, action);

    default:
      return { valid: false, reason: "Invalid setup phase" };
  }
}

function validateSetupSettlement(
  state: GameState,
  action: PlayerAction & { type: "PLACE_SETTLEMENT" }
): ValidationResult {
  const vertex = canonicalizeVertex(action.vertex);
  const vKey = serializeVertex(vertex);

  // Must be on a valid board vertex
  const allVerts = allVertexCoords();
  if (!allVerts.some((v) => serializeVertex(v) === vKey)) {
    return { valid: false, reason: "Invalid vertex position" };
  }

  // Must not be occupied
  if (state.board.buildings.has(vKey)) {
    return { valid: false, reason: "This intersection is already occupied" };
  }

  // Distance rule: no adjacent building
  const adjVerts = vertexAdjacentVertices(vertex);
  for (const adjV of adjVerts) {
    if (state.board.buildings.has(serializeVertex(adjV))) {
      return {
        valid: false,
        reason: "Too close to another settlement (distance rule)",
      };
    }
  }

  // During setup, no road connectivity required
  // (settlements are placed first, then roads)

  // Check piece availability
  const player = getPlayer(state, action.playerId);
  if (player.settlementsRemaining <= 0) {
    return { valid: false, reason: "No settlements remaining" };
  }

  return { valid: true };
}

function validateSetupRoad(
  state: GameState,
  action: PlayerAction & { type: "PLACE_ROAD" }
): ValidationResult {
  const edge = action.edge;
  const eKey = serializeEdge(edge);

  // Must be on a valid board edge
  const allEdges = allEdgeCoords();
  if (!allEdges.some((e) => serializeEdge(e) === eKey)) {
    return { valid: false, reason: "Invalid edge position" };
  }

  // Must not be occupied
  if (state.board.roads.has(eKey)) {
    return { valid: false, reason: "This edge already has a road" };
  }

  // Must connect to the settlement just placed (stored in lastSettlementVertex)
  const lastVertex = state.turnState.lastSettlementVertex;
  if (!lastVertex) {
    return { valid: false, reason: "No settlement was placed before the road" };
  }

  const [v1, v2] = edgeAdjacentVertices(edge);
  const v1Key = serializeVertex(v1);
  const v2Key = serializeVertex(v2);

  if (v1Key !== lastVertex && v2Key !== lastVertex) {
    return {
      valid: false,
      reason: "Road must connect to your just-placed settlement",
    };
  }

  // Check piece availability
  const player = getPlayer(state, action.playerId);
  if (player.roadsRemaining <= 0) {
    return { valid: false, reason: "No roads remaining" };
  }

  return { valid: true };
}

// ===== Main Phase Validation =====

function validateMainAction(
  state: GameState,
  action: PlayerAction
): ValidationResult {
  const { turnState } = state;

  // Special case: DISCARD can be done by non-current players
  if (action.type === "DISCARD_RESOURCES") {
    if (turnState.mainSubPhase !== "DISCARD") {
      return { valid: false, reason: "Not in discard phase" };
    }
    return validateDiscard(state, action);
  }

  // All other actions require it to be your turn
  const currentPlayer = state.players[turnState.currentPlayerIndex];
  if (action.playerId !== currentPlayer.id) {
    // Exception: responding to a trade offer
    if (action.type === "RESPOND_TO_TRADE") {
      return validateRespondToTrade(state, action);
    }
    return { valid: false, reason: "It's not your turn" };
  }

  switch (turnState.mainSubPhase) {
    case "ROLL_DICE":
      return validateRollDicePhase(state, action);

    case "DISCARD":
      return { valid: false, reason: "Waiting for players to discard" };

    case "MOVE_ROBBER":
      if (action.type !== "MOVE_ROBBER") {
        return { valid: false, reason: "You must move the robber" };
      }
      return validateMoveRobber(state, action);

    case "STEAL":
      if (action.type !== "STEAL") {
        return { valid: false, reason: "You must choose a player to steal from" };
      }
      return validateSteal(state, action);

    case "TRADE_BUILD_PLAY":
      return validateTradeBuildPlay(state, action);

    default:
      return { valid: false, reason: "Unknown sub-phase" };
  }
}

function validateRollDicePhase(
  state: GameState,
  action: PlayerAction
): ValidationResult {
  // Before rolling, player can play a dev card (knight specifically)
  if (action.type === "PLAY_KNIGHT") {
    return validatePlayDevCard(state, action);
  }

  if (action.type !== "ROLL_DICE") {
    return { valid: false, reason: "You must roll the dice (or play a Knight)" };
  }

  return { valid: true };
}

function validateTradeBuildPlay(
  state: GameState,
  action: PlayerAction
): ValidationResult {
  // Check if we're in road building mode
  if (state.turnState.roadBuildingRoadsLeft > 0) {
    if (action.type !== "PLACE_ROAD") {
      return {
        valid: false,
        reason: `You must place ${state.turnState.roadBuildingRoadsLeft} more road(s) (Road Building)`,
      };
    }
    return validatePlaceRoad(state, action, true);
  }

  switch (action.type) {
    case "PLACE_SETTLEMENT":
      return validatePlaceSettlement(state, action);
    case "PLACE_ROAD":
      return validatePlaceRoad(state, action, false);
    case "PLACE_CITY":
      return validatePlaceCity(state, action);
    case "BUY_DEV_CARD":
      return validateBuyDevCard(state, action);
    case "PLAY_KNIGHT":
    case "PLAY_ROAD_BUILDING":
    case "PLAY_YEAR_OF_PLENTY":
    case "PLAY_MONOPOLY":
      return validatePlayDevCard(state, action);
    case "PROPOSE_TRADE":
      return validateProposeTrade(state, action);
    case "CONFIRM_TRADE":
      return validateConfirmTrade(state, action);
    case "CANCEL_TRADE":
      return validateCancelTrade(state, action);
    case "BANK_TRADE":
      return validateBankTradeAction(state, action);
    case "END_TURN":
      return { valid: true };
    default:
      return { valid: false, reason: "Invalid action for this phase" };
  }
}

// ===== Individual Action Validators =====

function validateDiscard(
  state: GameState,
  action: PlayerAction & { type: "DISCARD_RESOURCES" }
): ValidationResult {
  const { playerId, resources } = action;
  const pending = state.turnState.pendingDiscards;

  if (!pending.has(playerId)) {
    return { valid: false, reason: "You don't need to discard" };
  }

  const requiredCount = pending.get(playerId)!;
  const discardCount = bundleTotal(resources);

  if (discardCount !== requiredCount) {
    return {
      valid: false,
      reason: `You must discard exactly ${requiredCount} cards (tried ${discardCount})`,
    };
  }

  // Player must have the resources
  const player = getPlayer(state, playerId);
  if (!hasResources(player.resources, resources)) {
    return { valid: false, reason: "You don't have those resources to discard" };
  }

  // All values must be non-negative
  for (const r of RESOURCE_TYPES) {
    if (resources[r] < 0) {
      return { valid: false, reason: "Cannot discard negative resources" };
    }
  }

  return { valid: true };
}

function validateMoveRobber(
  state: GameState,
  action: PlayerAction & { type: "MOVE_ROBBER" }
): ValidationResult {
  const { hex } = action;

  // Must be a valid hex
  if (!isValidHex(hex)) {
    return { valid: false, reason: "Invalid hex position" };
  }

  // Must be different from current position
  if (serializeHex(hex) === serializeHex(state.board.robberHex)) {
    return { valid: false, reason: "Robber must move to a different hex" };
  }

  return { valid: true };
}

function validateSteal(
  state: GameState,
  action: PlayerAction & { type: "STEAL" }
): ValidationResult {
  const { targetPlayerId } = action;
  const { mustStealFrom } = state.turnState;

  if (!mustStealFrom.includes(targetPlayerId)) {
    return { valid: false, reason: "Cannot steal from that player" };
  }

  return { valid: true };
}

function validatePlaceSettlement(
  state: GameState,
  action: PlayerAction & { type: "PLACE_SETTLEMENT" }
): ValidationResult {
  const player = getPlayer(state, action.playerId);
  const vertex = canonicalizeVertex(action.vertex);
  const vKey = serializeVertex(vertex);

  // Must be a valid vertex
  const allVerts = allVertexCoords();
  if (!allVerts.some((v) => serializeVertex(v) === vKey)) {
    return { valid: false, reason: "Invalid vertex position" };
  }

  // Must not be occupied
  if (state.board.buildings.has(vKey)) {
    return { valid: false, reason: "This intersection is already occupied" };
  }

  // Distance rule
  const adjVerts = vertexAdjacentVertices(vertex);
  for (const adjV of adjVerts) {
    if (state.board.buildings.has(serializeVertex(adjV))) {
      return {
        valid: false,
        reason: "Too close to another settlement (distance rule)",
      };
    }
  }

  // Must be connected to player's road network
  const adjEdges = vertexAdjacentEdges(vertex);
  const hasRoad = adjEdges.some((e) => {
    const road = state.board.roads.get(serializeEdge(e));
    return road && road.playerId === action.playerId;
  });
  if (!hasRoad) {
    return {
      valid: false,
      reason: "Settlement must be connected to your road network",
    };
  }

  // Must have resources
  if (!hasResources(player.resources, BUILDING_COSTS.settlement)) {
    return { valid: false, reason: "Not enough resources for a settlement" };
  }

  // Must have pieces
  if (player.settlementsRemaining <= 0) {
    return { valid: false, reason: "No settlements remaining" };
  }

  return { valid: true };
}

function validatePlaceRoad(
  state: GameState,
  action: PlayerAction & { type: "PLACE_ROAD" },
  freeRoad: boolean // true during Road Building
): ValidationResult {
  const player = getPlayer(state, action.playerId);
  const edge = action.edge;
  const eKey = serializeEdge(edge);

  // Must be a valid edge
  const allEdges = allEdgeCoords();
  if (!allEdges.some((e) => serializeEdge(e) === eKey)) {
    return { valid: false, reason: "Invalid edge position" };
  }

  // Must not be occupied
  if (state.board.roads.has(eKey)) {
    return { valid: false, reason: "This edge already has a road" };
  }

  // Must connect to player's road network or building
  const [v1, v2] = edgeAdjacentVertices(edge);
  let connected = false;

  for (const v of [v1, v2]) {
    const vKey = serializeVertex(v);
    const building = state.board.buildings.get(vKey);

    // Connected via own building
    if (building && building.playerId === action.playerId) {
      connected = true;
      break;
    }

    // If there's an enemy building, can't connect through it
    if (building && building.playerId !== action.playerId) {
      continue;
    }

    // Connected via own road (no enemy building blocking)
    const adjEdges = vertexAdjacentEdges(v);
    for (const adjE of adjEdges) {
      if (serializeEdge(adjE) === eKey) continue;
      const road = state.board.roads.get(serializeEdge(adjE));
      if (road && road.playerId === action.playerId) {
        connected = true;
        break;
      }
    }
    if (connected) break;
  }

  if (!connected) {
    return {
      valid: false,
      reason: "Road must connect to your road network or building",
    };
  }

  // Must have resources (unless free from Road Building)
  if (!freeRoad && !hasResources(player.resources, BUILDING_COSTS.road)) {
    return { valid: false, reason: "Not enough resources for a road" };
  }

  // Must have pieces
  if (player.roadsRemaining <= 0) {
    return { valid: false, reason: "No roads remaining" };
  }

  return { valid: true };
}

function validatePlaceCity(
  state: GameState,
  action: PlayerAction & { type: "PLACE_CITY" }
): ValidationResult {
  const player = getPlayer(state, action.playerId);
  const vertex = canonicalizeVertex(action.vertex);
  const vKey = serializeVertex(vertex);

  // Must have own settlement there
  const building = state.board.buildings.get(vKey);
  if (!building) {
    return { valid: false, reason: "No building at this location" };
  }
  if (building.playerId !== action.playerId) {
    return { valid: false, reason: "This is not your building" };
  }
  if (building.type !== "settlement") {
    return { valid: false, reason: "Already a city" };
  }

  // Must have resources
  if (!hasResources(player.resources, BUILDING_COSTS.city)) {
    return { valid: false, reason: "Not enough resources for a city" };
  }

  // Must have city pieces
  if (player.citiesRemaining <= 0) {
    return { valid: false, reason: "No cities remaining" };
  }

  return { valid: true };
}

function validateBuyDevCard(
  state: GameState,
  action: PlayerAction
): ValidationResult {
  const player = getPlayer(state, action.playerId);

  // Deck must have cards
  if (state.devCardDeck.length === 0) {
    return { valid: false, reason: "Development card deck is empty" };
  }

  // Must have resources
  if (!hasResources(player.resources, BUILDING_COSTS.devCard)) {
    return {
      valid: false,
      reason: "Not enough resources for a development card",
    };
  }

  return { valid: true };
}

function validatePlayDevCard(
  state: GameState,
  action: PlayerAction
): ValidationResult {
  const player = getPlayer(state, action.playerId);
  const { turnState } = state;

  // Can only play one dev card per turn
  if (turnState.devCardPlayedThisTurn) {
    return {
      valid: false,
      reason: "You already played a development card this turn",
    };
  }

  // VP cards are never "played" — they're automatically counted
  if (action.type === "PLAY_KNIGHT") {
    // Must have a knight that wasn't bought this turn
    const hasPlayableKnight = player.devCards.some(
      (c) =>
        c.type === "knight" &&
        c.turnAcquired < turnState.turnNumber
    );
    if (!hasPlayableKnight) {
      return { valid: false, reason: "No playable Knight card" };
    }

    // Validate robber placement
    if (!isValidHex(action.robberHex)) {
      return { valid: false, reason: "Invalid hex for robber" };
    }
    if (serializeHex(action.robberHex) === serializeHex(state.board.robberHex)) {
      return { valid: false, reason: "Robber must move to a different hex" };
    }

    return { valid: true };
  }

  if (action.type === "PLAY_ROAD_BUILDING") {
    const hasCard = player.devCards.some(
      (c) =>
        c.type === "roadBuilding" &&
        c.turnAcquired < turnState.turnNumber
    );
    if (!hasCard) {
      return { valid: false, reason: "No playable Road Building card" };
    }

    // Must have at least 1 road piece
    if (player.roadsRemaining <= 0) {
      return { valid: false, reason: "No road pieces remaining" };
    }

    return { valid: true };
  }

  if (action.type === "PLAY_YEAR_OF_PLENTY") {
    const hasCard = player.devCards.some(
      (c) =>
        c.type === "yearOfPlenty" &&
        c.turnAcquired < turnState.turnNumber
    );
    if (!hasCard) {
      return { valid: false, reason: "No playable Year of Plenty card" };
    }

    // Must request exactly 2 resources
    if (action.resources.length !== 2) {
      return { valid: false, reason: "Must choose exactly 2 resources" };
    }

    // Bank must have those resources
    const bundle = { ...EMPTY_BUNDLE };
    for (const res of action.resources) {
      (bundle as Record<string, number>)[res] += 1;
    }
    for (const res of RESOURCE_TYPES) {
      if (bundle[res] > state.bankResources[res]) {
        return {
          valid: false,
          reason: `Bank doesn't have enough ${res}`,
        };
      }
    }

    return { valid: true };
  }

  if (action.type === "PLAY_MONOPOLY") {
    const hasCard = player.devCards.some(
      (c) =>
        c.type === "monopoly" &&
        c.turnAcquired < turnState.turnNumber
    );
    if (!hasCard) {
      return { valid: false, reason: "No playable Monopoly card" };
    }

    if (!RESOURCE_TYPES.includes(action.resource)) {
      return { valid: false, reason: "Invalid resource type" };
    }

    return { valid: true };
  }

  return { valid: false, reason: "Unknown development card action" };
}

function validateProposeTrade(
  state: GameState,
  action: PlayerAction & { type: "PROPOSE_TRADE" }
): ValidationResult {
  const player = getPlayer(state, action.playerId);

  // Must have the resources being offered
  if (!hasResources(player.resources, action.offering)) {
    return { valid: false, reason: "You don't have the resources you're offering" };
  }

  // Offering and requesting must not be empty
  if (bundleTotal(action.offering) === 0) {
    return { valid: false, reason: "Must offer something" };
  }
  if (bundleTotal(action.requesting) === 0) {
    return { valid: false, reason: "Must request something" };
  }

  // All values must be non-negative
  for (const r of RESOURCE_TYPES) {
    if (action.offering[r] < 0 || action.requesting[r] < 0) {
      return { valid: false, reason: "Resource amounts must be non-negative" };
    }
  }

  return { valid: true };
}

function validateRespondToTrade(
  state: GameState,
  action: PlayerAction & { type: "RESPOND_TO_TRADE" }
): ValidationResult {
  const offer = state.tradeOffers.find((o) => o.id === action.tradeId);
  if (!offer) {
    return { valid: false, reason: "Trade offer not found" };
  }
  if (offer.status !== "open") {
    return { valid: false, reason: "Trade offer is no longer open" };
  }
  if (offer.fromPlayerId === action.playerId) {
    return { valid: false, reason: "Cannot respond to your own offer" };
  }

  // If accepting, must have the requested resources
  if (action.accept) {
    const player = getPlayer(state, action.playerId);
    if (!hasResources(player.resources, offer.requesting)) {
      return {
        valid: false,
        reason: "You don't have the requested resources",
      };
    }
  }

  return { valid: true };
}

function validateConfirmTrade(
  state: GameState,
  action: PlayerAction & { type: "CONFIRM_TRADE" }
): ValidationResult {
  const offer = state.tradeOffers.find((o) => o.id === action.tradeId);
  if (!offer) {
    return { valid: false, reason: "Trade offer not found" };
  }
  if (offer.status !== "open") {
    return { valid: false, reason: "Trade offer is no longer open" };
  }
  if (offer.fromPlayerId !== action.playerId) {
    return { valid: false, reason: "Only the proposer can confirm a trade" };
  }

  // Target must have accepted
  const response = offer.responses.get(action.withPlayerId);
  if (response !== "accepted") {
    return { valid: false, reason: "That player has not accepted" };
  }

  // Both players must still have the resources
  const proposer = getPlayer(state, offer.fromPlayerId);
  if (!hasResources(proposer.resources, offer.offering)) {
    return { valid: false, reason: "You no longer have the offered resources" };
  }

  const accepter = getPlayer(state, action.withPlayerId);
  if (!hasResources(accepter.resources, offer.requesting)) {
    return { valid: false, reason: "The other player no longer has the requested resources" };
  }

  return { valid: true };
}

function validateCancelTrade(
  state: GameState,
  action: PlayerAction & { type: "CANCEL_TRADE" }
): ValidationResult {
  const offer = state.tradeOffers.find((o) => o.id === action.tradeId);
  if (!offer) {
    return { valid: false, reason: "Trade offer not found" };
  }
  if (offer.fromPlayerId !== action.playerId) {
    return { valid: false, reason: "Only the proposer can cancel a trade" };
  }
  if (offer.status !== "open") {
    return { valid: false, reason: "Trade offer is not open" };
  }

  return { valid: true };
}

function validateBankTradeAction(
  state: GameState,
  action: PlayerAction & { type: "BANK_TRADE" }
): ValidationResult {
  return validateBankTrade(state, action.playerId, action.giving, action.receiving);
}
