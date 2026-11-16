import pytest

from engine.directions import Direction, Turn


@pytest.mark.parametrize(
    ("turn", "expected"),
    [
        (Turn.RIGHT, Direction.EAST),
        (Turn.LEFT, Direction.WEST),
        (Turn.STRAIGHT, Direction.NORTH),
        (Turn.UTURN, Direction.SOUTH),
    ],
)
def test_turning_from_north(turn, expected):
    assert Direction.NORTH.turned(turn) is expected


def test_four_right_turns_return_to_the_start():
    heading = Direction.WEST
    for _ in range(4):
        heading = heading.turned(Turn.RIGHT)
    assert heading is Direction.WEST


def test_left_is_the_inverse_of_right():
    for direction in Direction:
        assert direction.turned(Turn.RIGHT).turned(Turn.LEFT) is direction


@pytest.mark.parametrize(
    ("direction", "delta"),
    [
        (Direction.NORTH, (0, -1)),
        (Direction.EAST, (1, 0)),
        (Direction.SOUTH, (0, 1)),
        (Direction.WEST, (-1, 0)),
    ],
)
def test_movement_delta(direction, delta):
    assert direction.delta == delta
