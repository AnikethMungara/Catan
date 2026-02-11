/**
 * Game state management from server updates.
 */

import { useState, useEffect, useMemo } from "react";
import type {
  ClientGameState,
  S2CMessage,
  RoomInfo,
  GameEvent,
  Action,
} from "@catan/shared";

export type GameScreen = "lobby" | "waiting" | "playing" | "gameover";

type UseGameStateReturn = {
  screen: GameScreen;
  gameState: ClientGameState | null;
  roomInfo: RoomInfo | null;
  roomList: RoomInfo[];
  myPlayerId: string | null;
  isMyTurn: boolean;
  lastEvent: GameEvent | null;
  error: string | null;
  rejectedAction: { action: Action; reason: string } | null;
};

export function useGameState(lastMessage: S2CMessage | null): UseGameStateReturn {
  const [screen, setScreen] = useState<GameScreen>("lobby");
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [roomList, setRoomList] = useState<RoomInfo[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<GameEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectedAction, setRejectedAction] = useState<{
    action: Action;
    reason: string;
  } | null>(null);

  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case "ROOM_CREATED":
        setMyPlayerId(lastMessage.playerId);
        setScreen("waiting");
        break;

      case "ROOM_JOINED":
        setMyPlayerId(lastMessage.playerId);
        setRoomInfo(lastMessage.roomInfo);
        setScreen("waiting");
        break;

      case "ROOM_LIST":
        setRoomList([...lastMessage.rooms]);
        break;

      case "ROOM_UPDATE":
        setRoomInfo(lastMessage.roomInfo);
        break;

      case "ROOM_LEFT":
        setScreen("lobby");
        setRoomInfo(null);
        setMyPlayerId(null);
        break;

      case "GAME_STARTED":
        setGameState(lastMessage.state);
        setMyPlayerId(lastMessage.state.yourPlayerId);
        setScreen("playing");
        break;

      case "STATE_UPDATE":
        setGameState(lastMessage.state);
        if (lastMessage.state.winner) {
          setScreen("gameover");
        }
        break;

      case "RECONNECTED":
        setGameState(lastMessage.state);
        setMyPlayerId(lastMessage.state.yourPlayerId);
        setScreen(lastMessage.state.winner ? "gameover" : "playing");
        break;

      case "GAME_EVENT":
        setLastEvent(lastMessage.event);
        break;

      case "ACTION_REJECTED":
        setRejectedAction({
          action: lastMessage.action,
          reason: lastMessage.reason,
        });
        // Clear after 3 seconds
        setTimeout(() => setRejectedAction(null), 3000);
        break;

      case "ERROR":
        setError(lastMessage.message);
        setTimeout(() => setError(null), 5000);
        break;
    }
  }, [lastMessage]);

  const isMyTurn = useMemo(() => {
    if (!gameState || !myPlayerId) return false;
    const currentPlayer = gameState.players[gameState.turnState.currentPlayerIndex];
    return currentPlayer.id === myPlayerId;
  }, [gameState, myPlayerId]);

  return {
    screen,
    gameState,
    roomInfo,
    roomList,
    myPlayerId,
    isMyTurn,
    lastEvent,
    error,
    rejectedAction,
  };
}
