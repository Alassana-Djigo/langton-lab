"""Conversion of the JSON description of ants into engine objects."""

from engine.directions import Direction
from engine.simulation import Ant


def parse_ants(raw: object) -> list[Ant]:
    """Turn ``[{"x": 1, "y": 2, "heading": "SOUTH"}, ...]`` into engine ants.

    ``heading`` is optional and defaults to NORTH. Raises ValueError when the data is
    malformed, with a message that says which ant is wrong.
    """
    if not isinstance(raw, list):
        raise ValueError("ants must be a list of objects like {'x': 1, 'y': 2}.")
    ants = []
    for position, item in enumerate(raw, start=1):
        if not isinstance(item, dict) or "x" not in item or "y" not in item:
            raise ValueError(f"ant #{position} must be an object with 'x' and 'y'.")
        x, y = item["x"], item["y"]
        if not (isinstance(x, int) and isinstance(y, int)):
            raise ValueError(f"ant #{position}: 'x' and 'y' must be integers.")
        heading = item.get("heading", "NORTH")
        if not isinstance(heading, str) or heading not in Direction.__members__:
            raise ValueError(f"ant #{position} has an unknown heading {heading!r}.")
        ants.append(Ant(x, y, Direction[heading]))
    return ants
