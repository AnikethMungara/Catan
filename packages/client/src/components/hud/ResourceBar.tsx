/**
 * Displays the player's resource cards.
 */

import type { ResourceType, ResourceBundle } from "@catan/shared";
import { RESOURCE_TYPES } from "@catan/shared";
import { RESOURCE_COLORS } from "../../utils/colors";

const RESOURCE_ICONS: Record<ResourceType, string> = {
  wood: "🌲",
  brick: "🧱",
  sheep: "🐑",
  wheat: "🌾",
  ore: "⛰️",
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  wood: "Wood",
  brick: "Brick",
  sheep: "Sheep",
  wheat: "Wheat",
  ore: "Ore",
};

type Props = {
  resources: ResourceBundle;
};

export default function ResourceBar({ resources }: Props) {
  return (
    <div className="resource-bar">
      {RESOURCE_TYPES.map((type) => (
        <div
          key={type}
          className="resource-card"
          style={{ borderColor: RESOURCE_COLORS[type] }}
        >
          <span className="resource-icon">{RESOURCE_ICONS[type]}</span>
          <span className="resource-count">{resources[type]}</span>
          <span className="resource-label">{RESOURCE_LABELS[type]}</span>
        </div>
      ))}
    </div>
  );
}
