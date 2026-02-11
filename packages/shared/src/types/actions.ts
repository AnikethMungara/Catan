import type { CubeCoord, EdgeCoord, VertexCoord } from "./coordinates.js";
import type { ResourceBundle, ResourceType } from "./resources.js";

export type RollDiceAction = { readonly type: "ROLL_DICE" };

export type PlaceSettlementAction = {
  readonly type: "PLACE_SETTLEMENT";
  readonly vertex: VertexCoord;
};

export type PlaceRoadAction = {
  readonly type: "PLACE_ROAD";
  readonly edge: EdgeCoord;
};

export type PlaceCityAction = {
  readonly type: "PLACE_CITY";
  readonly vertex: VertexCoord;
};

export type BuyDevCardAction = { readonly type: "BUY_DEV_CARD" };

export type PlayKnightAction = {
  readonly type: "PLAY_KNIGHT";
  readonly robberHex: CubeCoord;
  readonly stealFromPlayerId?: string;
};

export type PlayRoadBuildingAction = {
  readonly type: "PLAY_ROAD_BUILDING";
  readonly edges: readonly EdgeCoord[];
};

export type PlayYearOfPlentyAction = {
  readonly type: "PLAY_YEAR_OF_PLENTY";
  readonly resources: readonly [ResourceType, ResourceType];
};

export type PlayMonopolyAction = {
  readonly type: "PLAY_MONOPOLY";
  readonly resource: ResourceType;
};

export type DiscardResourcesAction = {
  readonly type: "DISCARD_RESOURCES";
  readonly resources: ResourceBundle;
};

export type MoveRobberAction = {
  readonly type: "MOVE_ROBBER";
  readonly hex: CubeCoord;
};

export type StealAction = {
  readonly type: "STEAL";
  readonly targetPlayerId: string;
};

export type ProposeTradeAction = {
  readonly type: "PROPOSE_TRADE";
  readonly offering: ResourceBundle;
  readonly requesting: ResourceBundle;
};

export type RespondToTradeAction = {
  readonly type: "RESPOND_TO_TRADE";
  readonly tradeId: string;
  readonly accept: boolean;
};

export type ConfirmTradeAction = {
  readonly type: "CONFIRM_TRADE";
  readonly tradeId: string;
  readonly withPlayerId: string;
};

export type CancelTradeAction = {
  readonly type: "CANCEL_TRADE";
  readonly tradeId: string;
};

export type BankTradeAction = {
  readonly type: "BANK_TRADE";
  readonly giving: ResourceBundle;
  readonly receiving: ResourceBundle;
};

export type EndTurnAction = { readonly type: "END_TURN" };

export type Action =
  | RollDiceAction
  | PlaceSettlementAction
  | PlaceRoadAction
  | PlaceCityAction
  | BuyDevCardAction
  | PlayKnightAction
  | PlayRoadBuildingAction
  | PlayYearOfPlentyAction
  | PlayMonopolyAction
  | DiscardResourcesAction
  | MoveRobberAction
  | StealAction
  | ProposeTradeAction
  | RespondToTradeAction
  | ConfirmTradeAction
  | CancelTradeAction
  | BankTradeAction
  | EndTurnAction;

export type PlayerAction = Action & { readonly playerId: string };
