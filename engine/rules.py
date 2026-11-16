"""Rule strings such as "RL" that say how an ant turns on each cell colour."""

from dataclasses import dataclass
from typing import Self

from engine.directions import Turn

MIN_COLORS = 2
MAX_COLORS = 16

_LETTER_TO_TURN = {
    "L": Turn.LEFT,
    "R": Turn.RIGHT,
    "N": Turn.STRAIGHT,
    "U": Turn.UTURN,
}
_TURN_TO_LETTER = {turn: letter for letter, turn in _LETTER_TO_TURN.items()}


@dataclass(frozen=True)
class Rule:
    """One turn per colour: ``turns[c]`` is applied when the ant stands on colour ``c``."""

    turns: tuple[Turn, ...]

    @classmethod
    def parse(cls, text: str) -> Self:
        """Build a rule from a string like "RL". Raises ValueError if it is invalid."""
        cleaned = text.strip().upper()
        if not MIN_COLORS <= len(cleaned) <= MAX_COLORS:
            raise ValueError(f"Invalid rule {text!r}: use {MIN_COLORS} to {MAX_COLORS} letters.")
        unknown = sorted(set(cleaned) - set(_LETTER_TO_TURN))
        if unknown:
            raise ValueError(
                f"Invalid rule {text!r}: unknown letters {unknown}. Use only L, R, N and U."
            )
        return cls(tuple(_LETTER_TO_TURN[letter] for letter in cleaned))

    @property
    def n_colors(self) -> int:
        return len(self.turns)

    def __str__(self) -> str:
        return "".join(_TURN_TO_LETTER[turn] for turn in self.turns)


LANGTON = Rule.parse("RL")
