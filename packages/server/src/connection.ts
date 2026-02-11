/**
 * WebSocket connection wrapper for a single player.
 */

import type { WebSocket } from "ws";
import type { S2CMessage, C2SMessage } from "@catan/shared";

export class Connection {
  public readonly ws: WebSocket;
  public playerId: string | null = null;
  public roomId: string | null = null;
  public token: string | null = null;
  public playerName: string | null = null;

  private messageHandler: ((msg: C2SMessage) => void) | null = null;

  constructor(ws: WebSocket) {
    this.ws = ws;

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as C2SMessage;
        this.messageHandler?.(msg);
      } catch {
        this.send({ type: "ERROR", message: "Invalid message format" });
      }
    });
  }

  send(msg: S2CMessage): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  onMessage(handler: (msg: C2SMessage) => void): void {
    this.messageHandler = handler;
  }

  close(): void {
    this.ws.close();
  }

  get isOpen(): boolean {
    return this.ws.readyState === this.ws.OPEN;
  }
}
