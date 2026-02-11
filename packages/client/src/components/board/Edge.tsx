/**
 * Renders an edge (road position) - either a built road or an interactive placement spot.
 */

import type { EdgeCoord, Road } from "@catan/shared";
import { edgeToSvg } from "../../utils/hex-to-pixel";
import { PLAYER_COLOR_MAP } from "../../utils/colors";

type Props = {
  edge: EdgeCoord;
  road?: Road;
  playerColor?: string;
  interactive?: boolean;
  onClick?: () => void;
};

export default function Edge({ edge, road, playerColor, interactive, onClick }: Props) {
  const pos = edgeToSvg(edge);

  if (road) {
    const color = playerColor ?? PLAYER_COLOR_MAP[
      road.playerId as keyof typeof PLAYER_COLOR_MAP
    ] ?? "#888";

    return (
      <line
        x1={pos.x1}
        y1={pos.y1}
        x2={pos.x2}
        y2={pos.y2}
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />
    );
  }

  if (interactive) {
    return (
      <line
        x1={pos.x1}
        y1={pos.y1}
        x2={pos.x2}
        y2={pos.y2}
        stroke="rgba(255, 255, 100, 0.5)"
        strokeWidth="8"
        strokeLinecap="round"
        className="edge-interactive"
        onClick={onClick}
        style={{ cursor: "pointer" }}
      />
    );
  }

  return null;
}
