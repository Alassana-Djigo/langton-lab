"""Field validators that reuse the engine's own parsing, so the rules live in one place."""

from django.core.exceptions import ValidationError

from apps.experiments.limits import MAX_ANTS
from apps.experiments.parsing import parse_ants
from engine.rules import Rule


def validate_rule(value: str) -> None:
    try:
        Rule.parse(value)
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc


def validate_ants(value: object) -> None:
    try:
        ants = parse_ants(value)
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc
    if len(ants) > MAX_ANTS:
        raise ValidationError(f"Use at most {MAX_ANTS} ants.")
