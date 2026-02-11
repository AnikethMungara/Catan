/**
 * SVG coordinate helpers.
 * Re-exports from shared with board-specific constants.
 */

import type { CubeCoord, VertexCoord, EdgeCoord } from "@catan/shared";
import {
  hexToPixel as rawHexToPixel,
  vertexToPixel as rawVertexToPixel,
  edgeAdjacentVertices,
} from "@catan/shared";

// Board rendering constants
export const HEX_SIZE = 60; // Distance from center to vertex
export const BOARD_CENTER_X = 400;
export const BOARD_CENTER_Y = 380;

export function hexToSvg(hex: CubeCoord): { x: number; y: number } {
  const raw = rawHexToPixel(hex, HEX_SIZE);
  return { x: raw.x + BOARD_CENTER_X, y: raw.y + BOARD_CENTER_Y };
}

export function vertexToSvg(v: VertexCoord): { x: number; y: number } {
  const raw = rawVertexToPixel(v, HEX_SIZE);
  return { x: raw.x + BOARD_CENTER_X, y: raw.y + BOARD_CENTER_Y };
}

export function edgeToSvg(e: EdgeCoord): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mx: number;
  my: number;
} {
  const [v1, v2] = edgeAdjacentVertices(e);
  const p1 = vertexToSvg(v1);
  const p2 = vertexToSvg(v2);
  return {
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    mx: (p1.x + p2.x) / 2,
    my: (p1.y + p2.y) / 2,
  };
}

/**
 * Generate SVG polygon points for a flat-top hexagon.
 */
export function hexPolygonPoints(cx: number, cy: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(" ");
}
