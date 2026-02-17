/**
 * Hex grid coordinate system for Settlers of Catan.
 *
 * Uses cube coordinates (q, r, s) where q + r + s = 0 for hexes.
 * Flat-top hex orientation.
 *
 * Vertices are identified as (hex, "N"|"S") - canonical form.
 * Edges are identified as (hex, "NE"|"E"|"SE") - canonical form.
 *
 * All adjacency relationships are precomputed on first access.
 */

import type { CubeCoord, VertexCoord, EdgeCoord } from "../types/coordinates.js";
import { serializeHex, serializeVertex, serializeEdge } from "../types/coordinates.js";
import { HEX_POSITIONS } from "../constants/board-layout.js";

// ===== Hex Neighbors =====

const HEX_DIRECTIONS: readonly CubeCoord[] = [
  { q: 1, r: -1, s: 0 },  // NE
  { q: 1, r: 0, s: -1 },  // E
  { q: 0, r: 1, s: -1 },  // SE
  { q: -1, r: 1, s: 0 },  // SW
  { q: -1, r: 0, s: 1 },  // W
  { q: 0, r: -1, s: 1 },  // NW
];

export function hexNeighbor(hex: CubeCoord, direction: number): CubeCoord {
  const d = HEX_DIRECTIONS[direction];
  return { q: hex.q + d.q, r: hex.r + d.r, s: hex.s + d.s };
}

export function hexNeighbors(hex: CubeCoord): CubeCoord[] {
  return HEX_DIRECTIONS.map((d) => ({
    q: hex.q + d.q,
    r: hex.r + d.r,
    s: hex.s + d.s,
  }));
}

// ===== Hex Set =====

const hexSet = new Set(HEX_POSITIONS.map(serializeHex));

export function isValidHex(hex: CubeCoord): boolean {
  return hexSet.has(serializeHex(hex));
}

export function allHexCoords(): readonly CubeCoord[] {
  return HEX_POSITIONS;
}

/**
 * Get all hex neighbors that are actually on the board.
 */
export function hexBoardNeighbors(hex: CubeCoord): CubeCoord[] {
  return hexNeighbors(hex).filter(isValidHex);
}

// ===== Vertex Canonicalization =====
//
// Each hex has 6 vertex positions. Using flat-top orientation:
//   Top (N) vertex and Bottom (S) vertex are the canonical positions for a hex.
//   The other 4 vertex positions are canonical vertices of neighboring hexes.
//
// Flat-top hex vertex positions (clockwise from top):
//   0: Top        -> canonical (this hex, N)
//   1: Top-Right  -> canonical (hex to NE, S) or (hex to E, N) — we pick one
//   2: Bot-Right  -> canonical (hex to SE, N) or (hex to E, S) — we pick one
//   3: Bottom     -> canonical (this hex, S)
//   4: Bot-Left   -> canonical (hex to SW, N) or (hex to W, S) — we pick one
//   5: Top-Left   -> canonical (hex to NW, S) or (hex to W, N) — we pick one
//
// For canonicalization: each vertex is shared by up to 3 hexes.
// We define the canonical vertex as the representation with the smallest
// (q, r, dir) tuple when sorted lexicographically.

/**
 * Returns the 6 vertex positions of a hex as non-canonical (local) references.
 * These need to be canonicalized for use as keys.
 */
function hexVertexPositionsRaw(hex: CubeCoord): VertexCoord[] {
  const { q, r, s } = hex;
  return [
    { q, r, s, dir: "N" as const },          // 0: Top
    { q: q + 1, r: r - 1, s, dir: "S" as const },  // 1: Top-Right
    { q: q + 1, r, s: s - 1, dir: "N" as const },   // 2: Bot-Right
    { q, r, s, dir: "S" as const },          // 3: Bottom
    { q: q - 1, r: r + 1, s, dir: "N" as const },   // 4: Bot-Left
    { q: q - 1, r, s: s + 1, dir: "S" as const },   // 5: Top-Left
  ];
}

