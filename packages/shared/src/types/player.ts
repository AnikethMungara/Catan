import type { ResourceBundle } from "./resources.js";
import type { DevCard } from "./cards.js";
import type { PortType } from "./board.js";

export type PlayerColor = "red" | "blue" | "white" | "orange";

export const PLAYER_COLORS: readonly PlayerColor[] = [
  "red",
  "blue",
  "white",
  "orange",
] as const;

export type Player = {
  readonly id: string;
  readonly name: string;
  readonly color: PlayerColor;
  readonly resources: ResourceBundle;
  readonly devCards: readonly DevCard[];
  readonly knightsPlayed: number;
  readonly hasLongestRoad: boolean;
  readonly hasLargestArmy: boolean;
  readonly roadLength: number;
  readonly settlementsRemaining: number; // starts at 5
  readonly citiesRemaining: number; // starts at 4
  readonly roadsRemaining: number; // starts at 15
  readonly portsAccess: readonly PortType[];
  readonly connected: boolean;
};

export type PlayerPublicInfo = {
  readonly id: string;
  readonly name: string;
  readonly color: PlayerColor;
  readonly resourceCount: number;
  readonly devCardCount: number;
  readonly knightsPlayed: number;
  readonly hasLongestRoad: boolean;
  readonly hasLargestArmy: boolean;
  readonly roadLength: number;
  readonly publicVP: number;
  readonly connected: boolean;
};
