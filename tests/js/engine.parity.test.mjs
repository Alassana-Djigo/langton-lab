// Checks that static/js/engine.js (the port that runs in the browser) produces exactly what the
// Python reference engine produced, according to tests/fixtures/engine_parity.json.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { Simulation, parseRule } from "../../static/js/engine.js";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/engine_parity.json", import.meta.url), "utf8"),
);

// The same weighted sum as in tests/engine/test_parity_fixture.py.
function checksum(cells) {
  let sum = 0;
  for (let i = 0; i < cells.length; i++) {
    sum = (sum + (i + 1) * cells[i]) % 1_000_000_007;
  }
  return sum;
}

for (const spec of fixture.cases) {
  test(`engine.js matches the Python engine: ${spec.name}`, () => {
    const simulation = new Simulation({
      width: spec.width,
      height: spec.height,
      rule: spec.rule,
      ants: spec.ants,
    });
    simulation.run(spec.steps);
    const stats = simulation.stats();
    const box = stats.boundingBox;

    assert.deepEqual(
      {
        ants: simulation.ants.map((ant) => [ant.x, ant.y, ant.heading]),
        color_counts: stats.colorCounts,
        bounding_box: box && [box.minX, box.minY, box.maxX, box.maxY],
        checksum: checksum(simulation.cells),
      },
      fixture.results[spec.name],
    );
  });
}

test("rule parsing accepts and rejects the same strings as Python", () => {
  // The same lists as tests/engine/test_rules.py.
  assert.deepEqual(parseRule("RL"), [1, 3]);
  assert.deepEqual(parseRule(" rl "), parseRule("RL"));
  assert.deepEqual(parseRule("LRNU"), [3, 1, 0, 2]);
  for (const text of ["", "R", "RLX", "R L", "RL1", "R".repeat(17)]) {
    assert.throws(() => parseRule(text), RangeError, `"${text}" should be rejected`);
  }
});

test("invalid grids and ants are rejected like in Python", () => {
  assert.throws(() => new Simulation({ width: 0, height: 5, rule: "RL" }), RangeError);
  assert.throws(
    () => new Simulation({ width: 5, height: 5, rule: "RL", ants: [{ x: 5, y: 0 }] }),
    RangeError,
  );
  assert.throws(() => new Simulation({ width: 5, height: 5, rule: "RL" }).run(-1), RangeError);
});