/**
 * All possible representations of a vertex. A vertex at (hex, dir) is also
 * a vertex of adjacent hexes. We enumerate all equivalent representations
 * and pick the canonical one.
 */
function allRepresentationsOfVertex(v: VertexCoord): VertexCoord[] {
  const reps: VertexCoord[] = [v];
  const { q, r, s, dir } = v;

  if (dir === "N") {
    // The N vertex of (q,r,s) is also:
    // - The S vertex of (q, r-1, s+1)  [hex to NW]
    // - The S vertex of (q+1, r-1, s)  [hex to NE]... no wait.
    // Let me think about this carefully with flat-top hexes.
    //
    // In flat-top orientation, the N (top) vertex of hex (q,r,s) is shared with:
    //   - hex (q, r-1, s+1) as its vertex position 3 (S)
    //   - hex (q+1, r-1, s) as its vertex position 4 (Bot-Left) -> (q, r, s, N) is the canonical
    //     Actually, (q+1-1, r-1+1, s, N) = (q, r, s, N) which is the same
    //
    // For the N vertex of (q,r,s):
    // It touches hex (q, r-1, s+1) [NW neighbor] at its bottom-right position
    // And hex (q+1, r-1, s) [NE neighbor] at its bottom-left position
    reps.push({ q: q, r: r - 1, s: s + 1, dir: "S" as const });
    reps.push({ q: q + 1, r: r - 1, s: s, dir: "S" as const });
  } else {
    // The S vertex of (q,r,s) is shared with:
    //   - hex (q, r+1, s-1) [SE neighbor] at its top-left position
    //   - hex (q-1, r+1, s) [SW neighbor] at its top-right position
    reps.push({ q: q, r: r + 1, s: s - 1, dir: "N" as const });
    reps.push({ q: q - 1, r: r + 1, s: s, dir: "N" as const });
  }

  return reps;
}

function vertexCanonicalKey(v: VertexCoord): string {
  const reps = allRepresentationsOfVertex(v);
  // Pick the one with the smallest serialized string
  const keys = reps.map(serializeVertex);
  keys.sort();
  return keys[0];
}

// ===== Edge Canonicalization =====
//
// Each hex has 6 edges. We canonicalize to 3 per hex: NE, E, SE.
// The other 3 (SW, W, NW) are the NE, E, SE of adjacent hexes.
//
// For flat-top hex (q, r, s):
//   NE edge: connects vertex N to vertex Top-Right (NE neighbor's S)
//   E  edge: connects vertex Top-Right to vertex Bot-Right
//   SE edge: connects vertex Bot-Right to vertex S
//   SW edge: = NE edge of hex (q-1, r+1, s)
//   W  edge: = E edge of hex (q-1, r, s+1)
//   NW edge: = SE edge of hex (q, r-1, s+1)

function hexEdgePositionsRaw(hex: CubeCoord): EdgeCoord[] {
  const { q, r, s } = hex;
  return [
    { q, r, s, dir: "NE" as const },   // 0: NE edge
    { q, r, s, dir: "E" as const },    // 1: E edge
    { q, r, s, dir: "SE" as const },   // 2: SE edge
    // 3: SW edge = NE of (q-1, r+1, s)
    { q: q - 1, r: r + 1, s, dir: "NE" as const },
    // 4: W edge = E of (q-1, r, s+1)
    { q: q - 1, r, s: s + 1, dir: "E" as const },
    // 5: NW edge = SE of (q, r-1, s+1)
    { q, r: r - 1, s: s + 1, dir: "SE" as const },
  ];
}

// ===== Edge ↔ Vertex Relationships =====

/**
 * Returns the two vertices connected by an edge.
 */
