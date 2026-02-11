/**
 * Dialog for discarding resources when a 7 is rolled.
 */

import { useState } from "react";
import type { ResourceBundle, ResourceType } from "@catan/shared";
import { RESOURCE_TYPES } from "@catan/shared";
import { RESOURCE_COLORS } from "../../utils/colors";

type Props = {
  currentResources: ResourceBundle;
  discardCount: number;
  onDiscard: (resources: ResourceBundle) => void;
};

export default function DiscardDialog({
  currentResources,
  discardCount,
  onDiscard,
}: Props) {
  const [selected, setSelected] = useState<Record<ResourceType, number>>({
    wood: 0,
    brick: 0,
    sheep: 0,
    wheat: 0,
    ore: 0,
  });

  const totalSelected = Object.values(selected).reduce((a, b) => a + b, 0);
  const canSubmit = totalSelected === discardCount;

  const adjust = (type: ResourceType, delta: number) => {
    const newVal = selected[type] + delta;
    if (newVal < 0 || newVal > currentResources[type]) return;
    if (totalSelected + delta > discardCount && delta > 0) return;
    setSelected({ ...selected, [type]: newVal });
  };

  return (
    <div className="modal-overlay">
      <div className="modal discard-dialog">
        <h2>Discard Resources</h2>
        <p>
          You have too many cards! Discard {discardCount} cards.
        </p>
        <div className="discard-resources">
          {RESOURCE_TYPES.map((type) => (
            <div key={type} className="discard-row">
              <span
                className="resource-name"
                style={{ color: RESOURCE_COLORS[type] }}
              >
                {type} ({currentResources[type]})
              </span>
              <button
                className="btn-small"
                onClick={() => adjust(type, -1)}
                disabled={selected[type] <= 0}
              >
                -
              </button>
              <span className="discard-count">{selected[type]}</span>
              <button
                className="btn-small"
                onClick={() => adjust(type, 1)}
                disabled={
                  selected[type] >= currentResources[type] ||
                  totalSelected >= discardCount
                }
              >
                +
              </button>
            </div>
          ))}
        </div>
        <p className="discard-status">
          Selected: {totalSelected} / {discardCount}
        </p>
        <button
          className="btn btn-primary"
          disabled={!canSubmit}
          onClick={() =>
            onDiscard(selected as ResourceBundle)
          }
        >
          Discard
        </button>
      </div>
    </div>
  );
}
