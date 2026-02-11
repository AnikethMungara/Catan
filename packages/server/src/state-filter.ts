/**
 * Filters GameState to ClientGameState for a specific player.
 * Hides other players' dev cards and resource details.
 */

import type {
  GameState,
  ClientGameState,
  ClientPlayerView,
  PlayerPublicInfo,
} from "@catan/shared";
import { calculateVP, bundleTotal } from "@catan/shared";

/**
 * Convert a GameState to the client-visible view for a specific player.
 * - Other players' dev cards are hidden (only count visible)
 * - Dev card deck shows only count
 * - Other players' resources show only total count
 */
export function filterStateForPlayer(
  state: GameState,
  playerId: string
): ClientGameState {
  const players: ClientPlayerView[] = state.players.map((player) => {
    const vp = calculateVP(state, player.id);

    const publicInfo: PlayerPublicInfo = {
      id: player.id,
      name: player.name,
      color: player.color,
      resourceCount: bundleTotal(player.resources),
      devCardCount: player.devCards.length,
      knightsPlayed: player.knightsPlayed,
      hasLongestRoad: player.hasLongestRoad,
      hasLargestArmy: player.hasLargestArmy,
      roadLength: player.roadLength,
      publicVP: vp.publicTotal,
      connected: player.connected,
    };

    if (player.id === playerId) {
      return {
        viewType: "self" as const,
        ...publicInfo,
        devCards: player.devCards,
        resources: player.resources,
        portsAccess: player.portsAccess,
      };
    } else {
      return {
        viewType: "other" as const,
        ...publicInfo,
      };
    }
  });

  // Serialize Maps to plain objects for JSON transport
  const serializedTurnState = {
    ...state.turnState,
    pendingDiscards: Object.fromEntries(state.turnState.pendingDiscards),
  };

  const serializedBoard = {
    ...state.board,
    hexes: Object.fromEntries(state.board.hexes),
    buildings: Object.fromEntries(state.board.buildings),
    roads: Object.fromEntries(state.board.roads),
  };

  return {
    gameId: state.gameId,
    board: serializedBoard as unknown as GameState["board"],
    players,
    turnState: serializedTurnState as unknown as GameState["turnState"],
    devCardDeckCount: state.devCardDeck.length,
    tradeOffers: state.tradeOffers.map((offer) => ({
      ...offer,
      responses: Object.fromEntries(offer.responses) as unknown as typeof offer.responses,
    })),
    winner: state.winner,
    log: state.log,
    seed: state.seed,
    yourPlayerId: playerId,
    bankResources: state.bankResources,
  };
}
