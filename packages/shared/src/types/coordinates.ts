// Cube coordinates for hexagonal grid (q + r + s = 0)
export type CubeCoord = {
  readonly q: number;
  readonly r: number;
  readonly s: number;
};

export type VertexDirection = "N" | "S";

// A vertex (intersection) on the hex grid, identified by a hex + N/S direction
export type VertexCoord = {
  readonly q: number;
  readonly r: number;
  readonly s: number;
  readonly dir: VertexDirection;
};

export type EdgeDirection = "NE" | "E" | "SE";

// An edge on the hex grid, identified by a hex + NE/E/SE direction
export type EdgeCoord = {
  readonly q: number;
  readonly r: number;
  readonly s: number;
  readonly dir: EdgeDirection;
};

// Serialization for use as Map keys
export function serializeHex(c: CubeCoord): string {
  return `${c.q},${c.r},${c.s}`;
}

export function parseHex(s: string): CubeCoord {
  const [q, r, ss] = s.split(",").map(Number);
  return { q, r, s: ss };
}

export function serializeVertex(v: VertexCoord): string {
  return `${v.q},${v.r},${v.s},${v.dir}`;
}

export function parseVertex(s: string): VertexCoord {
  const parts = s.split(",");
  return {
    q: Number(parts[0]),
    r: Number(parts[1]),
    s: Number(parts[2]),
    dir: parts[3] as VertexDirection,
  };
}

export function serializeEdge(e: EdgeCoord): string {
  return `${e.q},${e.r},${e.s},${e.dir}`;
}

export function parseEdge(s: string): EdgeCoord {
  const parts = s.split(",");
  return {
    q: Number(parts[0]),
    r: Number(parts[1]),
    s: Number(parts[2]),
    dir: parts[3] as EdgeDirection,
  };
}

export function cubeEqual(a: CubeCoord, b: CubeCoord): boolean {
  return a.q === b.q && a.r === b.r && a.s === b.s;
}

export function vertexEqual(a: VertexCoord, b: VertexCoord): boolean {
  return a.q === b.q && a.r === b.r && a.s === b.s && a.dir === b.dir;
}

export function edgeEqual(a: EdgeCoord, b: EdgeCoord): boolean {
  return a.q === b.q && a.r === b.r && a.s === b.s && a.dir === b.dir;
}
