/**
 * Turn control buttons: Roll Dice, End Turn, etc.
 */

import type { ClientGameState } from "@catan/shared";

type Props = {
  gameState: ClientGameState;
  isMyTurn: boolean;
  onRollDice: () => void;
  onEndTurn: () => void;
};

export default function TurnControls({
  gameState,
  isMyTurn,
  onRollDice,
  onEndTurn,
}: Props) {
  const { turnState } = gameState;
  const currentPlayer = gameState.players[turnState.currentPlayerIndex];
  const phase = turnState.phase;
  const subPhase = turnState.mainSubPhase;

  return (
    <div className="turn-controls">
      <div className="turn-info">
        <span
          className="current-player"
          style={{ fontWeight: "bold" }}
        >
          {isMyTurn ? "Your turn" : `${currentPlayer.name}'s turn`}
        </span>
        {phase === "SETUP" && (
          <span className="phase-info">
            Setup: {turnState.setupSubPhase === "PLACE_SETTLEMENT"
              ? "Place Settlement"
              : "Place Road"}
          </span>
        )}
        {phase === "MAIN" && subPhase && (
          <span className="phase-info">
            {subPhase === "ROLL_DICE" && "Roll the dice"}
            {subPhase === "DISCARD" && "Discarding..."}
            {subPhase === "MOVE_ROBBER" && "Move the robber"}
            {subPhase === "STEAL" && "Choose who to steal from"}
            {subPhase === "TRADE_BUILD_PLAY" && "Trade, Build, or End Turn"}
          </span>
        )}
      </div>

      {turnState.diceRoll && (
        <div className="dice-display">
          <span className="die">{(turnState.diceRoll as [number, number])[0]}</span>
          <span className="die">{(turnState.diceRoll as [number, number])[1]}</span>
          <span className="dice-total">
            = {(turnState.diceRoll as [number, number])[0] + (turnState.diceRoll as [number, number])[1]}
          </span>
        </div>
      )}

      <div className="action-buttons">
        {isMyTurn && phase === "MAIN" && subPhase === "ROLL_DICE" && (
          <button className="btn btn-primary" onClick={onRollDice}>
            Roll Dice
          </button>
        )}
        {isMyTurn &&
          phase === "MAIN" &&
          subPhase === "TRADE_BUILD_PLAY" && (
            <button className="btn btn-secondary" onClick={onEndTurn}>
              End Turn
            </button>
          )}
      </div>
    </div>
  );
}
