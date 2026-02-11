import type { PlayerColor, TerrainType, ResourceType, PortType } from "@catan/shared";

export const PLAYER_COLOR_MAP: Record<PlayerColor, string> = {
  red: "#E53E3E",
  blue: "#3182CE",
  white: "#E2E8F0",
  orange: "#ED8936",
};

export const PLAYER_COLOR_DARK: Record<PlayerColor, string> = {
  red: "#C53030",
  blue: "#2B6CB0",
  white: "#A0AEC0",
  orange: "#DD6B20",
};

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  forest: "#2D7D46",
  pasture: "#68D391",
  fields: "#ECC94B",
  hills: "#C05621",
  mountains: "#718096",
  desert: "#F6E05E",
};

export const TERRAIN_SECONDARY_COLORS: Record<TerrainType, string> = {
  forest: "#1A5C2E",
  pasture: "#48BB78",
  fields: "#D69E2E",
  hills: "#9C4221",
  mountains: "#4A5568",
  desert: "#ECC94B",
};

export const RESOURCE_COLORS: Record<ResourceType, string> = {
  wood: "#2D7D46",
  brick: "#C05621",
  sheep: "#68D391",
  wheat: "#ECC94B",
  ore: "#718096",
};

export const PORT_LABEL: Record<PortType, string> = {
  generic: "3:1",
  wood: "2:1 W",
  brick: "2:1 B",
  sheep: "2:1 S",
  wheat: "2:1 Wh",
  ore: "2:1 O",
};

export const NUMBER_TOKEN_COLORS: Record<number, string> = {
  6: "#E53E3E",
  8: "#E53E3E",
};

export const OCEAN_COLOR = "#2B6CB0";
export const BOARD_BG = "#1A365D";
