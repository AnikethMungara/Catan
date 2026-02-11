/**
 * Renders a vertex (intersection) - either a building or an interactive placement spot.
 */

import type { VertexCoord, Building } from "@catan/shared";
import { vertexToSvg } from "../../utils/hex-to-pixel";
import { PLAYER_COLOR_MAP } from "../../utils/colors";

type Props = {
  vertex: VertexCoord;
  building?: Building;
  interactive?: boolean;
  onClick?: () => void;
};

export default function Vertex({ vertex, building, interactive, onClick }: Props) {
  const pos = vertexToSvg(vertex);

  if (building) {
    const color = PLAYER_COLOR_MAP[
      building.playerId as keyof typeof PLAYER_COLOR_MAP
    ] ?? "#888";

    if (building.type === "city") {
      return (
        <use
          href="#city"
          x={pos.x - 12}
          y={pos.y - 14}
          width="24"
          height="24"
          fill={color}
          stroke="#000"
          strokeWidth="0.5"
        />
      );
    }

    return (
      <use
        href="#settlement"
        x={pos.x - 9}
        y={pos.y - 11}
        width="18"
        height="18"
        fill={color}
        stroke="#000"
        strokeWidth="0.5"
      />
    );
  }

  if (interactive) {
    return (
      <circle
        cx={pos.x}
        cy={pos.y}
        r={8}
        fill="rgba(255, 255, 100, 0.6)"
        stroke="#FFD700"
        strokeWidth="2"
        className="vertex-interactive"
        onClick={onClick}
        style={{ cursor: "pointer" }}
      />
    );
  }

  return null;
}
