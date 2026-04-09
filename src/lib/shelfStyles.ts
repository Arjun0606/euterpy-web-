import type { CSSProperties } from "react";

/**
 * Shelf style tokens — the four physical metaphors a user can pick
 * for how their record collection is presented. Each style describes
 * a back-frame (the wall behind the records), a ledge (the front lip
 * the records sit on), and a soft floor shadow.
 *
 * These styles were originally inlined inside `RecordShelf.tsx`. Now
 * they live here so the list page can use the same chrome — every
 * curated list a user makes feels like another shelf in their store.
 * The user picks the metaphor once in Settings → Appearance and it
 * follows them across the profile collection AND every list they
 * publish.
 *
 * The styles are intentionally heavy on inline CSS rather than
 * Tailwind classes because they rely on layered gradients,
 * inset shadows, and backdrop filters that don't have clean
 * Tailwind equivalents. Treating them as design tokens (one source
 * of truth) keeps them consistent everywhere they appear.
 */

export type ShelfStyle = "minimal" | "wood" | "ornate" | "glass";

export interface ShelfStyleConfig {
  /** Wraps the entire row of records — the back wall + side walls. */
  frame: CSSProperties;
  /** The front lip below the records (the part you actually see). */
  ledge: CSSProperties;
  /** Soft shadow falling on the floor below the ledge. */
  shadow: CSSProperties;
  /** Padding inside the frame (space between back wall and records). */
  innerPadding: string;
}

