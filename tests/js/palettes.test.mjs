import assert from "node:assert/strict";
import test from "node:test";

import { PALETTES, buildPalette, hexToRgb } from "../../static/js/palettes.js";

test("colour 0 is the ground of the palette", () => {
  for (const [key, palette] of Object.entries(PALETTES)) {
    assert.equal(buildPalette(key, 2).colours[0], palette.ground, key);
  }
});

test("every palette can colour a rule with 16 colours, all different from the ground", () => {
  for (const key of Object.keys(PALETTES)) {
    const { colours } = buildPalette(key, 16);
    assert.equal(colours.length, 16);
    assert.ok(colours.every((hex) => /^#[0-9A-Fa-f]{6}$/.test(hex)), key);
    assert.ok(colours.slice(1).every((hex) => hex.toLowerCase() !== colours[0].toLowerCase()), key);
  }
});

test("the classic two-colour rule paints black on white and white on black", () => {
  assert.deepEqual(buildPalette("ink", 2).colours, ["#FFFFFF", "#000000"]);
  assert.deepEqual(buildPalette("inverse", 2).colours, ["#000000", "#ffffff"]);
});

test("an unknown palette falls back to the default one", () => {
  assert.deepEqual(buildPalette("does-not-exist", 3), buildPalette("ink", 3));
});

test("hexToRgb", () => {
  assert.deepEqual(hexToRgb("#FFD60A"), [255, 214, 10]);
  assert.deepEqual(hexToRgb("#000000"), [0, 0, 0]);
});
