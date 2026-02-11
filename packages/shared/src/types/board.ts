import type { CubeCoord, VertexCoord } from "./coordinates.js";
import type { ResourceType } from "./resources.js";

export type TerrainType =
  | "forest"
  | "pasture"
  | "fields"
  | "hills"
  | "mountains"
  | "desert";

export const TERRAIN_RESOURCE: Record<
  Exclude<TerrainType, "desert">,
  ResourceType
> = {
  forest: "wood",
  pasture: "sheep",
  fields: "wheat",
  hills: "brick",
  mountains: "ore",
};

export type HexTile = {
  readonly coord: CubeCoord;
  readonly terrain: TerrainType;
  readonly numberToken: number | null; // null for desert
};

export type PortType = "generic" | ResourceType;

export type Port = {
  readonly vertices: readonly [VertexCoord, VertexCoord];
  readonly type: PortType;
  readonly ratio: number; // 3 for generic, 2 for specific
};

export type BuildingType = "settlement" | "city";

export type Building = {
  readonly type: BuildingType;
  readonly playerId: string;
};

export type Road = {
  readonly playerId: string;
};

export type Board = {
  readonly hexes: ReadonlyMap<string, HexTile>; // key = serialized CubeCoord
  readonly buildings: ReadonlyMap<string, Building>; // key = serialized VertexCoord
  readonly roads: ReadonlyMap<string, Road>; // key = serialized EdgeCoord
  readonly ports: readonly Port[];
  readonly robberHex: CubeCoord;
};
