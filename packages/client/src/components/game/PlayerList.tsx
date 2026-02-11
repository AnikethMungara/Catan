/**
 * Player list sidebar showing all players' public information.
 */

import type { ClientGameState } from "@catan/shared";
import { PLAYER_COLOR_MAP } from "../../utils/colors";

type Props = {
  gameState: ClientGameState;
  myPlayerId: string;
};

export default function PlayerList({ gameState, myPlayerId }: Props) {
  const currentIdx = gameState.turnState.currentPlayerIndex;

  return (
    <div className="player-list">
      <h3>Players</h3>
      {gameState.players.map((player, index) => {
        const isMe = player.id === myPlayerId;
        const isCurrent = index === currentIdx;
        const color =
          PLAYER_COLOR_MAP[
            player.color as keyof typeof PLAYER_COLOR_MAP
          ] ?? "#888";

        return (
          <div
            key={player.id}
            className={`player-card ${isCurrent ? "current" : ""} ${
              isMe ? "me" : ""
            } ${!player.connected ? "disconnected" : ""}`}
            style={{ borderLeftColor: color }}
          >
            <div className="player-name">
              <span
                className="player-color-dot"
                style={{ backgroundColor: color }}
              />
              {player.name}
              {isMe && " (You)"}
              {!player.connected && " [DC]"}
            </div>
            <div className="player-stats">
              <span className="stat" title="Victory Points">
                VP: {player.publicVP}
              </span>
              <span className="stat" title="Resource Cards">
                Cards: {player.resourceCount}
              </span>
              <span className="stat" title="Dev Cards">
                Dev: {player.devCardCount}
              </span>
              <span className="stat" title="Knights Played">
                Knights: {player.knightsPlayed}
              </span>
              <span className="stat" title="Road Length">
                Road: {player.roadLength}
              </span>
            </div>
            <div className="player-awards">
              {player.hasLongestRoad && (
                <span className="award">Longest Road</span>
              )}
              {player.hasLargestArmy && (
                <span className="award">Largest Army</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
