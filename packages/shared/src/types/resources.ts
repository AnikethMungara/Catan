export type ResourceType = "wood" | "brick" | "sheep" | "wheat" | "ore";

export const RESOURCE_TYPES: readonly ResourceType[] = [
  "wood",
  "brick",
  "sheep",
  "wheat",
  "ore",
] as const;

export type ResourceBundle = {
  readonly [K in ResourceType]: number;
};

export const EMPTY_BUNDLE: ResourceBundle = {
  wood: 0,
  brick: 0,
  sheep: 0,
  wheat: 0,
  ore: 0,
};

export function addBundles(a: ResourceBundle, b: ResourceBundle): ResourceBundle {
  return {
    wood: a.wood + b.wood,
    brick: a.brick + b.brick,
    sheep: a.sheep + b.sheep,
    wheat: a.wheat + b.wheat,
    ore: a.ore + b.ore,
  };
}

export function subtractBundles(a: ResourceBundle, b: ResourceBundle): ResourceBundle {
  return {
    wood: a.wood - b.wood,
    brick: a.brick - b.brick,
    sheep: a.sheep - b.sheep,
    wheat: a.wheat - b.wheat,
    ore: a.ore - b.ore,
  };
}

export function hasResources(have: ResourceBundle, need: ResourceBundle): boolean {
  return RESOURCE_TYPES.every((r) => have[r] >= need[r]);
}

export function bundleTotal(b: ResourceBundle): number {
  return RESOURCE_TYPES.reduce((sum, r) => sum + b[r], 0);
}

export function bundleFromPartial(partial: Partial<ResourceBundle>): ResourceBundle {
  return {
    wood: partial.wood ?? 0,
    brick: partial.brick ?? 0,
    sheep: partial.sheep ?? 0,
    wheat: partial.wheat ?? 0,
    ore: partial.ore ?? 0,
  };
}
