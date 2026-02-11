/**
 * Renders a port indicator on the board edge.
 */

import type { Port as PortType } from "@catan/shared";
import { vertexToSvg, BOARD_CENTER_X, BOARD_CENTER_Y } from "../../utils/hex-to-pixel";
import { PORT_LABEL, RESOURCE_COLORS } from "../../utils/colors";

type Props = {
  port: PortType;
};

export default function Port({ port }: Props) {
  const v1 = vertexToSvg(port.vertices[0]);
  const v2 = vertexToSvg(port.vertices[1]);

  // Port position: midpoint of the two vertices
  const midX = (v1.x + v2.x) / 2;
  const midY = (v1.y + v2.y) / 2;

  // Extend outward from center
  const dx = midX - BOARD_CENTER_X;
  const dy = midY - BOARD_CENTER_Y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const extendDist = 30;
  const labelX = midX + (dx / dist) * extendDist;
  const labelY = midY + (dy / dist) * extendDist;

  const label = PORT_LABEL[port.type];
  const color = port.type === "generic" ? "#FFF" :
    RESOURCE_COLORS[port.type as keyof typeof RESOURCE_COLORS] ?? "#FFF";

  return (
    <g className="port">
      {/* Lines from port to vertices */}
      <line
        x1={v1.x}
        y1={v1.y}
        x2={labelX}
        y2={labelY}
        stroke="#D4A574"
        strokeWidth="2"
        strokeDasharray="4,3"
      />
      <line
        x1={v2.x}
        y1={v2.y}
        x2={labelX}
        y2={labelY}
        stroke="#D4A574"
        strokeWidth="2"
        strokeDasharray="4,3"
      />

      {/* Port label */}
      <circle
        cx={labelX}
        cy={labelY}
        r={16}
        fill="#2D3748"
        stroke={color}
        strokeWidth="2"
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="9"
        fontWeight="bold"
        fill={color}
        fontFamily="sans-serif"
      >
        {label}
      </text>
    </g>
  );
}
