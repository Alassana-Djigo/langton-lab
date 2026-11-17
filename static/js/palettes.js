// Colour palettes. Colour 0 is always the "empty" background; the others are spaced
// along a gradient so that rules with up to 16 colours stay readable.

export const PALETTES = {
  aurora: {
    label: "Aurora",
    background: [10, 14, 26],
    hue: [190, 290],
    saturation: 0.85,
    lightness: [0.62, 0.6],
    ant: [255, 255, 255],
  },
  ember: {
    label: "Ember",
    background: [18, 11, 13],
    hue: [-5, 55],
    saturation: 0.9,
    lightness: [0.55, 0.62],
    ant: [255, 255, 255],
  },
  forest: {
    label: "Forest",
    background: [8, 17, 14],
    hue: [95, 175],
    saturation: 0.7,
    lightness: [0.52, 0.6],
    ant: [255, 255, 255],
  },
  mono: {
    label: "Mono",
    background: [10, 12, 18],
    hue: [0, 0],
    saturation: 0,
    lightness: [0.92, 0.4],
    ant: [255, 77, 109],
  },
};

const lerp = (from, to, t) => from + (to - from) * t;

// Standard HSL to RGB conversion (h in degrees, s and l between 0 and 1).
function hslToRgb(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360;
  const k = (n) => (n + h / 30) % 12;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const f = (n) => lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

/** Returns `{ colors, ant }`: one [r, g, b] per colour, plus the colour of the ants. */
export function buildPalette(key, nColors) {
  const palette = PALETTES[key] ?? PALETTES.aurora;
  const colors = [palette.background];
  const gradientSteps = Math.max(nColors - 2, 1);
  for (let i = 1; i < nColors; i++) {
    const t = (i - 1) / gradientSteps;
    colors.push(
      hslToRgb(
        lerp(palette.hue[0], palette.hue[1], t),
        palette.saturation,
        lerp(palette.lightness[0], palette.lightness[1], t),
      ),
    );
  }
  return { colors, ant: palette.ant };
}
