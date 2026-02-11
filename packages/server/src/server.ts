/**
 * Main Catan WebSocket server.
 */

import { WebSocketServer } from "ws";
import type { Server as HTTPServer } from "http";
import { Connection } from "./connection.js";
import { Lobby } from "./lobby.js";
import { handleMessage } from "./message-handler.js";

export class CatanServer {
  private wss: WebSocketServer;
  private lobby: Lobby;
  private connections = new Set<Connection>();

  constructor(server: HTTPServer) {
    this.lobby = new Lobby();
    this.wss = new WebSocketServer({ server });

    this.wss.on("connection", (ws) => {
      const connection = new Connection(ws);
      this.connections.add(connection);

      console.log(
        `Client connected (${this.connections.size} total)`
      );

      connection.onMessage((msg) => {
        handleMessage(connection, msg, this.lobby);
      });

      ws.on("close", () => {
        this.connections.delete(connection);
        console.log(
          `Client disconnected (${this.connections.size} total)`
        );

        // Handle disconnect in game room
        if (connection.roomId && connection.playerId) {
          const room = this.lobby.getRoom(connection.roomId);
          room?.handleDisconnect(connection.playerId);
        }
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  }
}
