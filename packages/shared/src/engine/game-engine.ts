/**
 * Main game engine: dispatch(state, action) => state
 * Routes actions to appropriate handlers based on game phase.
 * All actions are validated before dispatch.
 */

import type { PlayerAction } from "../types/actions.js";
import type { GameState } from "../types/game.js";
import type { Player } from "../types/player.js";
import type { PortType } from "../types/board.js";
import { InvalidActionError } from "../types/errors.js";
import { EMPTY_BUNDLE, RESOURCE_TYPES } from "../types/resources.js";
import { serializeVertex, serializeEdge } from "../types/coordinates.js";
import { BUILDING_COSTS, INITIAL_PIECES } from "../constants/costs.js";
import { BANK_RESOURCE_COUNT } from "../constants/board-layout.js";
import { SeededRandom } from "../utils/random.js";
import { validateAction } from "./move-validator.js";
import { handleSetupAction, generateSetupOrder } from "./setup-phase.js";
import { generateBoard } from "./board-generator.js";
import { createDevCardDeck } from "./dev-cards.js";
import { produceResources } from "./resource-producer.js";
import { getPlayersToDiscard, processDiscard, moveRobber, stealResource } from "./robber.js";
import { updateLongestRoad } from "./road-calculator.js";
import { checkVictory } from "./victory.js";
import {
  playKnight,
  playRoadBuilding,
  playYearOfPlenty,
  playMonopoly,
  buyDevCard,
} from "./dev-cards.js";
import {
  createTradeOffer,
  respondToTrade,
  confirmTrade,
  cancelTrade,
  executeBankTrade,
} from "./trade-validator.js";
import {
  updatePlayer,
  updateTurnState,
  placeBuilding,
  placeRoad,
  upgradeBuilding,
  addLogEntry,
  getPlayer,
  getCurrentPlayer,
  takePlayerResources,
  givePlayerResources,
} from "./state-helpers.js";
import {
  canonicalizeVertex,
} from "./coordinate-system.js";
import type { VertexCoord } from "../types/coordinates.js";
import { PLAYER_COLORS } from "../types/player.js";

/**
 * Create the initial game state.
 */
export function createGameState(
  gameId: string,
  playerInfos: { id: string; name: string }[],
  seed: number
): GameState {
  const rng = new SeededRandom(seed);

  // Generate board
  const board = generateBoard(rng.nextInt(0, 2147483647));

  // Create dev card deck
  const devCardDeck = createDevCardDeck(rng.nextInt(0, 2147483647));

  // Create players
  const players: Player[] = playerInfos.map((info, index) => ({
    id: info.id,
    name: info.name,
    color: PLAYER_COLORS[index],
    resources: { ...EMPTY_BUNDLE },
    devCards: [],
    knightsPlayed: 0,
    hasLongestRoad: false,
    hasLargestArmy: false,
    roadLength: 0,
    settlementsRemaining: INITIAL_PIECES.settlements,
    citiesRemaining: INITIAL_PIECES.cities,
    roadsRemaining: INITIAL_PIECES.roads,
    portsAccess: [],
    connected: true,
  }));

  const setupOrder = generateSetupOrder(players.length);

  const state: GameState = {
    gameId,
    board,
    players,
    turnState: {
      currentPlayerIndex: 0,
      phase: "SETUP",
      setupSubPhase: "PLACE_SETTLEMENT",
      setupRound: 0,
      setupOrder,
      setupStep: 0,
      turnNumber: 0,
      diceRoll: null,
      devCardPlayedThisTurn: false,
      devCardBoughtThisTurn: false,
      pendingDiscards: new Map(),
      roadBuildingRoadsLeft: 0,
      mustStealFrom: [],
    },
    devCardDeck,
    tradeOffers: [],
    winner: null,
    log: [],
    seed,
    bankResources: {
      wood: BANK_RESOURCE_COUNT,
      brick: BANK_RESOURCE_COUNT,
      sheep: BANK_RESOURCE_COUNT,
      wheat: BANK_RESOURCE_COUNT,
      ore: BANK_RESOURCE_COUNT,
    },
  };

  return addLogEntry(state, "GAME_START", "Game started!");
}

/**
 * Main dispatch function. Validates the action and applies it to the state.
 * Throws InvalidActionError if the action is illegal.
 */
export function dispatch(
  state: GameState,
  action: PlayerAction
): GameState {
  // Validate
  const validation = validateAction(state, action);
  if (!validation.valid) {
    throw new InvalidActionError(validation.reason ?? "Invalid action");
  }

  // Route to handler based on phase
  let newState: GameState;

  switch (state.turnState.phase) {
    case "SETUP":
      newState = handleSetupAction(state, action);
      break;
    case "MAIN":
      newState = handleMainAction(state, action);
      break;
    default:
      throw new InvalidActionError("Cannot dispatch actions in this phase");
  }

  // Check victory after every action in the main phase
  if (newState.turnState.phase === "MAIN") {
    newState = checkVictory(newState);
  }

  return newState;
}

// ===== Main Phase Action Handlers =====

