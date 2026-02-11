/**
 * Lobby screen: create or join a game room.
 */

import { useState, useEffect } from "react";
import type { RoomInfo, C2SMessage } from "@catan/shared";

type Props = {
  roomList: RoomInfo[];
  onSend: (msg: C2SMessage) => void;
  connected: boolean;
};

export default function LobbyScreen({ roomList, onSend, connected }: Props) {
  const [playerName, setPlayerName] = useState(
    () => sessionStorage.getItem("catan-name") ?? ""
  );
  const [joinRoomId, setJoinRoomId] = useState("");

  useEffect(() => {
    if (connected) {
      onSend({ type: "LIST_ROOMS" });
      const interval = setInterval(() => {
        onSend({ type: "LIST_ROOMS" });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [connected, onSend]);

  const saveName = () => {
    sessionStorage.setItem("catan-name", playerName);
  };

  const createRoom = () => {
    if (!playerName.trim()) return;
    saveName();
    onSend({ type: "CREATE_ROOM", playerName: playerName.trim() });
  };

  const joinRoom = (roomId: string) => {
    if (!playerName.trim()) return;
    saveName();
    onSend({
      type: "JOIN_ROOM",
      roomId,
      playerName: playerName.trim(),
    });
  };

  return (
    <div className="lobby-screen">
      <h1>Settlers of Catan</h1>

      {!connected && (
        <div className="connection-status">Connecting to server...</div>
      )}

      <div className="lobby-form">
        <input
          type="text"
          placeholder="Your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={20}
        />
        <button
          className="btn btn-primary"
          onClick={createRoom}
          disabled={!connected || !playerName.trim()}
        >
          Create Game
        </button>
      </div>

      <div className="lobby-join">
        <h3>Join by Code</h3>
        <div className="join-form">
          <input
            type="text"
            placeholder="Room code"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button
            className="btn btn-secondary"
            onClick={() => joinRoom(joinRoomId)}
            disabled={!connected || !playerName.trim() || !joinRoomId}
          >
            Join
          </button>
        </div>
      </div>

      {roomList.length > 0 && (
        <div className="room-list">
          <h3>Available Games</h3>
          {roomList.map((room) => (
            <div key={room.roomId} className="room-card">
              <div className="room-info">
                <span className="room-id">{room.roomId}</span>
                <span className="room-players">
                  {room.players.length}/{room.maxPlayers} players
                </span>
              </div>
              <div className="room-player-names">
                {room.players.map((p) => p.name).join(", ")}
              </div>
              <button
                className="btn btn-small"
                onClick={() => joinRoom(room.roomId)}
                disabled={
                  !connected ||
                  !playerName.trim() ||
                  room.players.length >= room.maxPlayers
                }
              >
                Join
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
