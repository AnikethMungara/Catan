/**
 * SVG pattern definitions for terrain textures.
 */

import { TERRAIN_COLORS, TERRAIN_SECONDARY_COLORS } from "../../utils/colors";

export default function SvgDefs() {
  return (
    <defs>
      {/* Forest pattern - tree shapes */}
      <pattern id="pat-forest" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill={TERRAIN_COLORS.forest} />
        <polygon points="10,2 6,10 14,10" fill={TERRAIN_SECONDARY_COLORS.forest} />
        <rect x="9" y="10" width="2" height="4" fill="#5D4037" />
        <polygon points="2,8 0,14 4,14" fill={TERRAIN_SECONDARY_COLORS.forest} opacity="0.5" />
        <polygon points="18,6 16,12 20,12" fill={TERRAIN_SECONDARY_COLORS.forest} opacity="0.5" />
      </pattern>

      {/* Pasture pattern - grass tufts */}
      <pattern id="pat-pasture" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill={TERRAIN_COLORS.pasture} />
        <circle cx="4" cy="4" r="1.5" fill={TERRAIN_SECONDARY_COLORS.pasture} />
        <circle cx="12" cy="8" r="1.5" fill={TERRAIN_SECONDARY_COLORS.pasture} />
        <circle cx="8" cy="14" r="1.5" fill={TERRAIN_SECONDARY_COLORS.pasture} />
        <path d="M2,10 Q4,6 6,10" stroke="#48BB78" fill="none" strokeWidth="0.5" />
        <path d="M10,2 Q12,0 14,2" stroke="#48BB78" fill="none" strokeWidth="0.5" />
      </pattern>

      {/* Fields pattern - wheat stalks */}
      <pattern id="pat-fields" width="12" height="16" patternUnits="userSpaceOnUse">
        <rect width="12" height="16" fill={TERRAIN_COLORS.fields} />
        <line x1="3" y1="16" x2="3" y2="4" stroke={TERRAIN_SECONDARY_COLORS.fields} strokeWidth="1" />
        <ellipse cx="3" cy="3" rx="2" ry="3" fill={TERRAIN_SECONDARY_COLORS.fields} opacity="0.7" />
        <line x1="9" y1="16" x2="9" y2="6" stroke={TERRAIN_SECONDARY_COLORS.fields} strokeWidth="1" />
        <ellipse cx="9" cy="5" rx="2" ry="3" fill={TERRAIN_SECONDARY_COLORS.fields} opacity="0.7" />
      </pattern>

      {/* Hills pattern - brick/clay texture */}
      <pattern id="pat-hills" width="20" height="12" patternUnits="userSpaceOnUse">
        <rect width="20" height="12" fill={TERRAIN_COLORS.hills} />
        <rect x="0" y="0" width="9" height="5" rx="1" fill={TERRAIN_SECONDARY_COLORS.hills} stroke="#7B341E" strokeWidth="0.5" />
        <rect x="11" y="0" width="9" height="5" rx="1" fill={TERRAIN_SECONDARY_COLORS.hills} stroke="#7B341E" strokeWidth="0.5" />
        <rect x="5" y="6" width="9" height="5" rx="1" fill={TERRAIN_SECONDARY_COLORS.hills} stroke="#7B341E" strokeWidth="0.5" />
        <rect x="-4" y="6" width="9" height="5" rx="1" fill={TERRAIN_SECONDARY_COLORS.hills} stroke="#7B341E" strokeWidth="0.5" />
        <rect x="15" y="6" width="9" height="5" rx="1" fill={TERRAIN_SECONDARY_COLORS.hills} stroke="#7B341E" strokeWidth="0.5" />
      </pattern>

      {/* Mountains pattern - rocky peaks */}
      <pattern id="pat-mountains" width="24" height="20" patternUnits="userSpaceOnUse">
        <rect width="24" height="20" fill={TERRAIN_COLORS.mountains} />
        <polygon points="12,2 4,18 20,18" fill={TERRAIN_SECONDARY_COLORS.mountains} />
        <polygon points="12,2 8,10 16,10" fill="#A0AEC0" />
        <polygon points="0,8 -4,20 4,20" fill={TERRAIN_SECONDARY_COLORS.mountains} opacity="0.5" />
        <polygon points="24,8 20,20 28,20" fill={TERRAIN_SECONDARY_COLORS.mountains} opacity="0.5" />
      </pattern>

      {/* Desert pattern - sand dots */}
      <pattern id="pat-desert" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill={TERRAIN_COLORS.desert} />
        <circle cx="2" cy="2" r="0.8" fill={TERRAIN_SECONDARY_COLORS.desert} />
        <circle cx="7" cy="5" r="0.8" fill={TERRAIN_SECONDARY_COLORS.desert} />
        <circle cx="4" cy="8" r="0.8" fill={TERRAIN_SECONDARY_COLORS.desert} />
      </pattern>

      {/* Settlement shape */}
      <symbol id="settlement" viewBox="0 0 20 20">
        <polygon points="10,2 2,10 2,18 18,18 18,10" stroke="#000" strokeWidth="1" />
      </symbol>

      {/* City shape */}
      <symbol id="city" viewBox="0 0 24 24">
        <polygon points="4,8 4,22 20,22 20,8 16,8 16,2 8,2 8,8" stroke="#000" strokeWidth="1" />
        <rect x="9" y="12" width="3" height="4" fill="rgba(0,0,0,0.3)" />
        <rect x="14" y="12" width="2" height="2" fill="rgba(0,0,0,0.3)" />
      </symbol>

      {/* Robber shape */}
      <symbol id="robber" viewBox="0 0 20 30">
        <ellipse cx="10" cy="6" rx="5" ry="5" fill="#1A1A2E" />
        <ellipse cx="10" cy="20" rx="7" ry="10" fill="#1A1A2E" />
      </symbol>

      {/* Glow filter for interactive elements */}
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}
