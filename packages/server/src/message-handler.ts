/**
 * Routes inbound WebSocket messages to the appropriate lobby or game room methods.
 */

import type { C2SMessage } from "@catan/shared";
import type { Connection } from "./connection.js";
import type { Lobby } from "./lobby.js";

export function handleMessage(
  connection: Connection,
  msg: C2SMessage,
  lobby: Lobby
): void {
  switch (msg.type) {
    case "CREATE_ROOM": {
      const result = lobby.createRoom(msg.playerName, connection);
      if (result) {
        connection.send({
          type: "ROOM_CREATED",
          roomId: result.roomId,
          playerId: result.playerId,
          token: result.token,
        });
      } else {
        connection.send({ type: "ERROR", message: "Failed to create room" });
      }
      break;
    }

    case "JOIN_ROOM": {
      const result = lobby.joinRoom(msg.roomId, msg.playerName, connection);
      if (result) {
        const room = lobby.getRoom(msg.roomId);
        connection.send({
          type: "ROOM_JOINED",
          playerId: result.playerId,
          token: result.token,
          roomInfo: room!.getRoomInfo(),
        });
      } else {
        connection.send({
          type: "ERROR",
          message: "Failed to join room (full or not found)",
        });
      }
      break;
    }

    case "LEAVE_ROOM": {
      lobby.leaveRoom(connection);
      connection.send({ type: "ROOM_LEFT" });
      break;
    }

    case "LIST_ROOMS": {
      const rooms = lobby.listRooms();
      connection.send({ type: "ROOM_LIST", rooms });
      break;
    }

    case "START_GAME": {
      if (!connection.roomId || !connection.playerId) {
        connection.send({ type: "ERROR", message: "Not in a room" });
        break;
      }

      const room = lobby.getRoom(connection.roomId);
      if (!room) {
        connection.send({ type: "ERROR", message: "Room not found" });
        break;
      }

      if (room.getRoomInfo().hostId !== connection.playerId) {
        connection.send({ type: "ERROR", message: "Only the host can start the game" });
        break;
      }

      if (!room.startGame()) {
        connection.send({
          type: "ERROR",
          message: "Cannot start game (need 3-4 players)",
        });
      }
      break;
    }

    case "RECONNECT": {
      // Try to find the room with this token
      for (const roomInfo of lobby.listRooms()) {
        const room = lobby.getRoom(roomInfo.roomId);
        if (room?.reconnectPlayer(msg.token, connection)) {
          return;
        }
      }
      connection.send({ type: "ERROR", message: "Reconnection failed" });
      break;
    }

    case "GAME_ACTION": {
      if (!connection.roomId || !connection.playerId) {
        connection.send({ type: "ERROR", message: "Not in a game" });
        break;
      }

      const room = lobby.getRoom(connection.roomId);
      if (!room) {
        connection.send({ type: "ERROR", message: "Room not found" });
        break;
      }

      room.handleAction(connection.playerId, msg.action);
      break;
    }

    case "CHAT": {
      if (!connection.roomId || !connection.playerId) break;

      const room = lobby.getRoom(connection.roomId);
      room?.handleChat(connection.playerId, msg.message);
      break;
    }

    default:
      connection.send({ type: "ERROR", message: "Unknown message type" });
  }
}
