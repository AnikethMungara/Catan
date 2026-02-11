/**
 * Trade validation and execution: bank trades, port trades, player-to-player trades.
 */

import type { GameState, TradeOffer } from "../types/game.js";
import type { ResourceBundle, ResourceType } from "../types/resources.js";
import {
  RESOURCE_TYPES,
  hasResources,
} from "../types/resources.js";
import type { PortType } from "../types/board.js";
import {
  getPlayer,
  addLogEntry,
  givePlayerResources,
  takePlayerResources,
  transferResources,
  bankHasResources,
} from "./state-helpers.js";

/**
 * Get the best trade ratio a player has for a given resource.
 * Default is 4:1 (bank), improved by ports.
 */
export function getTradeRatio(
  state: GameState,
  playerId: string,
  resource: ResourceType
): number {
  const player = getPlayer(state, playerId);

  // Check for 2:1 specific port
  if (player.portsAccess.includes(resource as PortType)) {
    return 2;
  }

  // Check for 3:1 generic port
  if (player.portsAccess.includes("generic")) {
    return 3;
  }

  // Default: 4:1
  return 4;
}

/**
 * Validate a bank trade. A bank trade must:
 * - Give resources of exactly one type at the correct ratio
 * - Receive exactly 1 resource of a different type
 * - Player must have the resources to give
 * - Bank must have the resource being received
 */
export function validateBankTrade(
  state: GameState,
  playerId: string,
  giving: ResourceBundle,
  receiving: ResourceBundle
): { valid: boolean; reason?: string } {
  const player = getPlayer(state, playerId);

  // Check receiving: must be exactly 1 resource of one type
  const receivingTypes = RESOURCE_TYPES.filter((r) => receiving[r] > 0);
  if (receivingTypes.length !== 1) {
    return { valid: false, reason: "Must receive exactly one type of resource" };
  }
  if (receiving[receivingTypes[0]] !== 1) {
    return { valid: false, reason: "Must receive exactly 1 resource" };
  }

  // Check giving: must be exactly one type at correct ratio
  const givingTypes = RESOURCE_TYPES.filter((r) => giving[r] > 0);
  if (givingTypes.length !== 1) {
    return { valid: false, reason: "Must give exactly one type of resource" };
  }

  const givingType = givingTypes[0];
  const givingAmount = giving[givingType];
  const requiredRatio = getTradeRatio(state, playerId, givingType);

  if (givingAmount !== requiredRatio) {
    return {
      valid: false,
      reason: `Must give exactly ${requiredRatio} ${givingType} (your rate is ${requiredRatio}:1)`,
    };
  }

  // Can't trade the same resource type
  if (givingType === receivingTypes[0]) {
    return { valid: false, reason: "Cannot trade a resource for the same type" };
  }

  // Player must have the resources
  if (!hasResources(player.resources, giving)) {
    return { valid: false, reason: "You don't have enough resources to trade" };
  }

  // Bank must have the receiving resource
  if (!bankHasResources(state, receiving)) {
    return { valid: false, reason: "Bank doesn't have enough of that resource" };
  }

  return { valid: true };
}

/**
 * Execute a bank/port trade.
 */
export function executeBankTrade(
  state: GameState,
  playerId: string,
  giving: ResourceBundle,
  receiving: ResourceBundle
): GameState {
  const player = getPlayer(state, playerId);

  let result = takePlayerResources(state, playerId, giving);
  result = givePlayerResources(result, playerId, receiving);

  const givingType = RESOURCE_TYPES.find((r) => giving[r] > 0)!;
  const receivingType = RESOURCE_TYPES.find((r) => receiving[r] > 0)!;

  result = addLogEntry(
    result,
    "BANK_TRADE",
    `${player.name} traded ${giving[givingType]} ${givingType} for 1 ${receivingType} with the bank`
  );

  return result;
}

/**
 * Create a new trade offer.
 */
export function createTradeOffer(
  state: GameState,
  fromPlayerId: string,
  offering: ResourceBundle,
  requesting: ResourceBundle,
  tradeId: string
): GameState {
  const player = getPlayer(state, fromPlayerId);

  const responses = new Map<string, "accepted" | "rejected" | "pending">();
  for (const p of state.players) {
    if (p.id !== fromPlayerId) {
      responses.set(p.id, "pending");
    }
  }

  const offer: TradeOffer = {
    id: tradeId,
    fromPlayerId,
    offering,
    requesting,
    responses,
    status: "open",
  };

  let result: GameState = {
    ...state,
    tradeOffers: [...state.tradeOffers, offer],
  };

  const offerParts = RESOURCE_TYPES.filter((r) => offering[r] > 0)
    .map((r) => `${offering[r]} ${r}`)
    .join(", ");
  const requestParts = RESOURCE_TYPES.filter((r) => requesting[r] > 0)
    .map((r) => `${requesting[r]} ${r}`)
    .join(", ");

  result = addLogEntry(
    result,
    "PROPOSE_TRADE",
    `${player.name} offers ${offerParts} for ${requestParts}`
  );

  return result;
}

/**
 * Respond to a trade offer (accept or reject).
 */
export function respondToTrade(
  state: GameState,
  responderId: string,
  tradeId: string,
  accept: boolean
): GameState {
  const offerIndex = state.tradeOffers.findIndex((o) => o.id === tradeId);
  if (offerIndex === -1) return state;

  const offer = state.tradeOffers[offerIndex];
  const newResponses = new Map(offer.responses);
  newResponses.set(responderId, accept ? "accepted" : "rejected");

  const newOffer: TradeOffer = { ...offer, responses: newResponses };
  const newOffers = [...state.tradeOffers];
  newOffers[offerIndex] = newOffer;

  return { ...state, tradeOffers: newOffers };
}

/**
 * Confirm a trade with a specific player who accepted.
 */
export function confirmTrade(
  state: GameState,
  tradeId: string,
  withPlayerId: string
): GameState {
  const offerIndex = state.tradeOffers.findIndex((o) => o.id === tradeId);
  if (offerIndex === -1) return state;

  const offer = state.tradeOffers[offerIndex];
  const proposer = getPlayer(state, offer.fromPlayerId);
  const accepter = getPlayer(state, withPlayerId);

  // Transfer: proposer gives offering, accepter gives requesting
  let result = transferResources(
    state,
    offer.fromPlayerId,
    withPlayerId,
    offer.offering
  );
  result = transferResources(
    result,
    withPlayerId,
    offer.fromPlayerId,
    offer.requesting
  );

  // Mark offer as executed
  const newOffer: TradeOffer = { ...offer, status: "executed" };
  const newOffers = [...result.tradeOffers];
  newOffers[offerIndex] = newOffer;
  result = { ...result, tradeOffers: newOffers };

  result = addLogEntry(
    result,
    "TRADE_EXECUTED",
    `${proposer.name} traded with ${accepter.name}`
  );

  return result;
}

/**
 * Cancel a trade offer.
 */
export function cancelTrade(state: GameState, tradeId: string): GameState {
  const offerIndex = state.tradeOffers.findIndex((o) => o.id === tradeId);
  if (offerIndex === -1) return state;

  const offer = state.tradeOffers[offerIndex];
  const newOffer: TradeOffer = { ...offer, status: "cancelled" };
  const newOffers = [...state.tradeOffers];
  newOffers[offerIndex] = newOffer;

  return { ...state, tradeOffers: newOffers };
}
