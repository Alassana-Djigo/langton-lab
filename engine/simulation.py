"""Langton's ant on a toroidal grid: the edges wrap around."""

from dataclasses import dataclass

from engine.directions import Direction
from engine.rules import Rule


@dataclass
class Ant:
    """An ant with a position and a heading. The simulation mutates it in place."""

    x: int
    y: int
    heading: Direction = Direction.NORTH


class Simulation:
    """A rectangular grid of coloured cells and the ants that walk on it.

    Each step, every ant (in list order) does three things on its current cell:
    turn according to the cell colour, advance the colour to the next one
    (wrapping around), and move one cell forward.
    """

    def __init__(
        self,
        width: int,
        height: int,
        rule: Rule,
        ants: list[Ant] | None = None,
    ) -> None:
        if width < 1 or height < 1:
            raise ValueError(f"Invalid grid size {width}x{height}: both sides must be at least 1.")
        self.width = width
        self.height = height
        self.rule = rule
        self.ants = list(ants) if ants is not None else [Ant(width // 2, height // 2)]
        for ant in self.ants:
            if not (0 <= ant.x < width and 0 <= ant.y < height):
                raise ValueError(f"Ant at ({ant.x}, {ant.y}) is outside the grid.")
        self.steps = 0
        self._cells = bytearray(width * height)

    def cell(self, x: int, y: int) -> int:
        """The colour (0, 1, 2...) of the cell at column ``x`` and row ``y``."""
        return self._cells[y * self.width + x]

    def step(self) -> None:
        """Advance the simulation by one step."""
        width, height = self.width, self.height
        turns = self.rule.turns
        n_colors = self.rule.n_colors
        cells = self._cells
        for ant in self.ants:
            index = ant.y * width + ant.x
            color = cells[index]
            ant.heading = ant.heading.turned(turns[color])
            cells[index] = (color + 1) % n_colors
            dx, dy = ant.heading.delta
            ant.x = (ant.x + dx) % width
            ant.y = (ant.y + dy) % height
        self.steps += 1

    def run(self, steps: int) -> None:
        """Advance the simulation by ``steps`` steps."""
        if steps < 0:
            raise ValueError(f"Cannot run a negative number of steps: {steps}.")
        for _ in range(steps):
            self.step()

    def snapshot(self) -> bytes:
        """An immutable copy of every cell colour, row by row (index = y * width + x)."""
        return bytes(self._cells)
