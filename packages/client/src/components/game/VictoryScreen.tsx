/**
 * Victory screen overlay.
 */

import type { ClientGameState } from "@catan/shared";
import { PLAYER_COLOR_MAP } from "../../utils/colors";

type Props = {
  gameState: ClientGameState;
  onBackToLobby: () => void;
};

export default function VictoryScreen({ gameState, onBackToLobby }: Props) {
  const winner = gameState.players.find(
    (p) => p.id === gameState.winner
  );
  if (!winner) return null;

  const color =
    PLAYER_COLOR_MAP[winner.color as keyof typeof PLAYER_COLOR_MAP] ?? "#888";

  return (
    <div className="modal-overlay victory-overlay">
      <div className="modal victory-screen">
        <h1 style={{ color }}>
          {winner.name} Wins!
        </h1>
        <p className="victory-vp">
          with {winner.publicVP}+ Victory Points
        </p>

        <h3>Final Standings</h3>
        <div className="final-standings">
          {gameState.players.map((player) => {
            const pColor =
              PLAYER_COLOR_MAP[
                player.color as keyof typeof PLAYER_COLOR_MAP
              ] ?? "#888";
            return (
              <div
                key={player.id}
                className="standing-row"
                style={{ borderLeftColor: pColor }}
              >
                <span className="standing-name">{player.name}</span>
                <span className="standing-vp">{player.publicVP} VP</span>
                {player.hasLongestRoad && (
                  <span className="award">Longest Road</span>
                )}
                {player.hasLargestArmy && (
                  <span className="award">Largest Army</span>
                )}
              </div>
            );
          })}
        </div>

        <button className="btn btn-primary" onClick={onBackToLobby}>
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
