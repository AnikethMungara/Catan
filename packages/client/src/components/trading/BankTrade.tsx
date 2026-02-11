/**
 * Bank/port trade interface.
 */

import { useState } from "react";
import type {
  ClientGameState,
  PortType,
  ResourceBundle,
  ResourceType,
} from "@catan/shared";
import { RESOURCE_TYPES } from "@catan/shared";

type Props = {
  gameState: ClientGameState;
  myPlayerId: string;
  canTrade: boolean;
  onBankTrade: (giving: ResourceBundle, receiving: ResourceBundle) => void;
};

export default function BankTrade({
  gameState,
  myPlayerId,
  canTrade,
  onBankTrade,
}: Props) {
  const [givingType, setGivingType] = useState<ResourceType>("wood");
  const [receivingType, setReceivingType] = useState<ResourceType>("brick");

  // Get port access from the self player view
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const portsAccess: readonly PortType[] =
    myPlayer?.viewType === "self" && "portsAccess" in myPlayer
      ? (myPlayer as { portsAccess: readonly PortType[] }).portsAccess
      : [];

  const getRate = (resource: ResourceType): number => {
    // Check for 2:1 specific port
    if (portsAccess.includes(resource as PortType)) return 2;
    // Check for 3:1 generic port
    if (portsAccess.includes("generic")) return 3;
    // Default 4:1
    return 4;
  };

  const rate = getRate(givingType);

  const execute = () => {
    const giving: ResourceBundle = {
      wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0,
      [givingType]: rate,
    } as ResourceBundle;
    const receiving: ResourceBundle = {
      wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0,
      [receivingType]: 1,
    } as ResourceBundle;
    onBankTrade(giving, receiving);
  };

  return (
    <div className="bank-trade">
      <div className="bank-trade-row">
        <label>Give {rate}x:</label>
        <select
          value={givingType}
          onChange={(e) => setGivingType(e.target.value as ResourceType)}
        >
          {RESOURCE_TYPES.map((r) => (
            <option key={r} value={r}>
              {r} ({getRate(r)}:1)
            </option>
          ))}
        </select>
      </div>
      <div className="bank-trade-row">
        <label>Receive 1x:</label>
        <select
          value={receivingType}
          onChange={(e) => setReceivingType(e.target.value as ResourceType)}
        >
          {RESOURCE_TYPES.filter((r) => r !== givingType).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <button
        className="btn btn-primary"
        disabled={!canTrade || givingType === receivingType}
        onClick={execute}
      >
        Trade with Bank ({rate}:1)
      </button>
    </div>
  );
}
