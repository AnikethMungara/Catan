/**
 * Dialog for choosing who to steal from after robber placement.
 */

import type { ClientGameState } from "@catan/shared";
import { PLAYER_COLOR_MAP } from "../../utils/colors";

type Props = {
  gameState: ClientGameState;
  stealTargets: readonly string[];
  onSteal: (targetPlayerId: string) => void;
};

export default function StealDialog({ gameState, stealTargets, onSteal }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal steal-dialog">
        <h2>Steal a Resource</h2>
        <p>Choose a player to steal from:</p>
        <div className="steal-targets">
          {stealTargets.map((targetId) => {
            const player = gameState.players.find((p) => p.id === targetId);
            if (!player) return null;
            const color =
              PLAYER_COLOR_MAP[
                player.color as keyof typeof PLAYER_COLOR_MAP
              ] ?? "#888";

            return (
              <button
                key={targetId}
                className="steal-target-btn"
                style={{ borderColor: color }}
                onClick={() => onSteal(targetId)}
              >
                <span
                  className="player-color-dot"
                  style={{ backgroundColor: color }}
                />
                {player.name} ({player.resourceCount} cards)
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
