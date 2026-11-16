"""Headings and turns on a square grid.

Coordinates follow screen conventions (the same as the HTML canvas): x grows to
the right and y grows downwards, so moving NORTH decreases y.
"""

from enum import Enum
from typing import Self


class Turn(Enum):
    """A rotation of the heading, measured in quarter turns clockwise."""

    STRAIGHT = 0
    RIGHT = 1
    UTURN = 2
    LEFT = 3


class Direction(Enum):
    """The four compass headings, ordered clockwise starting at north."""

    NORTH = 0
    EAST = 1
    SOUTH = 2
    WEST = 3

    def turned(self, turn: Turn) -> Self:
        """Return the heading obtained by applying ``turn`` to this one."""
        return type(self)((self.value + turn.value) % 4)

    @property
    def delta(self) -> tuple[int, int]:
        """The (dx, dy) step that moves one cell in this direction."""
        return _DELTAS[self]


_DELTAS: dict[Direction, tuple[int, int]] = {
    Direction.NORTH: (0, -1),
    Direction.EAST: (1, 0),
    Direction.SOUTH: (0, 1),
    Direction.WEST: (-1, 0),
}
