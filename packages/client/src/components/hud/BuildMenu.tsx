/**
 * Build action buttons with costs.
 */

import type { ResourceBundle } from "@catan/shared";
import { hasResources, BUILDING_COSTS } from "@catan/shared";
import type { PlacementMode } from "../../hooks/useBoard";

type Props = {
  resources: ResourceBundle;
  settlementsRemaining: number;
  citiesRemaining: number;
  roadsRemaining: number;
  devCardDeckCount: number;
  canBuild: boolean; // is it the build phase?
  onStartPlacement: (mode: PlacementMode) => void;
  onBuyDevCard: () => void;
};

const BUILD_OPTIONS: {
  label: string;
  mode: PlacementMode | "devcard";
  cost: ResourceBundle;
  pieceProp: "roadsRemaining" | "settlementsRemaining" | "citiesRemaining" | null;
}[] = [
  {
    label: "Road",
    mode: "road",
    cost: BUILDING_COSTS.road,
    pieceProp: "roadsRemaining",
  },
  {
    label: "Settlement",
    mode: "settlement",
    cost: BUILDING_COSTS.settlement,
    pieceProp: "settlementsRemaining",
  },
  {
    label: "City",
    mode: "city",
    cost: BUILDING_COSTS.city,
    pieceProp: "citiesRemaining",
  },
  {
    label: "Dev Card",
    mode: "devcard",
    cost: BUILDING_COSTS.devCard,
    pieceProp: null,
  },
];

export default function BuildMenu({
  resources,
  settlementsRemaining,
  citiesRemaining,
  roadsRemaining,
  devCardDeckCount,
  canBuild,
  onStartPlacement,
  onBuyDevCard,
}: Props) {
  const pieces = { roadsRemaining, settlementsRemaining, citiesRemaining };

  return (
    <div className="build-menu">
      <h3>Build</h3>
      <div className="build-buttons">
        {BUILD_OPTIONS.map((opt) => {
          const canAfford = hasResources(resources, opt.cost);
          const hasPieces =
            opt.pieceProp === null
              ? devCardDeckCount > 0
              : pieces[opt.pieceProp] > 0;
          const enabled = canBuild && canAfford && hasPieces;

          return (
            <button
              key={opt.label}
              className={`build-btn ${enabled ? "" : "disabled"}`}
              disabled={!enabled}
              onClick={() => {
                if (opt.mode === "devcard") {
                  onBuyDevCard();
                } else {
                  onStartPlacement(opt.mode);
                }
              }}
            >
              <span className="build-label">{opt.label}</span>
              {opt.pieceProp && (
                <span className="build-pieces">
                  ({pieces[opt.pieceProp]} left)
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
