import pytest

from engine.directions import Direction
from engine.rules import LANGTON, Rule
from engine.simulation import Ant, Simulation


def black_cells(sim: Simulation) -> set[tuple[int, int]]:
    return {(x, y) for x in range(sim.width) for y in range(sim.height) if sim.cell(x, y) == 1}


def test_default_ant_starts_in_the_center_facing_north():
    sim = Simulation(11, 11, LANGTON)
    assert sim.ants == [Ant(5, 5, Direction.NORTH)]
    assert sim.steps == 0


def test_first_step_of_the_classic_ant():
    sim = Simulation(11, 11, LANGTON)
    sim.step()
    assert sim.cell(5, 5) == 1
    assert sim.ants[0] == Ant(6, 5, Direction.EAST)
    assert sim.steps == 1


def test_ant_draws_a_square_and_then_turns_left_on_black():
    sim = Simulation(11, 11, LANGTON)
    sim.run(4)
    assert black_cells(sim) == {(5, 5), (6, 5), (6, 6), (5, 6)}
    assert sim.ants[0] == Ant(5, 5, Direction.NORTH)

    sim.step()
    assert sim.cell(5, 5) == 0
    assert sim.ants[0] == Ant(4, 5, Direction.WEST)


def test_the_grid_wraps_around_the_edges():
    sim = Simulation(5, 5, LANGTON, ants=[Ant(0, 2, Direction.SOUTH)])
    sim.step()
    assert sim.ants[0] == Ant(4, 2, Direction.WEST)


def test_colors_cycle_through_every_state_of_the_rule():
    sim = Simulation(1, 1, Rule.parse("RLR"))
    seen = []
    for _ in range(4):
        sim.step()
        seen.append(sim.cell(0, 0))
    assert seen == [1, 2, 0, 1]


def test_ants_act_in_order_within_a_step():
    sim = Simulation(5, 5, LANGTON, ants=[Ant(2, 2), Ant(2, 2)])
    sim.step()
    assert sim.ants == [Ant(3, 2, Direction.EAST), Ant(1, 2, Direction.WEST)]
    assert sim.cell(2, 2) == 0


def test_classic_ant_builds_the_104_step_highway():
    sim = Simulation(200, 200, LANGTON)
    sim.run(11_000)  # the chaotic phase lasts roughly 10,000 steps

    positions = []
    for _ in range(3):
        positions.append((sim.ants[0].x, sim.ants[0].y))
        sim.run(104)

    (x0, y0), (x1, y1), (x2, y2) = positions
    assert (x1 - x0, y1 - y0) == (x2 - x1, y2 - y1)
    assert (abs(x1 - x0), abs(y1 - y0)) == (2, 2)


def test_rejects_an_empty_grid():
    with pytest.raises(ValueError, match="grid size"):
        Simulation(0, 5, LANGTON)


def test_rejects_an_ant_outside_the_grid():
    with pytest.raises(ValueError, match="outside the grid"):
        Simulation(5, 5, LANGTON, ants=[Ant(5, 0, Direction.NORTH)])


def test_run_rejects_a_negative_number_of_steps():
    sim = Simulation(5, 5, LANGTON)
    with pytest.raises(ValueError, match="steps"):
        sim.run(-1)
