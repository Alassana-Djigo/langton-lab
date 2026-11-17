import pytest

from apps.experiments.parsing import parse_ants
from engine.directions import Direction
from engine.simulation import Ant


def test_an_empty_list_means_no_explicit_ants():
    assert parse_ants([]) == []


def test_ants_are_parsed_with_a_default_heading():
    ants = parse_ants([{"x": 1, "y": 2}, {"x": 3, "y": 4, "heading": "SOUTH"}])
    assert ants == [Ant(1, 2, Direction.NORTH), Ant(3, 4, Direction.SOUTH)]


@pytest.mark.parametrize(
    "raw",
    [
        "not a list",
        [1],
        [{"x": 1}],
        [{"x": "1", "y": 2}],
        [{"x": 1, "y": 2, "heading": "UP"}],
        [{"x": 1, "y": 2, "heading": ["NORTH"]}],
    ],
)
def test_invalid_ants_are_rejected(raw):
    with pytest.raises(ValueError, match="ant"):
        parse_ants(raw)
