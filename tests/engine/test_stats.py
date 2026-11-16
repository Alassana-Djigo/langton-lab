from engine.rules import LANGTON, Rule
from engine.simulation import Ant, Simulation
from engine.stats import BoundingBox, compute_stats


def test_snapshot_is_an_independent_copy():
    sim = Simulation(3, 2, LANGTON)
    before = sim.snapshot()
    sim.step()
    assert before == bytes(6)
    assert len(sim.snapshot()) == 6
    assert sim.snapshot() != before


def test_stats_of_a_fresh_simulation():
    stats = compute_stats(Simulation(11, 11, LANGTON))
    assert stats.steps == 0
    assert stats.n_ants == 1
    assert stats.color_counts == (121, 0)
    assert stats.painted_cells == 0
    assert stats.bounding_box is None


def test_stats_after_the_first_square():
    sim = Simulation(11, 11, LANGTON)
    sim.run(4)
    stats = compute_stats(sim)
    assert stats.steps == 4
    assert stats.color_counts == (117, 4)
    assert stats.painted_cells == 4
    assert stats.bounding_box == BoundingBox(5, 5, 6, 6)
    assert (stats.bounding_box.width, stats.bounding_box.height) == (2, 2)


def test_color_counts_follow_the_number_of_colors_in_the_rule():
    sim = Simulation(1, 1, Rule.parse("RLR"))
    sim.run(2)
    assert compute_stats(sim).color_counts == (0, 0, 1)


def test_bounding_box_spans_all_painted_cells():
    sim = Simulation(5, 5, LANGTON, ants=[Ant(0, 1), Ant(4, 3)])
    sim.step()
    assert compute_stats(sim).bounding_box == BoundingBox(0, 1, 4, 3)
