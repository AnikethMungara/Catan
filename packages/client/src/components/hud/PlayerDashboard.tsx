/**
 * Main player dashboard container.
 */

import type {
  ClientGameState,
  DevCard,
  DevCardType,
  ResourceBundle,
} from "@catan/shared";
import ResourceBar from "./ResourceBar";
import BuildMenu from "./BuildMenu";
import DevCardHand from "./DevCardHand";
import type { PlacementMode } from "../../hooks/useBoard";

type Props = {
  gameState: ClientGameState;
  myPlayerId: string;
  isMyTurn: boolean;
  onStartPlacement: (mode: PlacementMode) => void;
  onBuyDevCard: () => void;
  onPlayCard: (cardType: DevCardType) => void;
};

export default function PlayerDashboard({
  gameState,
  myPlayerId,
  isMyTurn,
  onStartPlacement,
  onBuyDevCard,
  onPlayCard,
}: Props) {
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  if (!myPlayer) return null;

  const isSelf = myPlayer.viewType === "self";

  // Self view now includes resources and portsAccess directly
  const resources: ResourceBundle =
    isSelf && "resources" in myPlayer
      ? (myPlayer as { resources: ResourceBundle }).resources
      : { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

  const devCards: readonly DevCard[] =
    isSelf && "devCards" in myPlayer
      ? (myPlayer as { devCards: readonly DevCard[] }).devCards
      : [];

  const canBuild =
    isMyTurn &&
    gameState.turnState.phase === "MAIN" &&
    gameState.turnState.mainSubPhase === "TRADE_BUILD_PLAY";

  const canPlayDevCard =
    isMyTurn &&
    gameState.turnState.phase === "MAIN" &&
    (gameState.turnState.mainSubPhase === "TRADE_BUILD_PLAY" ||
      gameState.turnState.mainSubPhase === "ROLL_DICE");

  return (
    <div className="player-dashboard">
      <ResourceBar resources={resources} />
      <div className="dashboard-bottom">
        <BuildMenu
          resources={resources}
          settlementsRemaining={5 - countBuildings(gameState, myPlayerId, "settlement")}
          citiesRemaining={4 - countBuildings(gameState, myPlayerId, "city")}
          roadsRemaining={15 - countRoads(gameState, myPlayerId)}
          devCardDeckCount={gameState.devCardDeckCount}
          canBuild={canBuild}
          onStartPlacement={onStartPlacement}
          onBuyDevCard={onBuyDevCard}
        />
        <DevCardHand
          devCards={devCards}
          turnNumber={gameState.turnState.turnNumber}
          devCardPlayedThisTurn={gameState.turnState.devCardPlayedThisTurn}
          canPlay={canPlayDevCard}
          onPlayCard={onPlayCard}
        />
      </div>
    </div>
  );
}


function countBuildings(
  state: ClientGameState,
  playerId: string,
  type: "settlement" | "city"
): number {
  const buildings =
    state.board.buildings instanceof Map
      ? state.board.buildings
      : new Map(Object.entries(state.board.buildings));

  let count = 0;
  for (const [, building] of buildings) {
    if (
      (building as { playerId: string }).playerId === playerId &&
      (building as { type: string }).type === type
    ) {
      count++;
    }
  }
  return count;
}

function countRoads(state: ClientGameState, playerId: string): number {
  const roads =
    state.board.roads instanceof Map
      ? state.board.roads
      : new Map(Object.entries(state.board.roads));

  let count = 0;
  for (const [, road] of roads) {
    if ((road as { playerId: string }).playerId === playerId) {
      count++;
    }
  }
  return count;
}