export function edgeVertices(e: EdgeCoord): [VertexCoord, VertexCoord] {
  const { q, r, s, dir } = e;
  switch (dir) {
    case "NE":
      // Connects this hex's N vertex to NE neighbor's S vertex
      return [
        { q, r, s, dir: "N" },
        { q: q + 1, r: r - 1, s, dir: "S" },
      ];
    case "E":
      // Connects NE neighbor's S vertex to E neighbor's N vertex
      return [
        { q: q + 1, r: r - 1, s, dir: "S" },
        { q: q + 1, r, s: s - 1, dir: "N" },
      ];
    case "SE":
      // Connects E neighbor's N vertex to this hex's S vertex
      return [
        { q: q + 1, r, s: s - 1, dir: "N" },
        { q, r, s, dir: "S" },
      ];
  }
}

// ===== Precomputed Lookup Tables =====

let _allVertices: VertexCoord[] | null = null;
let _allEdges: EdgeCoord[] | null = null;
let _vertexToHexes: Map<string, CubeCoord[]> | null = null;
let _vertexToEdges: Map<string, EdgeCoord[]> | null = null;
let _vertexToVertices: Map<string, VertexCoord[]> | null = null;
let _hexToVertices: Map<string, VertexCoord[]> | null = null;
let _hexToEdges: Map<string, EdgeCoord[]> | null = null;
let _vertexToCanonical: Map<string, string> | null = null;

function buildLookups(): void {
  if (_allVertices) return; // already built

  const vertexSet = new Map<string, VertexCoord>();
  const edgeSet = new Map<string, EdgeCoord>();
  const vertexCanonMap = new Map<string, string>();
  const v2h = new Map<string, CubeCoord[]>();
  const v2e = new Map<string, EdgeCoord[]>();
  const v2v = new Map<string, VertexCoord[]>();
  const h2v = new Map<string, VertexCoord[]>();
  const h2e = new Map<string, EdgeCoord[]>();

  // Step 1: Enumerate all vertices and edges from all hexes
  for (const hex of HEX_POSITIONS) {
    const hKey = serializeHex(hex);
    const verts = hexVertexPositionsRaw(hex);
    const edges = hexEdgePositionsRaw(hex);

    const canonicalVerts: VertexCoord[] = [];
    const canonicalEdges: EdgeCoord[] = [];

    // Process vertices
    for (const v of verts) {
      const canonKey = vertexCanonicalKey(v);
      const vKey = serializeVertex(v);
      vertexCanonMap.set(vKey, canonKey);

      if (!vertexSet.has(canonKey)) {
        // Parse the canonical key back to a VertexCoord
        const parts = canonKey.split(",");
        const canonV: VertexCoord = {
          q: Number(parts[0]),
          r: Number(parts[1]),
          s: Number(parts[2]),
          dir: parts[3] as "N" | "S",
        };
        vertexSet.set(canonKey, canonV);
      }

      canonicalVerts.push(vertexSet.get(canonKey)!);

      // Vertex -> hex mapping
      if (!v2h.has(canonKey)) v2h.set(canonKey, []);
      const hexList = v2h.get(canonKey)!;
      if (!hexList.some((h) => serializeHex(h) === hKey)) {
        hexList.push(hex);
      }
    }

    h2v.set(hKey, [...new Map(canonicalVerts.map((v) => [serializeVertex(v), v])).values()]);

    // Process edges (only the 3 canonical edges belong to this hex)
    for (const e of edges) {
      const eKey = serializeEdge(e);

      if (!edgeSet.has(eKey)) {
        edgeSet.set(eKey, e);
      }
      canonicalEdges.push(e);
    }

    h2e.set(hKey, [...new Map(canonicalEdges.map((e) => [serializeEdge(e), e])).values()]);
  }

  _allVertices = [...vertexSet.values()];
  _allEdges = [...edgeSet.values()];
  _vertexToCanonical = vertexCanonMap;
  _vertexToHexes = v2h;
  _hexToVertices = h2v;
  _hexToEdges = h2e;

  // Step 2: Build vertex <-> edge relationships
  for (const edge of _allEdges) {
    const [v1, v2] = edgeVertices(edge);
    const v1canon = canonicalizeVertex(v1);
    const v2canon = canonicalizeVertex(v2);
    const v1key = serializeVertex(v1canon);
    const v2key = serializeVertex(v2canon);

    if (!v2e.has(v1key)) v2e.set(v1key, []);
    if (!v2e.has(v2key)) v2e.set(v2key, []);
    v2e.get(v1key)!.push(edge);
    v2e.get(v2key)!.push(edge);
  }

  _vertexToEdges = v2e;

  // Step 3: Build vertex <-> vertex adjacency (vertices connected by an edge)
  for (const vertex of _allVertices) {
    const vKey = serializeVertex(vertex);
    const adjEdges = v2e.get(vKey) ?? [];
    const adjVerts: VertexCoord[] = [];

    for (const edge of adjEdges) {
      const [v1, v2] = edgeVertices(edge);
      const v1canon = canonicalizeVertex(v1);
      const v2canon = canonicalizeVertex(v2);

      if (serializeVertex(v1canon) !== vKey) {
        adjVerts.push(v1canon);
      }
      if (serializeVertex(v2canon) !== vKey) {
        adjVerts.push(v2canon);
      }
    }

    // Deduplicate
    const unique = [...new Map(adjVerts.map((v) => [serializeVertex(v), v])).values()];
    v2v.set(vKey, unique);
  }

  _vertexToVertices = v2v;
}

