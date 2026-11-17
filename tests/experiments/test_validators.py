import pytest
from django.core.exceptions import ValidationError

from apps.experiments.limits import MAX_ANTS
from apps.experiments.validators import validate_ants, validate_rule


def test_valid_rules_pass():
    validate_rule("RL")
    validate_rule("llrr")


def test_invalid_rules_raise_validation_errors():
    with pytest.raises(ValidationError, match="rule"):
        validate_rule("XYZ")


def test_valid_ants_pass():
    validate_ants([{"x": 1, "y": 1}])


def test_malformed_ants_raise_validation_errors():
    with pytest.raises(ValidationError, match="ant"):
        validate_ants([{"x": 1}])


def test_too_many_ants_are_rejected():
    ants = [{"x": 0, "y": 0}] * (MAX_ANTS + 1)
    with pytest.raises(ValidationError, match="at most"):
        validate_ants(ants)
