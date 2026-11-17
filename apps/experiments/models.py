"""Saved experiments: a simulation set-up plus the statistics of its latest run."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.experiments.limits import MAX_GRID_SIDE, MAX_STEPS
from apps.experiments.parsing import parse_ants
from apps.experiments.validators import validate_ants, validate_rule
from engine.rules import MAX_COLORS, Rule
from engine.simulation import Simulation


class Experiment(models.Model):
    """A saved simulation set-up plus a summary of its latest run.

    The engine is deterministic, so the set-up alone is enough to reproduce the whole
    grid. Only a compact summary of the result is stored, never the grid itself.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="experiments",
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    width = models.PositiveSmallIntegerField(
        default=100,
        validators=[MinValueValidator(1), MaxValueValidator(MAX_GRID_SIDE)],
    )
    height = models.PositiveSmallIntegerField(
        default=100,
        validators=[MinValueValidator(1), MaxValueValidator(MAX_GRID_SIDE)],
    )
    rule = models.CharField(max_length=MAX_COLORS, default="RL", validators=[validate_rule])
    ants = models.JSONField(
        default=list,
        blank=True,
        validators=[validate_ants],
        help_text="Empty means one ant in the centre.",
    )
    steps = models.PositiveIntegerField(
        default=1_000,
        validators=[MaxValueValidator(MAX_STEPS)],
        help_text="How many steps to simulate.",
    )
    result = models.JSONField(null=True, blank=True, editable=False)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = (
            models.Index(fields=["owner", "-created_at"], name="experiment_owner_recent_idx"),
        )
        constraints = (
            models.CheckConstraint(
                condition=models.Q(
                    width__range=(1, MAX_GRID_SIDE),
                    height__range=(1, MAX_GRID_SIDE),
                ),
                name="experiment_grid_size_in_range",
            ),
            models.CheckConstraint(
                condition=models.Q(steps__lte=MAX_STEPS),
                name="experiment_steps_in_range",
            ),
        )

    def __str__(self) -> str:
        return self.name

    def clean(self) -> None:
        """Cross-field validation: every ant must start inside the grid."""
        try:
            ants = parse_ants(self.ants)
        except ValueError:
            return  # the field validator already reported the malformed ants
        for ant in ants:
            if not (0 <= ant.x < self.width and 0 <= ant.y < self.height):
                raise ValidationError(f"Ant at ({ant.x}, {ant.y}) is outside the grid.")

    def build_simulation(self) -> Simulation:
        """Create the engine simulation described by this experiment (not yet run)."""
        return Simulation(
            self.width,
            self.height,
            Rule.parse(self.rule),
            parse_ants(self.ants) or None,
        )
