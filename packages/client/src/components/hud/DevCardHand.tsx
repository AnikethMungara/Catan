/**
 * Development card hand display with play buttons.
 */

import type { DevCard, DevCardType } from "@catan/shared";

const CARD_NAMES: Record<DevCardType, string> = {
  knight: "Knight",
  victoryPoint: "Victory Point",
  roadBuilding: "Road Building",
  yearOfPlenty: "Year of Plenty",
  monopoly: "Monopoly",
};

const CARD_DESCRIPTIONS: Record<DevCardType, string> = {
  knight: "Move the robber and steal",
  victoryPoint: "+1 Victory Point",
  roadBuilding: "Place 2 free roads",
  yearOfPlenty: "Take any 2 resources",
  monopoly: "Take all of 1 resource type",
};

type Props = {
  devCards: readonly DevCard[];
  turnNumber: number;
  devCardPlayedThisTurn: boolean;
  canPlay: boolean; // is it your turn in a playable phase?
  onPlayCard: (cardType: DevCardType) => void;
};

export default function DevCardHand({
  devCards,
  turnNumber,
  devCardPlayedThisTurn,
  canPlay,
  onPlayCard,
}: Props) {
  if (devCards.length === 0) return null;

  // Group cards by type
  const grouped = new Map<DevCardType, { count: number; playable: boolean }>();
  for (const card of devCards) {
    const existing = grouped.get(card.type) ?? { count: 0, playable: false };
    existing.count++;
    // Playable if not bought this turn and not a VP card
    if (
      card.type !== "victoryPoint" &&
      card.turnAcquired < turnNumber
    ) {
      existing.playable = true;
    }
    grouped.set(card.type, existing);
  }

  return (
    <div className="dev-card-hand">
      <h3>Dev Cards ({devCards.length})</h3>
      <div className="dev-cards">
        {[...grouped.entries()].map(([type, info]) => {
          const playable =
            canPlay && info.playable && !devCardPlayedThisTurn;

          return (
            <div
              key={type}
              className={`dev-card ${playable ? "playable" : "not-playable"}`}
            >
              <div className="dev-card-name">
                {CARD_NAMES[type]} x{info.count}
              </div>
              <div className="dev-card-desc">{CARD_DESCRIPTIONS[type]}</div>
              {type !== "victoryPoint" && (
                <button
                  className="play-card-btn"
                  disabled={!playable}
                  onClick={() => onPlayCard(type)}
                >
                  Play
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
