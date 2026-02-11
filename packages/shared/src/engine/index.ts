export { createGameState, dispatch } from "./game-engine.js";
export { generateBoard } from "./board-generator.js";
export {
  allHexCoords,
  allVertexCoords,
  allEdgeCoords,
  hexVertices,
  hexEdges,
  hexNeighbors,
  hexBoardNeighbors,
  vertexAdjacentHexes,
  vertexAdjacentVertices,
  vertexAdjacentEdges,
  edgeAdjacentVertices,
  edgeAdjacentEdges,
  edgeVertices,
  canonicalizeVertex,
  canonicalizeEdge,
  hexToPixel,
  vertexToPixel,
  edgeToPixel,
  isValidHex,
  resolvePortVertices,
} from "./coordinate-system.js";
export { produceResources } from "./resource-producer.js";
export { calculateLongestRoad, updateLongestRoad } from "./road-calculator.js";
export { updateLargestArmy } from "./army-tracker.js";
export { calculateVP, checkVictory } from "./victory.js";
export type { VPBreakdown } from "./victory.js";
export { validateAction } from "./move-validator.js";
export type { ValidationResult } from "./move-validator.js";
export { getTradeRatio } from "./trade-validator.js";
export { generateSetupOrder } from "./setup-phase.js";
export { getPlayersToDiscard } from "./robber.js";
export { createDevCardDeck } from "./dev-cards.js";
export {
  updatePlayer,
  updateTurnState,
  updateBoard,
  getPlayer,
  getCurrentPlayer,
  addLogEntry,
} from "./state-helpers.js";
