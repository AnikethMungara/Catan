/**
 * Board interaction state management.
 * Computes valid placements based on current game state and selected action.
 */

import { useState, useMemo } from "react";
import type {
  ClientGameState,
  Building,
  Road,
} from "@catan/shared";
import {
  allVertexCoords,
  allEdgeCoords,
  allHexCoords,
  serializeVertex,
  serializeEdge,
  serializeHex,
  vertexAdjacentVertices,
  vertexAdjacentEdges,
  edgeAdjacentVertices,
} from "@catan/shared";

export type PlacementMode =
  | "none"
  | "settlement"
  | "road"
  | "city"
  | "robber";

type UseBoardReturn = {
  placementMode: PlacementMode;
  setPlacementMode: (mode: PlacementMode) => void;
  validVertices: Set<string>;
  validEdges: Set<string>;
  validHexes: Set<string>;
};

export function useBoard(
  gameState: ClientGameState | null,
  myPlayerId: string | null
): UseBoardReturn {
  const [placementMode, setPlacementMode] = useState<PlacementMode>("none");

  const buildings: Map<string, Building> = useMemo(() => {
    if (!gameState) return new Map();
    return gameState.board.buildings instanceof Map
      ? gameState.board.buildings
      : new Map(Object.entries(gameState.board.buildings));
  }, [gameState?.board.buildings]);

  const roads: Map<string, Road> = useMemo(() => {
    if (!gameState) return new Map();
    return gameState.board.roads instanceof Map
      ? gameState.board.roads
      : new Map(Object.entries(gameState.board.roads));
  }, [gameState?.board.roads]);

  const validVertices = useMemo(() => {
    const result = new Set<string>();
    if (!gameState || !myPlayerId) return result;

    const isSetup = gameState.turnState.phase === "SETUP";
    const isSettlementMode =
      placementMode === "settlement" ||
      (isSetup && gameState.turnState.setupSubPhase === "PLACE_SETTLEMENT");
    const isCityMode = placementMode === "city";

    if (!isSettlementMode && !isCityMode) return result;

    if (isSettlementMode) {
      for (const vertex of allVertexCoords()) {
        const vKey = serializeVertex(vertex);

        // Not occupied
        if (buildings.has(vKey)) continue;

        // Distance rule
        const adjVerts = vertexAdjacentVertices(vertex);
        const tooClose = adjVerts.some((v) =>
          buildings.has(serializeVertex(v))
        );
        if (tooClose) continue;

        // Road connectivity (not required during setup)
        if (!isSetup) {
          const adjEdges = vertexAdjacentEdges(vertex);
          const hasRoad = adjEdges.some((e) => {
            const road = roads.get(serializeEdge(e));
            return road && road.playerId === myPlayerId;
          });
          if (!hasRoad) continue;
        }

        result.add(vKey);
      }
    }

    if (isCityMode) {
      for (const vertex of allVertexCoords()) {
        const vKey = serializeVertex(vertex);
        const building = buildings.get(vKey);
        if (
          building &&
          building.playerId === myPlayerId &&
          building.type === "settlement"
        ) {
          result.add(vKey);
        }
      }
    }

    return result;
  }, [gameState, myPlayerId, placementMode, buildings, roads]);

  const validEdges = useMemo(() => {
    const result = new Set<string>();
    if (!gameState || !myPlayerId) return result;

    const isSetup = gameState.turnState.phase === "SETUP";
    const isRoadMode =
      placementMode === "road" ||
      (isSetup && gameState.turnState.setupSubPhase === "PLACE_ROAD") ||
      (gameState.turnState.roadBuildingRoadsLeft > 0);

    if (!isRoadMode) return result;

    for (const edge of allEdgeCoords()) {
      const eKey = serializeEdge(edge);

      // Not occupied
      if (roads.has(eKey)) continue;

      const [v1, v2] = edgeAdjacentVertices(edge);

      // During setup, must connect to the just-placed settlement
      if (isSetup && gameState.turnState.lastSettlementVertex) {
        const lastV = gameState.turnState.lastSettlementVertex;
        if (
          serializeVertex(v1) !== lastV &&
          serializeVertex(v2) !== lastV
        ) {
          continue;
        }
      } else if (!isSetup) {
        // Must connect to own road network or building
        let connected = false;

        for (const v of [v1, v2]) {
          const vKey = serializeVertex(v);
          const building = buildings.get(vKey);

          if (building && building.playerId === myPlayerId) {
            connected = true;
            break;
          }
          if (building && building.playerId !== myPlayerId) continue;

          const adjEdges = vertexAdjacentEdges(v);
          for (const adjE of adjEdges) {
            if (serializeEdge(adjE) === eKey) continue;
            const road = roads.get(serializeEdge(adjE));
            if (road && road.playerId === myPlayerId) {
              connected = true;
              break;
            }
          }
          if (connected) break;
        }

        if (!connected) continue;
      }

      result.add(eKey);
    }

    return result;
  }, [gameState, myPlayerId, placementMode, buildings, roads]);

  const validHexes = useMemo(() => {
    const result = new Set<string>();
    if (!gameState || placementMode !== "robber") return result;

    const robberKey = serializeHex(gameState.board.robberHex);
    for (const hex of allHexCoords()) {
      const hKey = serializeHex(hex);
      if (hKey !== robberKey) {
        result.add(hKey);
      }
    }

    return result;
  }, [gameState, placementMode]);

  return {
    placementMode,
    setPlacementMode,
    validVertices,
    validEdges,
    validHexes,
  };
}
