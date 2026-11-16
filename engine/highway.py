"""Detection of Langton's "highway": a periodic drift of an ant across the grid."""

from dataclasses import dataclass

from engine.simulation import Simulation


@dataclass(frozen=True)
class Highway:
    """A repeating stretch of movement that carries the ant away from where it started.

    Every ``period`` steps the ant repeats the same moves and ends up shifted by
    ``displacement`` cells. The displacement is unwrapped, so it keeps growing even
    when the grid wraps around. ``detected_at`` is the simulation step at which the
    detector confirmed the pattern.
    """

    period: int
    displacement: tuple[int, int]
    detected_at: int


class HighwayDetector:
    """Watches one ant and reports when its moves become periodic with a net drift.

    Call :meth:`observe` after every simulation step. A period ``p`` is accepted when
    the most recent moves repeat every ``p`` steps, the repetition covers at least
    ``repeats`` periods and at least ``min_steps`` steps, and the ant does not end up
    where it started. The long minimum avoids false alarms: short patterns repeat by
    pure chance all the time during the chaotic phase.
    """

    def __init__(
        self,
        ant_index: int = 0,
        max_period: int = 200,
        repeats: int = 3,
        min_steps: int = 300,
    ) -> None:
        if ant_index < 0 or max_period < 1 or repeats < 2 or min_steps < 1:
            raise ValueError(
                "Invalid highway detector settings: ant_index >= 0, max_period >= 1, "
                "repeats >= 2 and min_steps >= 1 are required."
            )
        self._ant_index = ant_index
        self._max_period = max_period
        self._size = max_period + 1
        # needed[p] = how long the periodic stretch must be to accept period p (index 0 unused)
        self._needed = [max(repeats * p, min_steps) for p in range(self._size)]
        # Ring buffers holding the last max_period + 1 moves and unwrapped positions.
        self._moves = [0] * self._size
        self._xs = [0] * self._size
        self._ys = [0] * self._size
        # run[p] = for how many consecutive steps the move equalled the move p steps earlier
        self._run = [0] * self._size
        self._observed = 0
        self._x = 0
        self._y = 0
        self.highway: Highway | None = None

    def observe(self, sim: Simulation) -> Highway | None:
        """Record the move the tracked ant just made. Returns the highway once found."""
        if self.highway is not None:
            return self.highway

        ant = sim.ants[self._ant_index]
        dx, dy = ant.heading.delta
        direction = ant.heading.value
        t = self._observed
        size = self._size
        moves, xs, ys, run, needed = self._moves, self._xs, self._ys, self._run, self._needed

        self._x += dx
        self._y += dy
        moves[t % size] = direction
        xs[t % size] = self._x
        ys[t % size] = self._y
        self._observed = t + 1

        found: tuple[int, tuple[int, int]] | None = None
        for p in range(1, self._max_period + 1):
            if t >= p and moves[(t - p) % size] == direction:
                run[p] += 1
                if found is None and run[p] + p >= needed[p]:
                    shift = (self._x - xs[(t - p) % size], self._y - ys[(t - p) % size])
                    if shift != (0, 0):
                        found = (p, shift)
            else:
                run[p] = 0

        if found is None:
            return None
        self.highway = Highway(period=found[0], displacement=found[1], detected_at=sim.steps)
        return self.highway


def find_highway(
    sim: Simulation,
    max_steps: int,
    detector: HighwayDetector | None = None,
) -> Highway | None:
    """Advance ``sim`` until a highway is detected or ``max_steps`` steps have run.

    The simulation is modified: when a highway is found it stops at the very step
    where the detector confirmed it.
    """
    detector = detector or HighwayDetector()
    for _ in range(max_steps):
        sim.step()
        highway = detector.observe(sim)
        if highway is not None:
            return highway
    return None
