/**
 * Main application component.
 * Routes between lobby, waiting room, and game screens.
 */

import { useCallback, useMemo, useRef } from "react";
import type {
  VertexCoord,
  EdgeCoord,
  CubeCoord,
  ResourceBundle,
  ResourceType,
  DevCardType,
  Action,
} from "@catan/shared";
import { RESOURCE_TYPES } from "@catan/shared";
import { useWebSocket } from "./hooks/useWebSocket";
import { useGameState } from "./hooks/useGameState";
import { useBoard } from "./hooks/useBoard";
import HexBoard from "./components/board/HexBoard";
import PlayerDashboard from "./components/hud/PlayerDashboard";
import TurnControls from "./components/game/TurnControls";
import PlayerList from "./components/game/PlayerList";
import GameLog from "./components/game/GameLog";
import DiscardDialog from "./components/game/DiscardDialog";
import StealDialog from "./components/game/StealDialog";
import VictoryScreen from "./components/game/VictoryScreen";
import TradePanel from "./components/trading/TradePanel";
import LobbyScreen from "./components/lobby/LobbyScreen";
import WaitingRoom from "./components/lobby/WaitingRoom";
import { PLAYER_COLOR_MAP } from "./utils/colors";

const WS_URL = `ws://${window.location.hostname}:3001`;

