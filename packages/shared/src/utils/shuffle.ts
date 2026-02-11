import type { SeededRandom } from "./random.js";

/**
 * Fisher-Yates shuffle using a seeded RNG.
 * Returns a new array (does not mutate the input).
 */
export function shuffle<T>(arr: readonly T[], rng: SeededRandom): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
