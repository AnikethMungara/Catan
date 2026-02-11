/**
 * Main trading panel: propose trades, view offers, bank trade.
 */

import { useState } from "react";
import type {
  ClientGameState,
  ResourceBundle,
  ResourceType,
} from "@catan/shared";
import { RESOURCE_TYPES, bundleTotal } from "@catan/shared";
import { RESOURCE_COLORS } from "../../utils/colors";
import BankTrade from "./BankTrade";

type Props = {
  gameState: ClientGameState;
  myPlayerId: string;
  isMyTurn: boolean;
  canTrade: boolean;
  onProposeTrade: (offering: ResourceBundle, requesting: ResourceBundle) => void;
  onRespondToTrade: (tradeId: string, accept: boolean) => void;
  onConfirmTrade: (tradeId: string, withPlayerId: string) => void;
  onCancelTrade: (tradeId: string) => void;
  onBankTrade: (giving: ResourceBundle, receiving: ResourceBundle) => void;
};

export default function TradePanel({
  gameState,
  myPlayerId,
  isMyTurn,
  canTrade,
  onProposeTrade,
  onRespondToTrade,
  onConfirmTrade,
  onCancelTrade,
  onBankTrade,
}: Props) {
  const [offering, setOffering] = useState<Record<ResourceType, number>>({
    wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0,
  });
  const [requesting, setRequesting] = useState<Record<ResourceType, number>>({
    wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0,
  });
  const [showBankTrade, setShowBankTrade] = useState(false);

  const openOffers = gameState.tradeOffers.filter(
    (o) => (o as { status: string }).status === "open"
  );

  const adjust = (
    which: "offer" | "request",
    type: ResourceType,
    delta: number
  ) => {
    if (which === "offer") {
      const newVal = Math.max(0, offering[type] + delta);
      setOffering({ ...offering, [type]: newVal });
    } else {
      const newVal = Math.max(0, requesting[type] + delta);
      setRequesting({ ...requesting, [type]: newVal });
    }
  };

  const canPropose =
    canTrade &&
    isMyTurn &&
    bundleTotal(offering as ResourceBundle) > 0 &&
    bundleTotal(requesting as ResourceBundle) > 0;

  return (
    <div className="trade-panel">
      <h3>Trade</h3>

      <div className="trade-tabs">
        <button
          className={`tab ${!showBankTrade ? "active" : ""}`}
          onClick={() => setShowBankTrade(false)}
        >
          Player Trade
        </button>
        <button
          className={`tab ${showBankTrade ? "active" : ""}`}
          onClick={() => setShowBankTrade(true)}
        >
          Bank Trade
        </button>
      </div>

      {showBankTrade ? (
        <BankTrade
          gameState={gameState}
          myPlayerId={myPlayerId}
          canTrade={canTrade && isMyTurn}
          onBankTrade={onBankTrade}
        />
      ) : (
        <>
          {/* Propose section */}
          {isMyTurn && canTrade && (
            <div className="trade-propose">
              <div className="trade-row">
                <h4>I Give:</h4>
                {RESOURCE_TYPES.map((type) => (
                  <div key={type} className="trade-resource">
                    <span style={{ color: RESOURCE_COLORS[type] }}>
                      {type}
                    </span>
                    <button onClick={() => adjust("offer", type, -1)}>-</button>
                    <span>{offering[type]}</span>
                    <button onClick={() => adjust("offer", type, 1)}>+</button>
                  </div>
                ))}
              </div>
              <div className="trade-row">
                <h4>I Want:</h4>
                {RESOURCE_TYPES.map((type) => (
                  <div key={type} className="trade-resource">
                    <span style={{ color: RESOURCE_COLORS[type] }}>
                      {type}
                    </span>
                    <button onClick={() => adjust("request", type, -1)}>
                      -
                    </button>
                    <span>{requesting[type]}</span>
                    <button onClick={() => adjust("request", type, 1)}>
                      +
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary"
                disabled={!canPropose}
                onClick={() => {
                  onProposeTrade(
                    offering as ResourceBundle,
                    requesting as ResourceBundle
                  );
                  setOffering({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
                  setRequesting({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });
                }}
              >
                Propose Trade
              </button>
            </div>
          )}

          {/* Open offers */}
          {openOffers.length > 0 && (
            <div className="trade-offers">
              <h4>Open Offers</h4>
              {openOffers.map((offer) => {
                const offerAny = offer as unknown as {
                  id: string;
                  fromPlayerId: string;
                  offering: ResourceBundle;
                  requesting: ResourceBundle;
                  responses: Record<string, string>;
                };
                const proposer = gameState.players.find(
                  (p) => p.id === offerAny.fromPlayerId
                );
                const isProposer = offerAny.fromPlayerId === myPlayerId;

                const responses = offerAny.responses instanceof Map
                  ? Object.fromEntries(offerAny.responses as Map<string, string>)
                  : offerAny.responses;

                const acceptedPlayers = Object.entries(responses)
                  .filter(([, v]) => v === "accepted")
                  .map(([k]) => k);

                return (
                  <div key={offerAny.id} className="trade-offer-card">
                    <div className="offer-header">
                      {proposer?.name} offers:
                    </div>
                    <div className="offer-details">
                      <span>
                        Gives:{" "}
                        {RESOURCE_TYPES.filter(
                          (r) => offerAny.offering[r] > 0
                        )
                          .map(
                            (r) => `${offerAny.offering[r]} ${r}`
                          )
                          .join(", ")}
                      </span>
                      <span>
                        Wants:{" "}
                        {RESOURCE_TYPES.filter(
                          (r) => offerAny.requesting[r] > 0
                        )
                          .map(
                            (r) => `${offerAny.requesting[r]} ${r}`
                          )
                          .join(", ")}
                      </span>
                    </div>
                    <div className="offer-actions">
                      {isProposer ? (
                        <>
                          {acceptedPlayers.map((pid) => {
                            const p = gameState.players.find(
                              (pl) => pl.id === pid
                            );
                            return (
                              <button
                                key={pid}
                                className="btn btn-small"
                                onClick={() =>
                                  onConfirmTrade(offerAny.id, pid)
                                }
                              >
                                Trade with {p?.name}
                              </button>
                            );
                          })}
                          <button
                            className="btn btn-small btn-danger"
                            onClick={() => onCancelTrade(offerAny.id)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-small btn-success"
                            onClick={() =>
                              onRespondToTrade(offerAny.id, true)
                            }
                          >
                            Accept
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            onClick={() =>
                              onRespondToTrade(offerAny.id, false)
                            }
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