// ===== Public API =====

export function canonicalizeVertex(v: VertexCoord): VertexCoord {
  buildLookups();
  const canonKey = _vertexToCanonical!.get(serializeVertex(v));
  if (canonKey) {
    const parts = canonKey.split(",");
    return {
      q: Number(parts[0]),
      r: Number(parts[1]),
      s: Number(parts[2]),
      dir: parts[3] as "N" | "S",
    };
  }
  // If vertex is not in any hex's vertex set, compute it directly
  const key = vertexCanonicalKey(v);
  const parts = key.split(",");
  return {
    q: Number(parts[0]),
    r: Number(parts[1]),
    s: Number(parts[2]),
    dir: parts[3] as "N" | "S",
  };
}

export function canonicalizeEdge(e: EdgeCoord): EdgeCoord {
  // Edges in NE/E/SE form are already canonical.
  // But we might receive an edge that references a hex not on the board.
  return e;
}

export function allVertexCoords(): readonly VertexCoord[] {
  buildLookups();
  return _allVertices!;
}

export function allEdgeCoords(): readonly EdgeCoord[] {
  buildLookups();
  return _allEdges!;
}

/**
 * Get the canonical vertices of a hex (6 vertices).
 */
export function hexVertices(hex: CubeCoord): VertexCoord[] {
  buildLookups();
  const hKey = serializeHex(hex);
  return _hexToVertices!.get(hKey) ?? [];
}

/**
 * Get the canonical edges of a hex (6 edges: 3 belonging to this hex + 3 from neighbors).
 */
export function hexEdges(hex: CubeCoord): EdgeCoord[] {
  buildLookups();
  const hKey = serializeHex(hex);
  return _hexToEdges!.get(hKey) ?? [];
}

/**
 * Get the hexes adjacent to a vertex (1-3 hexes).
 */
export function vertexAdjacentHexes(v: VertexCoord): CubeCoord[] {
  buildLookups();
  const canon = canonicalizeVertex(v);
  return _vertexToHexes!.get(serializeVertex(canon)) ?? [];
}

/**
 * Get the vertices adjacent to a vertex (connected by an edge; 2-3 vertices).
 */
export function vertexAdjacentVertices(v: VertexCoord): VertexCoord[] {
  buildLookups();
  const canon = canonicalizeVertex(v);
  return _vertexToVertices!.get(serializeVertex(canon)) ?? [];
}

/**
 * Get the edges adjacent to a vertex (2-3 edges).
 */
