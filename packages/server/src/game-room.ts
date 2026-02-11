/**
 * Game room: manages a single game's authoritative state,
 * validates and dispatches actions, broadcasts state to players.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  GameState,
  PlayerAction,
  Action,
  RoomInfo,
  PlayerColor,
} from "@catan/shared";
import {
  createGameState,
  dispatch,
  InvalidActionError,
  PLAYER_COLORS,
} from "@catan/shared";
import type { Connection } from "./connection.js";
import { filterStateForPlayer } from "./state-filter.js";

export type RoomPlayer = {
  id: string;
  name: string;
  color: PlayerColor;
  token: string;
  connection: Connection | null;
};

export class GameRoom {
  public readonly roomId: string;
  public readonly hostId: string;
  public status: "waiting" | "in_progress" | "finished" = "waiting";

  private players: RoomPlayer[] = [];
  private gameState: GameState | null = null;
  private maxPlayers = 4;

  constructor(roomId: string, hostId: string) {
    this.roomId = roomId;
    this.hostId = hostId;
  }

  addPlayer(name: string, connection: Connection): { playerId: string; token: string } | null {
    if (this.players.length >= this.maxPlayers) return null;
    if (this.status !== "waiting") return null;

    const playerId = uuidv4();
    const token = uuidv4();
    const color = PLAYER_COLORS[this.players.length];

    const player: RoomPlayer = {
      id: playerId,
      name,
      color,
      token,
      connection,
    };

    this.players.push(player);

    connection.playerId = playerId;
    connection.roomId = this.roomId;
    connection.token = token;
    connection.playerName = name;

    // Notify all players of the room update
    this.broadcastRoomUpdate();

    return { playerId, token };
  }

  removePlayer(playerId: string): void {
    this.players = this.players.filter((p) => p.id !== playerId);
    this.broadcastRoomUpdate();
  }

  getPlayerByToken(token: string): RoomPlayer | undefined {
    return this.players.find((p) => p.token === token);
  }

  reconnectPlayer(token: string, connection: Connection): boolean {
    const player = this.getPlayerByToken(token);
    if (!player) return false;

    player.connection = connection;
    connection.playerId = player.id;
    connection.roomId = this.roomId;
    connection.token = token;
    connection.playerName = player.name;

    // Update connected status in game state
    if (this.gameState) {
      this.gameState = {
        ...this.gameState,
        players: this.gameState.players.map((p) =>
          p.id === player.id ? { ...p, connected: true } : p
        ),
      };

      // Send reconnected state
      const filteredState = filterStateForPlayer(this.gameState, player.id);
      connection.send({ type: "RECONNECTED", state: filteredState });

      // Notify others
      for (const p of this.players) {
        if (p.id !== player.id && p.connection?.isOpen) {
          p.connection.send({
            type: "PLAYER_RECONNECTED",
            playerId: player.id,
          });
        }
      }
    }

    return true;
  }

  handleDisconnect(playerId: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;

    player.connection = null;

    if (this.gameState) {
      this.gameState = {
        ...this.gameState,
        players: this.gameState.players.map((p) =>
          p.id === playerId ? { ...p, connected: false } : p
        ),
      };

      // Notify other players
      for (const p of this.players) {
        if (p.id !== playerId && p.connection?.isOpen) {
          p.connection.send({
            type: "PLAYER_DISCONNECTED",
            playerId,
          });
        }
      }
    }
  }

  startGame(): boolean {
    if (this.players.length < 3 || this.players.length > 4) return false;
    if (this.status !== "waiting") return false;

    const seed = Date.now();
    const playerInfos = this.players.map((p) => ({
      id: p.id,
      name: p.name,
    }));

    this.gameState = createGameState(this.roomId, playerInfos, seed);
    this.status = "in_progress";

    // Send initial state to each player
    for (const player of this.players) {
      if (player.connection?.isOpen) {
        const filteredState = filterStateForPlayer(this.gameState, player.id);
        player.connection.send({
          type: "GAME_STARTED",
          state: filteredState,
        });
      }
    }

    return true;
  }

  handleAction(playerId: string, action: Action): void {
    if (!this.gameState) return;
    if (this.status !== "in_progress") return;

    const playerAction: PlayerAction = { ...action, playerId };

    try {
      this.gameState = dispatch(this.gameState, playerAction);

      // Check if game is over
      if (this.gameState.winner) {
        this.status = "finished";
      }

      // Broadcast updated state to all players
      this.broadcastState();
    } catch (error) {
      if (error instanceof InvalidActionError) {
        const player = this.players.find((p) => p.id === playerId);
        player?.connection?.send({
          type: "ACTION_REJECTED",
          action,
          reason: error.message,
        });
      }
    }
  }

  handleChat(playerId: string, message: string): void {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;

    for (const p of this.players) {
      p.connection?.send({
        type: "CHAT_MESSAGE",
        playerId,
        playerName: player.name,
        message,
      });
    }
  }

  getRoomInfo(): RoomInfo {
    return {
      roomId: this.roomId,
      hostId: this.hostId,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
      })),
      maxPlayers: this.maxPlayers,
      status: this.status,
    };
  }

  get playerCount(): number {
    return this.players.length;
  }

  private broadcastState(): void {
    if (!this.gameState) return;

    for (const player of this.players) {
      if (player.connection?.isOpen) {
        const filteredState = filterStateForPlayer(this.gameState, player.id);
        player.connection.send({
          type: "STATE_UPDATE",
          state: filteredState,
        });
      }
    }
  }

  private broadcastRoomUpdate(): void {
    const roomInfo = this.getRoomInfo();
    for (const player of this.players) {
      player.connection?.send({
        type: "ROOM_UPDATE",
        roomInfo,
      });
    }
  }
}
