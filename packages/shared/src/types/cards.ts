export type DevCardType =
  | "knight"
  | "victoryPoint"
  | "roadBuilding"
  | "yearOfPlenty"
  | "monopoly";

export type DevCard = {
  readonly type: DevCardType;
  readonly turnAcquired: number; // turn number when bought
};

export const DEV_CARD_DISTRIBUTION: Record<DevCardType, number> = {
  knight: 14,
  victoryPoint: 5,
  roadBuilding: 2,
  yearOfPlenty: 2,
  monopoly: 2,
};

export const DEV_CARD_TOTAL = 25;
