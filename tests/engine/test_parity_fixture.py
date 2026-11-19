"""Golden-file test that keeps the Python engine and its JavaScript port in agreement.

tests/fixtures/engine_parity.json lists some simulations (the cases) and what the Python engine
produced for each one. This test checks that the Python engine still produces exactly that, and
tests/js/engine.parity.test.mjs checks that static/js/engine.js produces it too. If both pass, the
two engines agree, cell by cell.

After an intentional change to the rules, regenerate the file with:

    UPDATE_PARITY_FIXTURE=1 uv run pytest tests/engine/test_parity_fixture.py
"""

import json
import os
from pathlib import Path

from engine.directions import Direction
from engine.rules import Rule
from engine.simulation import Ant, Simulation
from engine.stats import compute_stats

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "engine_parity.json"


def case(name, rule, width, height, steps, ants):
    """One simulation. Ants are (x, y, heading) with heading 0 north, 1 east, 2 south, 3 west."""
    return {
        "name": name,
        "rule": rule,
        "width": width,
        "height": height,
        "steps": steps,
        "ants": [{"x": x, "y": y, "heading": heading} for x, y, heading in ants],
    }


CASES = [
    case("classic ant, 11,000 steps", "RL", 200, 200, 11_000, [(100, 100, 0)]),
    case("RLR, three colours", "RLR", 100, 100, 5_000, [(50, 50, 0)]),
    case("LLRR with three ants", "LLRR", 100, 100, 4_000, [(50, 50, 0), (30, 60, 1), (70, 20, 2)]),
    case(
        "LRRRRRLLR with four ants",
        "LRRRRRLLR",
        150,
        150,
        20_000,
        [(75, 75, 0), (40, 75, 1), (75, 110, 2), (110, 75, 3)],
    ),
    case("RRLLLRLLLRRR with two ants", "RRLLLRLLLRRR", 100, 100, 8_000, [(50, 50, 0), (50, 30, 2)]),
    case("straight and U-turn letters", "RNUL", 60, 60, 3_000, [(30, 30, 0), (10, 10, 1)]),
    case("grid wider than it is tall", "RL", 120, 80, 6_000, [(60, 40, 0)]),
    case("a grid of one cell", "RLR", 1, 1, 7, [(0, 0, 0)]),
    case("two ants on the same cell", "RL", 30, 30, 500, [(15, 15, 0), (15, 15, 2)]),
    case("sixteen colours", "RLRLLRRLRLLRRLRL", 120, 120, 20_000, [(60, 60, 0)]),
]


def checksum(cells: bytes) -> int:
    """A weighted sum of every cell, so that one wrong cell anywhere changes the number."""
    return sum((index + 1) * color for index, color in enumerate(cells)) % 1_000_000_007


def run_case(spec: dict) -> dict:
    ants = [Ant(a["x"], a["y"], Direction(a["heading"])) for a in spec["ants"]]
    simulation = Simulation(spec["width"], spec["height"], Rule.parse(spec["rule"]), ants)
    simulation.run(spec["steps"])
    stats = compute_stats(simulation)
    box = stats.bounding_box
    return {
        "ants": [[ant.x, ant.y, ant.heading.value] for ant in simulation.ants],
        "color_counts": list(stats.color_counts),
        "bounding_box": None if box is None else [box.min_x, box.min_y, box.max_x, box.max_y],
        "checksum": checksum(simulation.snapshot()),
    }


def test_python_engine_matches_the_parity_fixture():
    actual = {"cases": CASES, "results": {spec["name"]: run_case(spec) for spec in CASES}}
    if os.environ.get("UPDATE_PARITY_FIXTURE"):
        FIXTURE.write_text(json.dumps(actual, indent=2) + "\n")

    expected = json.loads(FIXTURE.read_text())
    assert actual == expected, (
        "The Python engine no longer matches tests/fixtures/engine_parity.json. If the change is "
        "intentional, regenerate the file with UPDATE_PARITY_FIXTURE=1 and port the change to "
        "static/js/engine.js."
    )