function handleMainAction(
  state: GameState,
  action: PlayerAction
): GameState {
  switch (action.type) {
    case "ROLL_DICE":
      return handleRollDice(state, action);
    case "DISCARD_RESOURCES":
      return processDiscard(state, action.playerId, action.resources);
    case "MOVE_ROBBER":
      return moveRobber(state, action.hex, action.playerId);
    case "STEAL":
      return handleSteal(state, action);
    case "PLACE_SETTLEMENT":
      return handlePlaceSettlement(state, action);
    case "PLACE_ROAD":
      return handlePlaceRoad(state, action);
    case "PLACE_CITY":
      return handlePlaceCity(state, action);
    case "BUY_DEV_CARD":
      return buyDevCard(state, action.playerId);
    case "PLAY_KNIGHT":
      return handlePlayKnight(state, action);
    case "PLAY_ROAD_BUILDING":
      return playRoadBuilding(state, action.playerId);
    case "PLAY_YEAR_OF_PLENTY":
      return playYearOfPlenty(state, action.playerId, action.resources);
    case "PLAY_MONOPOLY":
      return playMonopoly(state, action.playerId, action.resource);
    case "PROPOSE_TRADE":
      return handleProposeTrade(state, action);
    case "RESPOND_TO_TRADE":
      return respondToTrade(state, action.playerId, action.tradeId, action.accept);
    case "CONFIRM_TRADE":
      return confirmTrade(state, action.tradeId, action.withPlayerId);
    case "CANCEL_TRADE":
      return cancelTrade(state, action.tradeId);
    case "BANK_TRADE":
      return executeBankTrade(state, action.playerId, action.giving, action.receiving);
    case "END_TURN":
      return handleEndTurn(state, action);
    default:
      throw new InvalidActionError("Unknown action type");
  }
}

function handleRollDice(
  state: GameState,
  _action: PlayerAction
): GameState {
  const rng = new SeededRandom(state.seed + state.turnState.turnNumber * 1000);
  const die1 = rng.nextInt(1, 6);
  const die2 = rng.nextInt(1, 6);
  const total = die1 + die2;

  const player = getCurrentPlayer(state);

  let result = updateTurnState(state, {
    diceRoll: [die1, die2] as const,
  });

  // Update seed to prevent predictable sequences
  result = { ...result, seed: rng.getState() };

  result = addLogEntry(
    result,
    "ROLL_DICE",
    `${player.name} rolled ${die1} + ${die2} = ${total}`
  );

  if (total === 7) {
    // Check for discards
    const discards = getPlayersToDiscard(result);

    if (discards.size > 0) {
      result = updateTurnState(result, {
        mainSubPhase: "DISCARD",
        pendingDiscards: discards,
      });
    } else {
      result = updateTurnState(result, {
        mainSubPhase: "MOVE_ROBBER",
      });
    }
  } else {
    // Produce resources
    const gains = produceResources(result, total);

    for (const [playerId, bundle] of gains) {
      const totalGained = RESOURCE_TYPES.reduce((sum, r) => sum + bundle[r], 0);
      if (totalGained > 0) {
        result = givePlayerResources(result, playerId, bundle);
        const resList = RESOURCE_TYPES.filter((r) => bundle[r] > 0)
          .map((r) => `${bundle[r]} ${r}`)
          .join(", ");
        const p = getPlayer(result, playerId);
        result = addLogEntry(
          result,
          "PRODUCE",
          `${p.name} receives ${resList}`
        );
      }
    }

    result = updateTurnState(result, {
      mainSubPhase: "TRADE_BUILD_PLAY",
    });
  }

  return result;
}

function handleSteal(
  state: GameState,
  action: PlayerAction & { type: "STEAL" }
): GameState {
  const rng = new SeededRandom(state.seed + state.turnState.turnNumber * 777);
  let result = stealResource(state, action.playerId, action.targetPlayerId, rng.getState());
  result = { ...result, seed: rng.getState() };
  return result;
}

function handlePlaceSettlement(
  state: GameState,
  action: PlayerAction & { type: "PLACE_SETTLEMENT" }
): GameState {
  const vertex = canonicalizeVertex(action.vertex);
  const vKey = serializeVertex(vertex);
  const player = getPlayer(state, action.playerId);

  // Pay cost
  let result = takePlayerResources(state, action.playerId, BUILDING_COSTS.settlement);

  // Place building
  result = placeBuilding(result, vKey, {
    type: "settlement",
    playerId: action.playerId,
  });

  // Update piece count
  result = updatePlayer(result, action.playerId, {
    settlementsRemaining: player.settlementsRemaining - 1,
  });

  // Update port access
  result = updatePortAccessForVertex(result, action.playerId, vertex);

  result = addLogEntry(
    result,
    "BUILD_SETTLEMENT",
    `${player.name} built a settlement`
  );

  // Recalculate longest road for ALL players (settlement might break someone's road)
  result = updateLongestRoad(result);

  return result;
}

