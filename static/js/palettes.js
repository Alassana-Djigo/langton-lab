// Colour palettes for the grid. Colour 0 is the ground the ant starts on; every other colour
// is a flat, solid fill. Each palette also says how the ant is drawn so that it stays visible
// on cells of its own colour.

const lerp = (from, to, t) => from + (to - from) * t;

/** A grey for colour `i` of `n`, going from `from` (0-255) to `to`. Colour 1 is always `from`. */
function grey(from, to, i, n) {
  const t = n > 2 ? (i - 1) / (n - 2) : 0;
  const level = Math.round(lerp(from, to, t));
  return `#${level.toString(16).padStart(2, "0").repeat(3)}`;
}

const FLAT_COLOURS = [
  "#000000",
  "#FFD60A",
  "#E5352B",
  "#1F5FBF",
  "#2E9E4F",
  "#FF8A00",
  "#F28CB1",
  "#7A4B2A",
  "#19B5C9",
  "#8DC63F",
  "#1B2A5C",
  "#8E8E88",
  "#8F1D2C",
  "#2B8C7E",
  "#B07CD8",
];

export const PALETTES = {
  ink: {
    label: "Black on white",
    ground: "#FFFFFF",
    ant: { fill: "#000000", halo: "#FFFFFF" },
    grid: "rgba(0, 0, 0, 0.18)",
    colour: (i, n) => grey(0, 168, i, n),
  },
  flat: {
    label: "Flat colours",
    ground: "#FFFFFF",
    ant: { fill: "#000000", halo: "#FFFFFF" },
    grid: "rgba(0, 0, 0, 0.18)",
    colour: (i) => FLAT_COLOURS[(i - 1) % FLAT_COLOURS.length],
  },
  inverse: {
    label: "White on black",
    ground: "#000000",
    ant: { fill: "#FFFFFF", halo: "#000000" },
    grid: "rgba(255, 255, 255, 0.22)",
    colour: (i, n) => grey(255, 90, i, n),
  },
};

export const DEFAULT_PALETTE = "ink";

/** Returns `{ colours, ant, grid }`: one "#rrggbb" per colour (index 0 is the ground), the ant colours and the grid-line colour. */
export function buildPalette(key, nColours) {
  const palette = PALETTES[key] ?? PALETTES[DEFAULT_PALETTE];
  const colours = [palette.ground];
  for (let i = 1; i < nColours; i++) {
    colours.push(palette.colour(i, nColours));
  }
  return { colours, ant: palette.ant, grid: palette.grid };
}

/** "#rrggbb" to [r, g, b]. */
export function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
