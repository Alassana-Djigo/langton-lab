"""Statistics computed from a simulation snapshot."""

from dataclasses import dataclass

from engine.simulation import Simulation


@dataclass(frozen=True)
class BoundingBox:
    """The smallest rectangle (inclusive coordinates) that contains every painted cell.

    The box ignores wrap-around: a pattern that crosses an edge of the torus
    produces a box that spans the whole grid.
    """

    min_x: int
    min_y: int
    max_x: int
    max_y: int

    @property
    def width(self) -> int:
        return self.max_x - self.min_x + 1

    @property
    def height(self) -> int:
        return self.max_y - self.min_y + 1


@dataclass(frozen=True)
class Stats:
    """A summary of the simulation at one moment."""

    steps: int
    n_ants: int
    color_counts: tuple[int, ...]  # color_counts[c] is how many cells have colour c
    bounding_box: BoundingBox | None  # None while every cell still has colour 0

    @property
    def painted_cells(self) -> int:
        """How many cells are not in the starting colour (colour 0)."""
        return sum(self.color_counts[1:])


def compute_stats(sim: Simulation) -> Stats:
    """Summarise ``sim`` without modifying it."""
    cells = sim.snapshot()
    return Stats(
        steps=sim.steps,
        n_ants=len(sim.ants),
        color_counts=tuple(cells.count(color) for color in range(sim.rule.n_colors)),
        bounding_box=_bounding_box(cells, sim.width, sim.height),
    )


def _bounding_box(cells: bytes, width: int, height: int) -> BoundingBox | None:
    min_x, min_y, max_x, max_y = width, height, -1, -1
    for y in range(height):
        row = cells[y * width : (y + 1) * width]
        trimmed = row.rstrip(b"\x00")
        if not trimmed:
            continue
        min_y = min(min_y, y)
        max_y = y
        max_x = max(max_x, len(trimmed) - 1)
        min_x = min(min_x, len(row) - len(row.lstrip(b"\x00")))
    if max_y == -1:
        return None
    return BoundingBox(min_x, min_y, max_x, max_y)
