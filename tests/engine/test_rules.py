import pytest

from engine.directions import Turn
from engine.rules import Rule


def test_parse_the_classic_langton_rule():
    rule = Rule.parse("RL")
    assert rule.turns == (Turn.RIGHT, Turn.LEFT)
    assert rule.n_colors == 2


def test_parse_ignores_case_and_surrounding_spaces():
    assert Rule.parse(" rl ") == Rule.parse("RL")


def test_every_turn_letter_is_supported():
    assert Rule.parse("LRNU").turns == (Turn.LEFT, Turn.RIGHT, Turn.STRAIGHT, Turn.UTURN)


def test_string_round_trip():
    assert str(Rule.parse("RLLR")) == "RLLR"


@pytest.mark.parametrize("text", ["", "R", "RLX", "R L", "RL1", "R" * 17])
def test_invalid_rules_are_rejected(text):
    with pytest.raises(ValueError, match="rule"):
        Rule.parse(text)
