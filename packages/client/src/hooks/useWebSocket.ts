/**
 * WebSocket connection hook with auto-reconnect.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { C2SMessage, S2CMessage } from "@catan/shared";

type UseWebSocketReturn = {
  send: (msg: C2SMessage) => void;
  lastMessage: S2CMessage | null;
  connected: boolean;
};

export function useWebSocket(url: string): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<S2CMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectAttemptsRef.current = 0;

        // Try to reconnect to an existing game
        const token = sessionStorage.getItem("catan-token");
        if (token) {
          ws.send(JSON.stringify({ type: "RECONNECT", token }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as S2CMessage;

          // Store token for reconnection
          if (msg.type === "ROOM_CREATED" || msg.type === "ROOM_JOINED") {
            sessionStorage.setItem("catan-token", msg.token);
          }

          setLastMessage(msg);
        } catch {
          // Ignore invalid messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // Connection failed, will retry via onclose
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: C2SMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send, lastMessage, connected };
}
