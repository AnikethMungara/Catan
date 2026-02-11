/**
 * Longest road calculation using DFS.
 * Enemy settlements/cities break road connectivity.
 */

import type { GameState } from "../types/game.js";
import { serializeEdge, serializeVertex } from "../types/coordinates.js";
import type { VertexCoord, EdgeCoord } from "../types/coordinates.js";
import { vertexAdjacentEdges, edgeAdjacentVertices } from "./coordinate-system.js";

/**
 * Calculate the longest road for a specific player.
 * Uses DFS with backtracking to find the longest simple path.
 * Enemy buildings block road continuity at their vertex.
 */
export function calculateLongestRoad(
  state: GameState,
  playerId: string
): number {
  // Collect all edges belonging to this player
  const playerEdges = new Set<string>();
  for (const [edgeKey, road] of state.board.roads) {
    if (road.playerId === playerId) {
      playerEdges.add(edgeKey);
    }
  }

  if (playerEdges.size === 0) return 0;

  let maxLength = 0;

  function dfs(
    vertex: VertexCoord,
    visited: Set<string>,
    length: number
  ): void {
    if (length > maxLength) maxLength = length;

    const adjEdges = vertexAdjacentEdges(vertex);
    for (const edge of adjEdges) {
      const edgeKey = serializeEdge(edge);
      if (!playerEdges.has(edgeKey)) continue;
      if (visited.has(edgeKey)) continue;

      const [v1, v2] = edgeAdjacentVertices(edge);
      const nextVertex =
        serializeVertex(v1) === serializeVertex(vertex) ? v2 : v1;

      // Check if enemy building blocks passage at the next vertex
      const building = state.board.buildings.get(serializeVertex(nextVertex));
      if (building && building.playerId !== playerId) continue;

      visited.add(edgeKey);
      dfs(nextVertex, visited, length + 1);
      visited.delete(edgeKey);
    }
  }

  // Start DFS from each endpoint of each player road
  for (const edgeKey of playerEdges) {
    // We need to parse the edge to get its vertices
    const parts = edgeKey.split(",");
    const edge: EdgeCoord = {
      q: Number(parts[0]),
      r: Number(parts[1]),
      s: Number(parts[2]),
      dir: parts[3] as "NE" | "E" | "SE",
    };

    const [v1, v2] = edgeAdjacentVertices(edge);

    // Start from v1
    const visited1 = new Set<string>([edgeKey]);
    dfs(v1, visited1, 1);

    // Start from v2
    const visited2 = new Set<string>([edgeKey]);
    dfs(v2, visited2, 1);
  }

  return maxLength;
}

/**
 * Recalculate longest road for all players and update the hasLongestRoad flag.
 * Called after any road placement or when a building might break a road.
 */
export function updateLongestRoad(state: GameState): GameState {
  const roadLengths = state.players.map((p) => ({
    playerId: p.id,
    length: calculateLongestRoad(state, p.id),
  }));

  // Find who currently holds longest road
  const currentHolder = state.players.find((p) => p.hasLongestRoad);

  // Find the maximum road length
  const maxLength = Math.max(...roadLengths.map((rl) => rl.length));

  // Must be at least 5 to qualify
  if (maxLength < 5) {
    // Nobody qualifies - remove longest road from everyone
    return {
      ...state,
      players: state.players.map((p, i) => ({
        ...p,
        roadLength: roadLengths[i].length,
        hasLongestRoad: false,
      })),
    };
  }

  // Find all players with the maximum length
  const playersWithMax = roadLengths.filter((rl) => rl.length === maxLength);

  let newHolderId: string | null = null;

  if (currentHolder) {
    const currentHolderLength = roadLengths.find(
      (rl) => rl.playerId === currentHolder.id
    )!.length;

    if (currentHolderLength === maxLength) {
      // Current holder still has the longest (or tied) - keep them
      newHolderId = currentHolder.id;
    } else if (playersWithMax.length === 1) {
      // Someone else strictly surpassed - transfer
      newHolderId = playersWithMax[0].playerId;
    } else {
      // Current holder lost it and there's a tie among others - nobody holds it
      newHolderId = null;
    }
  } else {
    // No current holder
    if (playersWithMax.length === 1) {
      // Single player has longest road >= 5
      newHolderId = playersWithMax[0].playerId;
    } else {
      // Tie - nobody gets it
      newHolderId = null;
    }
  }

  return {
    ...state,
    players: state.players.map((p, i) => ({
      ...p,
      roadLength: roadLengths[i].length,
      hasLongestRoad: p.id === newHolderId,
    })),
  };
}