export const SHELF_STYLES: Record<ShelfStyle, ShelfStyleConfig> = {
  // Minimal — no frame, just a thin black line. The default.
  minimal: {
    frame: {},
    ledge: {
      background: "linear-gradient(to bottom, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(255,255,255,0.04) inset",
      height: "4px",
      borderRadius: "1px",
    },
    shadow: {
      background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)",
      height: "12px",
    },
    innerPadding: "0",
  },

  // Wood — full record store shelf with chunky front lip and warm grain.
  wood: {
    frame: {
      backgroundImage: `
        repeating-linear-gradient(180deg,
          rgba(0,0,0,0.0) 0px,
          rgba(0,0,0,0.18) 1px,
          rgba(255,200,140,0.06) 2px,
          rgba(0,0,0,0.0) 5px
        ),
        linear-gradient(135deg,
          #4a2810 0%,
          #6b3f1a 25%,
          #4a2810 50%,
          #6b3f1a 75%,
          #4a2810 100%
        )
      `,
      borderLeft: "6px solid #3a1f0a",
      borderRight: "6px solid #3a1f0a",
      borderTop: "4px solid #2a1505",
      boxShadow: `
        inset 0 4px 16px rgba(0,0,0,0.6),
        inset 0 -2px 8px rgba(0,0,0,0.4),
        inset 8px 0 16px rgba(0,0,0,0.4),
        inset -8px 0 16px rgba(0,0,0,0.4)
      `,
      borderRadius: "4px 4px 0 0",
      paddingTop: "20px",
    },
    ledge: {
      backgroundImage: `
        repeating-linear-gradient(180deg,
          rgba(0,0,0,0.0) 0px,
          rgba(0,0,0,0.15) 1px,
          rgba(255,200,140,0.1) 2px,
          rgba(0,0,0,0.0) 5px
        ),
        linear-gradient(to bottom,
          #d49060 0%,
          #b66f3a 25%,
          #8a4f22 60%,
          #4a2810 100%
        )
      `,
      boxShadow: `
        0 12px 32px rgba(0,0,0,0.85),
        0 4px 8px rgba(255,200,140,0.25) inset,
        0 -3px 3px rgba(0,0,0,0.6) inset,
        0 0 0 1px rgba(40,20,5,0.8)
      `,
      height: "22px",
      borderRadius: "0 0 4px 4px",
    },
    shadow: {
      background: "linear-gradient(to bottom, rgba(40,20,5,0.85) 0%, rgba(40,20,5,0.2) 50%, transparent 100%)",
      height: "36px",
    },
    innerPadding: "16px 16px 0 16px",
  },

  // Marble (ornate) — polished black marble with subtle veining,
  // museum-gallery aesthetic. The label says "Marble" in Settings;
  // the storage value is "ornate" for historical reasons.
  ornate: {
    frame: {
      backgroundImage: `
        radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.04) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.03) 0%, transparent 50%),
        linear-gradient(135deg, #1a1a1c 0%, #0f0f11 50%, #1a1a1c 100%)
      `,
      borderLeft: "1px solid rgba(255,255,255,0.08)",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      borderTop: "1px solid rgba(255,255,255,0.12)",
      boxShadow: `
        inset 0 4px 24px rgba(0,0,0,0.8),
        inset 0 -2px 8px rgba(0,0,0,0.5),
        inset 8px 0 24px rgba(0,0,0,0.5),
        inset -8px 0 24px rgba(0,0,0,0.5),
        0 0 0 1px rgba(0,0,0,0.6),
        0 0 48px rgba(0,0,0,0.4)
      `,
      borderRadius: "2px 2px 0 0",
      paddingTop: "20px",
    },
    ledge: {
      backgroundImage: `
        radial-gradient(ellipse at 25% 50%, rgba(255,255,255,0.06) 0%, transparent 40%),
        radial-gradient(ellipse at 75% 50%, rgba(255,255,255,0.04) 0%, transparent 40%),
        linear-gradient(to bottom, #2a2a2e 0%, #1a1a1c 30%, #0f0f11 100%)
      `,
      boxShadow: `
        0 16px 40px rgba(0,0,0,0.9),
        0 2px 0 rgba(255,255,255,0.1) inset,
        0 -3px 6px rgba(0,0,0,0.6) inset,
        0 0 0 1px rgba(255,255,255,0.06)
      `,
      height: "20px",
      borderRadius: "0 0 2px 2px",
      borderLeft: "1px solid rgba(255,255,255,0.06)",
      borderRight: "1px solid rgba(255,255,255,0.06)",
    },
    shadow: {
      background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
      height: "32px",
    },
    innerPadding: "16px 16px 0 16px",
  },

  // Glass — illuminated display case with frosted edges.
  glass: {
    frame: {
      background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
      borderLeft: "1px solid rgba(255,255,255,0.15)",
      borderRight: "1px solid rgba(255,255,255,0.15)",
      borderTop: "1px solid rgba(255,255,255,0.25)",
      boxShadow: `
        inset 0 2px 12px rgba(255,255,255,0.06),
        inset 0 -2px 8px rgba(0,0,0,0.3),
        0 0 32px rgba(255,255,255,0.04)
      `,
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      borderRadius: "4px 4px 0 0",
      paddingTop: "16px",
    },
    ledge: {
      background:
        "linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.18) 25%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.02) 100%)",
      boxShadow: `
        0 8px 28px rgba(0,0,0,0.5),
        0 3px 0 rgba(255,255,255,0.5) inset,
        0 -1px 0 rgba(255,255,255,0.1) inset,
        0 0 32px rgba(255,255,255,0.1)
      `,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      height: "18px",
      borderRadius: "0 0 4px 4px",
      borderLeft: "1px solid rgba(255,255,255,0.18)",
      borderRight: "1px solid rgba(255,255,255,0.18)",
      borderBottom: "1px solid rgba(255,255,255,0.18)",
    },
    shadow: {
      background: "linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 100%)",
      height: "24px",
    },
    innerPadding: "12px 12px 0 12px",
  },
};

/**
 * Resolve a possibly-null value from the database into a known
 * style config. Used by every renderer that takes a profile and
 * needs to draw a shelf.
 */
export function resolveShelfStyle(style: string | null | undefined): {
  key: ShelfStyle;
  config: ShelfStyleConfig;
} {
  const k = (style as ShelfStyle) || "minimal";
  if (SHELF_STYLES[k]) return { key: k, config: SHELF_STYLES[k] };
  return { key: "minimal", config: SHELF_STYLES.minimal };
}
