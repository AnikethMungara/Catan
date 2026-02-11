/**
 * Renders a single hex tile with terrain pattern and number token.
 */

import type { HexTile as HexTileType } from "@catan/shared";
import { hexToSvg, hexPolygonPoints, HEX_SIZE } from "../../utils/hex-to-pixel";
import { NUMBER_TOKEN_COLORS } from "../../utils/colors";

type Props = {
  hex: HexTileType;
  isRobber: boolean;
  highlighted?: boolean;
  onClick?: () => void;
};

const TERRAIN_PATTERN: Record<string, string> = {
  forest: "url(#pat-forest)",
  pasture: "url(#pat-pasture)",
  fields: "url(#pat-fields)",
  hills: "url(#pat-hills)",
  mountains: "url(#pat-mountains)",
  desert: "url(#pat-desert)",
};

// Dot count for number probability indicator
const NUMBER_DOTS: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
};

export default function HexTile({ hex, isRobber, highlighted, onClick }: Props) {
  const center = hexToSvg(hex.coord);
  const points = hexPolygonPoints(center.x, center.y, HEX_SIZE);

  const isRed = hex.numberToken === 6 || hex.numberToken === 8;
  const textColor = isRed ? NUMBER_TOKEN_COLORS[6] : "#1A202C";
  const dots = hex.numberToken ? NUMBER_DOTS[hex.numberToken] ?? 0 : 0;

  return (
    <g
      className={`hex-tile ${highlighted ? "hex-highlighted" : ""}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* Hex shape with terrain pattern */}
      <polygon
        points={points}
        fill={TERRAIN_PATTERN[hex.terrain]}
        stroke="#5D4037"
        strokeWidth="2"
      />

      {/* Highlight overlay */}
      {highlighted && (
        <polygon
          points={points}
          fill="rgba(255, 255, 100, 0.3)"
          stroke="#FFD700"
          strokeWidth="3"
        />
      )}

      {/* Number token */}
      {hex.numberToken && (
        <g>
          <circle
            cx={center.x}
            cy={center.y}
            r={16}
            fill="#FFF8DC"
            stroke="#5D4037"
            strokeWidth="1.5"
          />
          <text
            x={center.x}
            y={center.y - 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={isRed ? "16" : "14"}
            fontWeight={isRed ? "bold" : "normal"}
            fill={textColor}
            fontFamily="serif"
          >
            {hex.numberToken}
          </text>
          {/* Probability dots */}
          <g>
            {Array.from({ length: dots }).map((_, i) => (
              <circle
                key={i}
                cx={center.x - ((dots - 1) * 3) / 2 + i * 3}
                cy={center.y + 10}
                r={1}
                fill={textColor}
              />
            ))}
          </g>
        </g>
      )}

      {/* Robber */}
      {isRobber && (
        <use
          href="#robber"
          x={center.x - 8}
          y={center.y - 18}
          width="16"
          height="24"
          opacity="0.9"
        />
      )}
    </g>
  );
}