function handlePlaceRoad(
  state: GameState,
  action: PlayerAction & { type: "PLACE_ROAD" }
): GameState {
  const eKey = serializeEdge(action.edge);
  const player = getPlayer(state, action.playerId);

  let result = state;

  // Pay cost (unless free from Road Building)
  const isFree = state.turnState.roadBuildingRoadsLeft > 0;
  if (!isFree) {
    result = takePlayerResources(result, action.playerId, BUILDING_COSTS.road);
  }

  // Place road
  result = placeRoad(result, eKey, { playerId: action.playerId });

  // Update piece count
  result = updatePlayer(result, action.playerId, {
    roadsRemaining: player.roadsRemaining - 1,
  });

  result = addLogEntry(
    result,
    "BUILD_ROAD",
    `${player.name} built a road`
  );

  // If Road Building, decrement counter
  if (isFree) {
    const remaining = state.turnState.roadBuildingRoadsLeft - 1;
    result = updateTurnState(result, {
      roadBuildingRoadsLeft: remaining,
    });
  }

  // Update longest road
  result = updateLongestRoad(result);

  return result;
}

function handlePlaceCity(
  state: GameState,
  action: PlayerAction & { type: "PLACE_CITY" }
): GameState {
  const vertex = canonicalizeVertex(action.vertex);
  const vKey = serializeVertex(vertex);
  const player = getPlayer(state, action.playerId);

  // Pay cost
  let result = takePlayerResources(state, action.playerId, BUILDING_COSTS.city);

  // Upgrade building
  result = upgradeBuilding(result, vKey, "city");

  // Update piece counts: city goes down, settlement comes back
  result = updatePlayer(result, action.playerId, {
    citiesRemaining: player.citiesRemaining - 1,
    settlementsRemaining: player.settlementsRemaining + 1,
  });

  result = addLogEntry(
    result,
    "BUILD_CITY",
    `${player.name} upgraded to a city`
  );

  return result;
}

function handlePlayKnight(
  state: GameState,
  action: PlayerAction & { type: "PLAY_KNIGHT" }
): GameState {
  // Play the knight (removes card, increments counter, checks largest army)
  let result = playKnight(state, action.playerId);

  // Move robber
  result = moveRobber(result, action.robberHex, action.playerId);

  // If we're in ROLL_DICE phase (playing knight before rolling),
  // check if we need to handle the steal step or go back to rolling
  if (
    state.turnState.mainSubPhase === "ROLL_DICE" &&
    result.turnState.mainSubPhase === "TRADE_BUILD_PLAY"
  ) {
    // Stealing was resolved (no targets or auto-steal),
    // go back to rolling
    result = updateTurnState(result, { mainSubPhase: "ROLL_DICE" });
  } else if (
    state.turnState.mainSubPhase === "ROLL_DICE" &&
    result.turnState.mainSubPhase === "STEAL"
  ) {
    // Need to steal — but we're before the dice roll.
    // We'll stay in STEAL and after steal resolves,
    // we need to go back to ROLL_DICE. We handle this in the
    // steal resolution by checking if diceRoll is null.
  }

  return result;
}

function handleProposeTrade(
  state: GameState,
  action: PlayerAction & { type: "PROPOSE_TRADE" }
): GameState {
  // Generate a unique trade ID
  const tradeId = `trade_${state.turnState.turnNumber}_${state.tradeOffers.length}`;
  return createTradeOffer(
    state,
    action.playerId,
    action.offering,
    action.requesting,
    tradeId
  );
}

function handleEndTurn(
  state: GameState,
  _action: PlayerAction
): GameState {
  const currentPlayer = getCurrentPlayer(state);

  // Cancel any open trade offers
  let result = state;
  for (const offer of result.tradeOffers) {
    if (offer.status === "open" && offer.fromPlayerId === currentPlayer.id) {
      result = cancelTrade(result, offer.id);
    }
  }

  // Advance to next player
  const nextPlayerIndex =
    (state.turnState.currentPlayerIndex + 1) % state.players.length;

  result = updateTurnState(result, {
    currentPlayerIndex: nextPlayerIndex,
    mainSubPhase: "ROLL_DICE",
    turnNumber: state.turnState.turnNumber + 1,
    diceRoll: null,
    devCardPlayedThisTurn: false,
    devCardBoughtThisTurn: false,
    roadBuildingRoadsLeft: 0,
    mustStealFrom: [],
  });

  const nextPlayer = result.players[nextPlayerIndex];
  result = addLogEntry(
    result,
    "END_TURN",
    `${nextPlayer.name}'s turn`
  );

  return result;
}

/**
 * Check if a newly placed building grants port access.
 */
function updatePortAccessForVertex(
  state: GameState,
  playerId: string,
  vertex: VertexCoord
): GameState {
  const vKey = serializeVertex(vertex);
  const player = getPlayer(state, playerId);
  const newPorts: PortType[] = [...player.portsAccess];

  for (const port of state.board.ports) {
    const portV1Key = serializeVertex(port.vertices[0]);
    const portV2Key = serializeVertex(port.vertices[1]);

    if (vKey === portV1Key || vKey === portV2Key) {
      if (!newPorts.includes(port.type)) {
        newPorts.push(port.type);
      }
    }
  }

  if (newPorts.length !== player.portsAccess.length) {
    return updatePlayer(state, playerId, { portsAccess: newPorts });
  }

  return state;
}