export default function App() {
  const { send, lastMessage, connected } = useWebSocket(WS_URL);
  const {
    screen,
    gameState,
    roomInfo,
    roomList,
    myPlayerId,
    isMyTurn,
    error,
    rejectedAction,
  } = useGameState(lastMessage);
  const {
    placementMode,
    setPlacementMode,
    validVertices,
    validEdges,
    validHexes,
  } = useBoard(gameState, myPlayerId);

  // Track whether we're playing a knight (so hex click sends PLAY_KNIGHT instead of MOVE_ROBBER)
  const playingKnightRef = useRef(false);

  // Build player color map for rendering
  const playerColors = useMemo(() => {
    const map = new Map<string, string>();
    if (gameState) {
      for (const player of gameState.players) {
        map.set(
          player.id,
          PLAYER_COLOR_MAP[player.color as keyof typeof PLAYER_COLOR_MAP] ?? "#888"
        );
      }
    }
    return map;
  }, [gameState]);

  const sendAction = useCallback(
    (action: Action) => {
      send({ type: "GAME_ACTION", action });
    },
    [send]
  );

  // Auto-set placement mode based on game phase
  const effectivePlacementMode = useMemo(() => {
    if (!gameState || !isMyTurn) return placementMode;
    const { turnState } = gameState;

    if (turnState.phase === "SETUP") {
      if (turnState.setupSubPhase === "PLACE_SETTLEMENT") return "settlement";
      if (turnState.setupSubPhase === "PLACE_ROAD") return "road";
    }

    if (
      turnState.phase === "MAIN" &&
      turnState.mainSubPhase === "MOVE_ROBBER"
    ) {
      return "robber";
    }

    if (turnState.roadBuildingRoadsLeft > 0) return "road";

    return placementMode;
  }, [gameState, isMyTurn, placementMode]);

  // Use effective mode for valid placements
  const effectiveValidVertices = useMemo(() => {
    if (effectivePlacementMode === "settlement" || effectivePlacementMode === "city")
      return validVertices;
    return undefined;
  }, [effectivePlacementMode, validVertices]);

  const effectiveValidEdges = useMemo(() => {
    if (effectivePlacementMode === "road") return validEdges;
    return undefined;
  }, [effectivePlacementMode, validEdges]);

  const effectiveValidHexes = useMemo(() => {
    if (effectivePlacementMode === "robber") return validHexes;
    return undefined;
  }, [effectivePlacementMode, validHexes]);

  // Handlers
  const handleVertexClick = useCallback(
    (vertex: VertexCoord) => {
      if (effectivePlacementMode === "settlement") {
        sendAction({ type: "PLACE_SETTLEMENT", vertex });
        setPlacementMode("none");
      } else if (effectivePlacementMode === "city") {
        sendAction({ type: "PLACE_CITY", vertex });
        setPlacementMode("none");
      }
    },
    [effectivePlacementMode, sendAction, setPlacementMode]
  );

  const handleEdgeClick = useCallback(
    (edge: EdgeCoord) => {
      if (effectivePlacementMode === "road") {
        sendAction({ type: "PLACE_ROAD", edge });
        // Don't reset mode if road building has roads left
        if (
          gameState &&
          gameState.turnState.roadBuildingRoadsLeft <= 1 &&
          gameState.turnState.phase !== "SETUP"
        ) {
          setPlacementMode("none");
        }
      }
    },
    [effectivePlacementMode, sendAction, setPlacementMode, gameState]
  );

  const handleHexClick = useCallback(
    (hex: CubeCoord) => {
      if (effectivePlacementMode === "robber") {
        if (playingKnightRef.current) {
          // Playing a knight card — send PLAY_KNIGHT with the chosen hex
          sendAction({ type: "PLAY_KNIGHT", robberHex: hex });
          playingKnightRef.current = false;
        } else {
          // Normal robber move (after rolling 7)
          sendAction({ type: "MOVE_ROBBER", hex });
        }
        setPlacementMode("none");
      }
    },
    [effectivePlacementMode, sendAction, setPlacementMode]
  );

  const handleDiscard = useCallback(
    (resources: ResourceBundle) => {
      sendAction({ type: "DISCARD_RESOURCES", resources });
    },
    [sendAction]
  );

  const handleSteal = useCallback(
    (targetPlayerId: string) => {
      sendAction({ type: "STEAL", targetPlayerId });
    },
    [sendAction]
  );

  const handlePlayCard = useCallback(
    (cardType: DevCardType) => {
      switch (cardType) {
        case "knight":
          // Knight is a compound action: play card + move robber
          // Set flag so hex click sends PLAY_KNIGHT instead of MOVE_ROBBER
          playingKnightRef.current = true;
          setPlacementMode("robber");
          break;
        case "roadBuilding":
          sendAction({ type: "PLAY_ROAD_BUILDING", edges: [] });
          break;
        case "yearOfPlenty":
          // Simple: prompt for 2 resources. For now, just take 2 wheat.
          // TODO: Add a proper dialog for this
          const r1 = prompt("First resource (wood/brick/sheep/wheat/ore):");
          const r2 = prompt("Second resource (wood/brick/sheep/wheat/ore):");
          if (
            r1 &&
            r2 &&
            RESOURCE_TYPES.includes(r1 as ResourceType) &&
            RESOURCE_TYPES.includes(r2 as ResourceType)
          ) {
            sendAction({
              type: "PLAY_YEAR_OF_PLENTY",
              resources: [r1 as ResourceType, r2 as ResourceType],
            });
          }
          break;
        case "monopoly":
          const res = prompt("Choose resource (wood/brick/sheep/wheat/ore):");
          if (res && RESOURCE_TYPES.includes(res as ResourceType)) {
            sendAction({ type: "PLAY_MONOPOLY", resource: res as ResourceType });
          }
          break;
      }
    },
    [sendAction, setPlacementMode]
  );

  // Check if we need to show discard dialog
  const needsDiscard = useMemo(() => {
    if (!gameState || !myPlayerId) return false;
    const pending = gameState.turnState.pendingDiscards;
    if (pending instanceof Map) return pending.has(myPlayerId);
    return (pending as unknown as Record<string, number>)[myPlayerId] !== undefined;
  }, [gameState, myPlayerId]);

  const discardCount = useMemo(() => {
    if (!gameState || !myPlayerId) return 0;
    const pending = gameState.turnState.pendingDiscards;
    if (pending instanceof Map) return pending.get(myPlayerId) ?? 0;
    return (pending as unknown as Record<string, number>)[myPlayerId] ?? 0;
  }, [gameState, myPlayerId]);

  // Check if we need to show steal dialog
  const stealTargets = useMemo(() => {
    if (!gameState || !isMyTurn) return [];
    if (gameState.turnState.mainSubPhase !== "STEAL") return [];
    return gameState.turnState.mustStealFrom;
  }, [gameState, isMyTurn]);

  // Render based on screen
  if (screen === "lobby") {
    return (
      <LobbyScreen
        roomList={roomList}
        onSend={send}
        connected={connected}
      />
    );
  }

  if (screen === "waiting" && roomInfo) {
    return (
      <WaitingRoom
        roomInfo={roomInfo}
        myPlayerId={myPlayerId!}
        onSend={send}
      />
    );
  }

  if (!gameState || !myPlayerId) {
    return <div className="loading">Loading game...</div>;
  }

  // Get my resources from the self player view
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const myResources: ResourceBundle =
    myPlayer?.viewType === "self" && "resources" in myPlayer
      ? (myPlayer as { resources: ResourceBundle }).resources
      : { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

  const canTrade =
    isMyTurn &&
    gameState.turnState.phase === "MAIN" &&
    gameState.turnState.mainSubPhase === "TRADE_BUILD_PLAY";

  return (
    <div className="game-screen">
      {/* Error/rejection notifications */}
      {error && <div className="notification error">{error}</div>}
      {rejectedAction && (
        <div className="notification warning">
          Action rejected: {rejectedAction.reason}
        </div>
      )}

      <div className="game-layout">
        {/* Left: Player list */}
        <div className="game-left">
          <PlayerList gameState={gameState} myPlayerId={myPlayerId} />
          <GameLog log={gameState.log} />
        </div>

        {/* Center: Board */}
        <div className="game-center">
          <TurnControls
            gameState={gameState}
            isMyTurn={isMyTurn}
            onRollDice={() => sendAction({ type: "ROLL_DICE" })}
            onEndTurn={() => sendAction({ type: "END_TURN" })}
          />
          <HexBoard
            gameState={gameState}
            validVertices={effectiveValidVertices}
            validEdges={effectiveValidEdges}
            validHexes={effectiveValidHexes}
            onVertexClick={handleVertexClick}
            onEdgeClick={handleEdgeClick}
            onHexClick={handleHexClick}
            playerColors={playerColors}
          />
        </div>

        {/* Right: Dashboard + Trading */}
        <div className="game-right">
          <PlayerDashboard
            gameState={gameState}
            myPlayerId={myPlayerId}
            isMyTurn={isMyTurn}
            onStartPlacement={setPlacementMode}
            onBuyDevCard={() => sendAction({ type: "BUY_DEV_CARD" })}
            onPlayCard={handlePlayCard}
          />
          <TradePanel
            gameState={gameState}
            myPlayerId={myPlayerId}
            isMyTurn={isMyTurn}
            canTrade={canTrade}
            onProposeTrade={(offering, requesting) =>
              sendAction({ type: "PROPOSE_TRADE", offering, requesting })
            }
            onRespondToTrade={(tradeId, accept) =>
              sendAction({ type: "RESPOND_TO_TRADE", tradeId, accept })
            }
            onConfirmTrade={(tradeId, withPlayerId) =>
              sendAction({ type: "CONFIRM_TRADE", tradeId, withPlayerId })
            }
            onCancelTrade={(tradeId) =>
              sendAction({ type: "CANCEL_TRADE", tradeId })
            }
            onBankTrade={(giving, receiving) =>
              sendAction({ type: "BANK_TRADE", giving, receiving })
            }
          />
        </div>
      </div>

      {/* Modals */}
      {needsDiscard && (
        <DiscardDialog
          currentResources={myResources}
          discardCount={discardCount}
          onDiscard={handleDiscard}
        />
      )}

      {stealTargets.length > 0 && (
        <StealDialog
          gameState={gameState}
          stealTargets={stealTargets}
          onSteal={handleSteal}
        />
      )}

      {screen === "gameover" && (
        <VictoryScreen
          gameState={gameState}
          onBackToLobby={() => window.location.reload()}
        />
      )}
    </div>
  );
}
