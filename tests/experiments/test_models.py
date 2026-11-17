import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.experiments.limits import MAX_GRID_SIDE, MAX_STEPS
from apps.experiments.models import Experiment
from engine.directions import Direction
from engine.rules import LANGTON
from engine.simulation import Ant


def make_experiment(owner, **overrides):
    return Experiment(owner=owner, name="Classic ant", **overrides)


def test_defaults_describe_the_classic_ant(user):
    experiment = Experiment.objects.create(owner=user, name="Classic ant")

    assert str(experiment) == "Classic ant"
    assert (experiment.width, experiment.height) == (100, 100)
    assert experiment.rule == "RL"
    assert experiment.ants == []
    assert experiment.is_public is False
    assert experiment.result is None
    experiment.full_clean()


def test_default_simulation_has_one_ant_in_the_center(user):
    simulation = make_experiment(user).build_simulation()

    assert simulation.rule == LANGTON
    assert simulation.ants == [Ant(50, 50, Direction.NORTH)]


def test_custom_ants_are_used_by_the_simulation(user):
    experiment = make_experiment(
        user, width=10, height=10, ants=[{"x": 1, "y": 2, "heading": "SOUTH"}]
    )
    assert experiment.build_simulation().ants == [Ant(1, 2, Direction.SOUTH)]


def test_an_ant_outside_the_grid_is_rejected(user):
    experiment = make_experiment(user, width=10, height=10, ants=[{"x": 10, "y": 0}])
    with pytest.raises(ValidationError, match="outside the grid"):
        experiment.full_clean()


def test_malformed_ants_are_reported_once_by_the_field_validator(user):
    experiment = make_experiment(user, ants=[{"x": 1}])
    with pytest.raises(ValidationError) as excinfo:
        experiment.full_clean()
    assert list(excinfo.value.message_dict) == ["ants"]


def test_an_invalid_rule_is_rejected(user):
    experiment = make_experiment(user, rule="XYZ")
    with pytest.raises(ValidationError, match="rule"):
        experiment.full_clean()


def test_field_validators_reject_out_of_range_sizes(user):
    experiment = make_experiment(user, width=0)
    with pytest.raises(ValidationError, match="width"):
        experiment.full_clean()


def test_the_database_rejects_a_grid_that_is_too_large(user):
    with pytest.raises(IntegrityError), transaction.atomic():
        Experiment.objects.create(owner=user, name="Huge", width=MAX_GRID_SIDE + 1)


def test_the_database_rejects_too_many_steps(user):
    with pytest.raises(IntegrityError), transaction.atomic():
        Experiment.objects.create(owner=user, name="Endless", steps=MAX_STEPS + 1)


def test_deleting_the_owner_deletes_their_experiments(user):
    Experiment.objects.create(owner=user, name="Temporary")
    user.delete()
    assert Experiment.objects.count() == 0
