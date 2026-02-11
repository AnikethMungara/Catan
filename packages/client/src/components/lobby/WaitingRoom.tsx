/**
 * Pre-game waiting room: shows joined players, start button for host.
 */

import type { RoomInfo, C2SMessage } from "@catan/shared";
import { PLAYER_COLOR_MAP } from "../../utils/colors";

type Props = {
  roomInfo: RoomInfo;
  myPlayerId: string;
  onSend: (msg: C2SMessage) => void;
};

export default function WaitingRoom({ roomInfo, myPlayerId, onSend }: Props) {
  const isHost = roomInfo.hostId === myPlayerId;
  const canStart =
    isHost && roomInfo.players.length >= 3 && roomInfo.players.length <= 4;

  return (
    <div className="waiting-room">
      <h2>Game Room: {roomInfo.roomId}</h2>
      <p className="room-code-hint">Share this code with friends to join!</p>

      <div className="waiting-players">
        {roomInfo.players.map((player) => {
          const color =
            PLAYER_COLOR_MAP[
              player.color as keyof typeof PLAYER_COLOR_MAP
            ] ?? "#888";

          return (
            <div
              key={player.id}
              className="waiting-player"
              style={{ borderLeftColor: color }}
            >
              <span
                className="player-color-dot"
                style={{ backgroundColor: color }}
              />
              <span className="player-name">
                {player.name}
                {player.id === roomInfo.hostId && " (Host)"}
                {player.id === myPlayerId && " (You)"}
              </span>
            </div>
          );
        })}
        {Array.from({ length: 4 - roomInfo.players.length }).map((_, i) => (
          <div key={`empty-${i}`} className="waiting-player empty">
            <span className="player-name">Waiting for player...</span>
          </div>
        ))}
      </div>

      <div className="waiting-actions">
        {isHost ? (
          <button
            className="btn btn-primary"
            disabled={!canStart}
            onClick={() => onSend({ type: "START_GAME" })}
          >
            {canStart
              ? "Start Game"
              : `Need ${3 - roomInfo.players.length} more player(s)`}
          </button>
        ) : (
          <p>Waiting for host to start the game...</p>
        )}
        <button
          className="btn btn-secondary"
          onClick={() => onSend({ type: "LEAVE_ROOM" })}
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}
