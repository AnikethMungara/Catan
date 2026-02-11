import type { Board } from "./board.js";
import type { DevCardType } from "./cards.js";
import type { Player } from "./player.js";
import type { ResourceBundle } from "./resources.js";

export type GamePhase = "SETUP" | "MAIN" | "GAME_OVER";

export type SetupSubPhase = "PLACE_SETTLEMENT" | "PLACE_ROAD";

export type MainSubPhase =
  | "ROLL_DICE"
  | "DISCARD"
  | "MOVE_ROBBER"
  | "STEAL"
  | "TRADE_BUILD_PLAY";

export type TurnState = {
  readonly currentPlayerIndex: number;
  readonly phase: GamePhase;
  readonly setupSubPhase?: SetupSubPhase;
  readonly mainSubPhase?: MainSubPhase;
  readonly setupRound: number; // 0 = first round, 1 = second round
  readonly setupOrder: readonly number[]; // player indices in snake order
  readonly setupStep: number; // index into setupOrder
  readonly turnNumber: number;
  readonly diceRoll: readonly [number, number] | null;
  readonly devCardPlayedThisTurn: boolean;
  readonly devCardBoughtThisTurn: boolean;
  readonly pendingDiscards: ReadonlyMap<string, number>; // playerId -> count to discard
  readonly roadBuildingRoadsLeft: number; // 0, 1, or 2 during Road Building
  readonly mustStealFrom: readonly string[]; // player IDs to choose from
  readonly lastSettlementVertex?: string; // serialized vertex, used during setup to constrain road placement
};

export type TradeOffer = {
  readonly id: string;
  readonly fromPlayerId: string;
  readonly offering: ResourceBundle;
  readonly requesting: ResourceBundle;
  readonly responses: ReadonlyMap<string, "accepted" | "rejected" | "pending">;
  readonly status: "open" | "executed" | "cancelled";
};

export type GameEvent = {
  readonly type: string;
  readonly message: string;
  readonly timestamp: number;
  readonly data?: Record<string, unknown>;
};

export type GameState = {
  readonly gameId: string;
  readonly board: Board;
  readonly players: readonly Player[];
  readonly turnState: TurnState;
  readonly devCardDeck: readonly DevCardType[];
  readonly tradeOffers: readonly TradeOffer[];
  readonly winner: string | null;
  readonly log: readonly GameEvent[];
  readonly seed: number;
  // Bank resource supply tracking (19 of each resource type)
  readonly bankResources: ResourceBundle;
};