export function vertexAdjacentEdges(v: VertexCoord): EdgeCoord[] {
  buildLookups();
  const canon = canonicalizeVertex(v);
  return _vertexToEdges!.get(serializeVertex(canon)) ?? [];
}

/**
 * Get the two vertices connected by an edge (always exactly 2).
 * Returns canonical vertex coords.
 */
export function edgeAdjacentVertices(e: EdgeCoord): [VertexCoord, VertexCoord] {
  const [v1, v2] = edgeVertices(e);
  return [canonicalizeVertex(v1), canonicalizeVertex(v2)];
}

/**
 * Get edges that share a vertex with this edge (2-4 edges).
 */
export function edgeAdjacentEdges(e: EdgeCoord): EdgeCoord[] {
  const [v1, v2] = edgeAdjacentVertices(e);
  const eKey = serializeEdge(e);
  const result: EdgeCoord[] = [];

  for (const adjE of vertexAdjacentEdges(v1)) {
    if (serializeEdge(adjE) !== eKey) result.push(adjE);
  }
  for (const adjE of vertexAdjacentEdges(v2)) {
    if (serializeEdge(adjE) !== eKey) result.push(adjE);
  }

  // Deduplicate
  return [...new Map(result.map((e) => [serializeEdge(e), e])).values()];
}

// ===== Pixel Coordinate Conversion (flat-top hexes) =====

export function hexToPixel(hex: CubeCoord, size: number): { x: number; y: number } {
  const x = size * (3 / 2) * hex.q;
  const y = size * ((Math.sqrt(3) / 2) * hex.q + Math.sqrt(3) * hex.r);
  return { x, y };
}

export function vertexToPixel(v: VertexCoord, size: number): { x: number; y: number } {
  const canon = canonicalizeVertex(v);
  const hexCenter = hexToPixel({ q: canon.q, r: canon.r, s: canon.s }, size);
  const sqrt3_2 = Math.sqrt(3) / 2;

  if (canon.dir === "N") {
    // N vertex sits between NW and NE edges → 300° position (top-right of flat-top hex)
    return { x: hexCenter.x + size / 2, y: hexCenter.y - size * sqrt3_2 };
  } else {
    // S vertex sits between SE and SW edges → 120° position (bottom-left of flat-top hex)
    return { x: hexCenter.x - size / 2, y: hexCenter.y + size * sqrt3_2 };
  }
}

export function edgeToPixel(e: EdgeCoord, size: number): { x: number; y: number } {
  const [v1, v2] = edgeAdjacentVertices(e);
  const p1 = vertexToPixel(v1, size);
  const p2 = vertexToPixel(v2, size);
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

// ===== Port Vertex Resolution =====

/**
 * Resolve a port position to its two vertex coordinates.
 * Port edges are on the boundary of outer hexes.
 */
export function resolvePortVertices(
  hexQ: number,
  hexR: number,
  hexS: number,
  edge: "NE" | "E" | "SE" | "NW" | "W" | "SW"
): [VertexCoord, VertexCoord] {
  const hex: CubeCoord = { q: hexQ, r: hexR, s: hexS };
  const verts = hexVertexPositionsRaw(hex);
  // Map edge direction to vertex indices
  // Flat-top hex, vertices: 0=Top, 1=Top-Right, 2=Bot-Right, 3=Bottom, 4=Bot-Left, 5=Top-Left
  // Edges: NE(0-1), E(1-2), SE(2-3), SW(3-4), W(4-5), NW(5-0)
  const edgeVertexIndices: Record<string, [number, number]> = {
    NE: [0, 1],
    E: [1, 2],
    SE: [2, 3],
    SW: [3, 4],
    W: [4, 5],
    NW: [5, 0],
  };

  const [i1, i2] = edgeVertexIndices[edge];
  return [canonicalizeVertex(verts[i1]), canonicalizeVertex(verts[i2])];
}
