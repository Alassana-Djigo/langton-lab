// Tests the zoom and pan maths of the renderer without a browser, using a fake canvas.

import assert from "node:assert/strict";
import test from "node:test";

const noop = () => {};
const context = new Proxy(
  {},
  {
    get: (_target, name) =>
      name === "createImageData" ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : noop,
    set: () => true,
  },
);
const fakeCanvas = () => ({
  width: 0,
  height: 0,
  getContext: () => context,
  getBoundingClientRect: () => ({ width: 800, height: 800 }),
});
globalThis.window = { devicePixelRatio: 2 };
globalThis.document = { createElement: fakeCanvas };

const { MAX_CELL_PX, Renderer, antSize } = await import("../../static/js/renderer.js");

function newRenderer() {
  const renderer = new Renderer(fakeCanvas());
  renderer.resize(200, 200);
  return renderer;
}

test("the canvas resolution follows the device pixel ratio", () => {
  const renderer = newRenderer();
  assert.equal(renderer.canvas.width, 1600);
  assert.equal(renderer.zoom, 4);
  assert.equal(renderer.factor, 1);
});

test("zooming keeps the point under the cursor where it is", () => {
  const renderer = newRenderer();
  const under = (px, py) => [
    renderer.centerX + (px - 400) / renderer.zoom,
    renderer.centerY + (py - 400) / renderer.zoom,
  ];
  renderer.zoomBy(3, 600, 200);
  const before = under(600, 200);
  renderer.zoomBy(2, 600, 200);
  const after = under(600, 200);
  assert.ok(Math.abs(before[0] - after[0]) < 1e-9);
  assert.ok(Math.abs(before[1] - after[1]) < 1e-9);
});

test("zoom has limits, and the whole grid is always centred", () => {
  const renderer = newRenderer();
  renderer.zoomBy(1000);
  assert.equal(renderer.zoom, MAX_CELL_PX);
  renderer.zoomBy(1 / 1000);
  assert.equal(renderer.factor, 1);
  assert.equal(renderer.centerX, 100);
  assert.equal(renderer.centerY, 100);
});

test("the camera never leaves the grid", () => {
  const renderer = newRenderer();
  renderer.zoomBy(4);
  const half = 400 / renderer.zoom;
  renderer.centerOn(-50, 999);
  assert.ok(Math.abs(renderer.centerX - half) < 1e-9);
  assert.ok(Math.abs(renderer.centerY - (200 - half)) < 1e-9);
  renderer.panBy(-100000, 100000);
  assert.ok(renderer.centerX >= half && renderer.centerY <= 200 - half);
});

test("fitBox frames a pattern, and without one shows the whole grid", () => {
  const renderer = newRenderer();
  renderer.fitBox({ minX: 80, minY: 90, maxX: 119, maxY: 129, width: 40, height: 40 });
  assert.ok(Math.abs(renderer.centerX - 100) < 1e-9);
  assert.ok(Math.abs(renderer.centerY - 110) < 1e-9);
  const shown = renderer.zoom * 40; // CSS pixels the pattern occupies
  assert.ok(shown > 480 && shown < 800, `pattern is ${shown}px`);
  renderer.fitBox(null);
  assert.equal(renderer.factor, 1);
});

test("the ant is a marker when cells are tiny and about two cells when zoomed in", () => {
  assert.equal(antSize(3.9), 24);
  assert.ok(Math.abs(antSize(80) - 160) < 1e-9);
  let previous = antSize(1);
  for (let cell = 1; cell <= 80; cell += 0.25) {
    const size = antSize(cell);
    assert.ok(Math.abs(size - previous) < 6, `no jump near ${cell}px`);
    previous = size;
  }
});
