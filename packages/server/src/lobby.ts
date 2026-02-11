/**
 * Lobby: manages multiple game rooms.
 */

import type { RoomInfo } from "@catan/shared";
import { GameRoom } from "./game-room.js";
import type { Connection } from "./connection.js";

export class Lobby {
  private rooms = new Map<string, GameRoom>();

  createRoom(hostName: string, connection: Connection): { roomId: string; playerId: string; token: string } | null {
    const roomId = this.generateRoomId();
    const room = new GameRoom(roomId, "");

    const result = room.addPlayer(hostName, connection);
    if (!result) return null;

    // Set the host ID to the first player
    (room as { hostId: string }).hostId = result.playerId;

    this.rooms.set(roomId, room);

    return {
      roomId,
      playerId: result.playerId,
      token: result.token,
    };
  }

  joinRoom(
    roomId: string,
    playerName: string,
    connection: Connection
  ): { playerId: string; token: string } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return room.addPlayer(playerName, connection);
  }

  leaveRoom(connection: Connection): void {
    if (!connection.roomId || !connection.playerId) return;

    const room = this.rooms.get(connection.roomId);
    if (!room) return;

    room.removePlayer(connection.playerId);

    // Remove empty rooms
    if (room.playerCount === 0) {
      this.rooms.delete(connection.roomId);
    }

    connection.roomId = null;
    connection.playerId = null;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  listRooms(): RoomInfo[] {
    const rooms: RoomInfo[] = [];
    for (const room of this.rooms.values()) {
      const info = room.getRoomInfo();
      // Only show rooms that are waiting for players
      if (info.status === "waiting") {
        rooms.push(info);
      }
    }
    return rooms;
  }

  private generateRoomId(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id = "";
    for (let i = 0; i < 6; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    // Ensure uniqueness
    if (this.rooms.has(id)) return this.generateRoomId();
    return id;
  }
}
