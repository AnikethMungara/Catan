import type { Action } from "./actions.js";
import type { PortType } from "./board.js";
import type { DevCard } from "./cards.js";
import type { GameEvent, GameState } from "./game.js";
import type { PlayerColor, PlayerPublicInfo } from "./player.js";
import type { ResourceBundle } from "./resources.js";

// ===== Client-to-Server Messages =====

export type C2SMessage =
  | { readonly type: "CREATE_ROOM"; readonly playerName: string }
  | {
      readonly type: "JOIN_ROOM";
      readonly roomId: string;
      readonly playerName: string;
    }
  | { readonly type: "LEAVE_ROOM" }
  | { readonly type: "START_GAME" }
  | { readonly type: "LIST_ROOMS" }
  | { readonly type: "RECONNECT"; readonly token: string }
  | { readonly type: "GAME_ACTION"; readonly action: Action }
  | { readonly type: "CHAT"; readonly message: string };

// ===== Server-to-Client Messages =====

export type RoomInfo = {
  readonly roomId: string;
  readonly hostId: string;
  readonly players: readonly {
    readonly id: string;
    readonly name: string;
    readonly color: PlayerColor;
  }[];
  readonly maxPlayers: number;
  readonly status: "waiting" | "in_progress" | "finished";
};

// The game state as seen by a specific player (hidden info filtered)
export type ClientGameState = Omit<
  GameState,
  "devCardDeck" | "players" | "bankResources"
> & {
  readonly devCardDeckCount: number;
  readonly players: readonly ClientPlayerView[];
  readonly yourPlayerId: string;
  readonly bankResources: GameState["bankResources"];
};

// Full info for the requesting player, limited for others
export type ClientPlayerView =
  | ({
      readonly viewType: "self";
      readonly devCards: readonly DevCard[];
      readonly resources: ResourceBundle;
      readonly portsAccess: readonly PortType[];
    } & PlayerPublicInfo)
  | ({
      readonly viewType: "other";
    } & PlayerPublicInfo);

export type S2CMessage =
  | {
      readonly type: "ROOM_CREATED";
      readonly roomId: string;
      readonly playerId: string;
      readonly token: string;
    }
  | {
      readonly type: "ROOM_JOINED";
      readonly playerId: string;
      readonly token: string;
      readonly roomInfo: RoomInfo;
    }
  | { readonly type: "ROOM_LIST"; readonly rooms: readonly RoomInfo[] }
  | { readonly type: "ROOM_UPDATE"; readonly roomInfo: RoomInfo }
  | { readonly type: "ROOM_LEFT" }
  | {
      readonly type: "GAME_STARTED";
      readonly state: ClientGameState;
    }
  | {
      readonly type: "STATE_UPDATE";
      readonly state: ClientGameState;
    }
  | {
      readonly type: "ACTION_REJECTED";
      readonly action: Action;
      readonly reason: string;
    }
  | { readonly type: "GAME_EVENT"; readonly event: GameEvent }
  | {
      readonly type: "RECONNECTED";
      readonly state: ClientGameState;
    }
  | {
      readonly type: "PLAYER_DISCONNECTED";
      readonly playerId: string;
    }
  | {
      readonly type: "PLAYER_RECONNECTED";
      readonly playerId: string;
    }
  | { readonly type: "ERROR"; readonly message: string }
  | {
      readonly type: "CHAT_MESSAGE";
      readonly playerId: string;
      readonly playerName: string;
      readonly message: string;
    };
