/**
 * Main SVG board component.
 * Renders all hexes, roads, buildings, ports, and interactive overlays.
 */

import type {
  ClientGameState,
  HexTile as HexTileType,
  Building,
  Road,
  VertexCoord,
  EdgeCoord,
  CubeCoord,
} from "@catan/shared";
import {
  allVertexCoords,
  allEdgeCoords,
  serializeVertex,
  serializeEdge,
  serializeHex,
} from "@catan/shared";
import SvgDefs from "./SvgDefs";
import HexTile from "./HexTile";
import Vertex from "./Vertex";
import Edge from "./Edge";
import Port from "./Port";
import { OCEAN_COLOR } from "../../utils/colors";

type Props = {
  gameState: ClientGameState;
  validVertices?: Set<string>; // serialized vertex keys
  validEdges?: Set<string>; // serialized edge keys
  validHexes?: Set<string>; // serialized hex keys for robber
  onVertexClick?: (vertex: VertexCoord) => void;
  onEdgeClick?: (edge: EdgeCoord) => void;
  onHexClick?: (hex: CubeCoord) => void;
  playerColors: Map<string, string>; // playerId -> color hex string
};

export default function HexBoard({
  gameState,
  validVertices,
  validEdges,
  validHexes,
  onVertexClick,
  onEdgeClick,
  onHexClick,
  playerColors,
}: Props) {
  const { board } = gameState;

  // Parse Maps from serialized state
  const hexes: [string, HexTileType][] =
    board.hexes instanceof Map
      ? [...board.hexes]
      : Object.entries(board.hexes);

  const buildings: Map<string, Building> =
    board.buildings instanceof Map
      ? board.buildings
      : new Map(Object.entries(board.buildings));

  const roads: Map<string, Road> =
    board.roads instanceof Map
      ? board.roads
      : new Map(Object.entries(board.roads));

  const allVerts = allVertexCoords();
  const allEdges = allEdgeCoords();

  return (
    <svg viewBox="0 0 800 760" className="hex-board">
      <SvgDefs />

      {/* Ocean background */}
      <rect width="800" height="760" fill={OCEAN_COLOR} rx="8" />

      {/* Ports (render behind hexes) */}
      {board.ports.map((port, i) => (
        <Port key={`port-${i}`} port={port} />
      ))}

      {/* Hex tiles */}
      {hexes.map(([key, hex]) => (
        <HexTile
          key={key}
          hex={hex}
          isRobber={serializeHex(board.robberHex) === key}
          highlighted={validHexes?.has(key)}
          onClick={
            validHexes?.has(key) && onHexClick
              ? () => onHexClick(hex.coord)
              : undefined
          }
        />
      ))}

      {/* Roads */}
      {allEdges.map((edge) => {
        const eKey = serializeEdge(edge);
        const road = roads.get(eKey);
        if (!road) return null;
        return (
          <Edge
            key={eKey}
            edge={edge}
            road={road}
            playerColor={playerColors.get(road.playerId)}
          />
        );
      })}

      {/* Interactive edge spots */}
      {validEdges &&
        allEdges
          .filter((e) => validEdges.has(serializeEdge(e)))
          .map((edge) => (
            <Edge
              key={`int-${serializeEdge(edge)}`}
              edge={edge}
              interactive
              onClick={() => onEdgeClick?.(edge)}
            />
          ))}

      {/* Buildings */}
      {allVerts.map((vertex) => {
        const vKey = serializeVertex(vertex);
        const building = buildings.get(vKey);
        if (!building) return null;
        return <Vertex key={vKey} vertex={vertex} building={building} />;
      })}

      {/* Interactive vertex spots */}
      {validVertices &&
        allVerts
          .filter((v) => validVertices.has(serializeVertex(v)))
          .map((vertex) => (
            <Vertex
              key={`int-${serializeVertex(vertex)}`}
              vertex={vertex}
              interactive
              onClick={() => onVertexClick?.(vertex)}
            />
          ))}
    </svg>
  );
}
